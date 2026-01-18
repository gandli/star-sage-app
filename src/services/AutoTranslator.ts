import { supabase } from '../lib/supabase';
import { translateText } from '../utils/translate';
import { db } from '../utils/db';

class AutoTranslator {
    private isProcessing = false;
    private idleCallbackId: number | null = null;
    private BATCH_SIZE = 10; // Translate 10 items at a time
    private enabled = true;
    private listeners: Set<(isTranslating: boolean) => void> = new Set();
    private githubUser: string | null = null;
    private userId: string | null = null;
    private processingRepoIds: Set<number> = new Set(); // Track repos being processed


    constructor() {
        console.log('[AutoTranslator] Instance created at', new Date().toISOString());
        // Note: account will be set via setAccount() when user logs in
    }

    public setAccount(userId: string | null, githubUser: string | null) {
        console.log('[AutoTranslator] setAccount called:', { userId, githubUser, currentUserId: this.userId, currentGithubUser: this.githubUser });
        // Debounce: only update if values actually changed
        if (this.userId === userId && this.githubUser === githubUser) {
            console.log('[AutoTranslator] setAccount: No change, skipping');
            return;
        }

        console.log('[AutoTranslator] setAccount: Values changed, updating');
        this.userId = userId;
        this.githubUser = githubUser;
        if (userId && githubUser) {
            this.start();
        } else {
            this.stop();
        }
    }

    // Deprecated: use setAccount
    public setUserId(userId: string | null) {
        this.userId = userId;
        if (userId) {
            this.start();
        } else {
            this.stop();
        }
    }

    public start() {
        console.log('[AutoTranslator] start() called, enabled:', this.enabled, 'idleCallbackId:', this.idleCallbackId);
        if (this.enabled && this.idleCallbackId !== null) {
            console.log('[AutoTranslator] start: Already running, skipping');
            return;
        }
        this.enabled = true;
        this.scheduleNext_();
    }

    public stop() {
        console.log('[AutoTranslator] stop() called');
        this.enabled = false;
        if (this.idleCallbackId !== null) {
            if (typeof window !== 'undefined' && 'cancelIdleCallback' in window && !this.isFallback_) {
                cancelIdleCallback(this.idleCallbackId);
            } else {
                clearTimeout(this.idleCallbackId);
            }
            this.idleCallbackId = null;
        }
        this.setProcessing(false);
    }

    public subscribe(listener: (isTranslating: boolean) => void) {
        listener(this.isProcessing);
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private setProcessing(value: boolean) {
        if (this.isProcessing !== value) {
            this.isProcessing = value;
            this.notifyListeners();
        }
    }

    private notifyListeners() {
        this.listeners.forEach(listener => listener(this.isProcessing));
    }


    private isFallback_ = false;

    private scheduleNext_() {
        if (!this.enabled) return;

        // Clear existing to prevent duplicates
        if (this.idleCallbackId !== null) {
            if (typeof window !== 'undefined' && 'cancelIdleCallback' in window && !this.isFallback_) {
                cancelIdleCallback(this.idleCallbackId);
            } else {
                clearTimeout(this.idleCallbackId);
            }
            this.idleCallbackId = null;
        }

        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
            this.isFallback_ = false;
            this.idleCallbackId = requestIdleCallback((deadline) => {
                this.idleCallbackId = null;
                this.processQueue_(deadline);
            }, { timeout: 10000 });
        } else {
            this.isFallback_ = true;
            this.idleCallbackId = setTimeout(() => {
                this.idleCallbackId = null;
                this.processQueue_({
                    timeRemaining: () => 50,
                    didTimeout: false
                });
            }, 5000) as unknown as number;
        }
    }

    private async processQueue_(deadline: IdleDeadline) {
        if (this.isProcessing) return;
        if (!this.userId || !this.githubUser) {
            console.warn('[AutoTranslator] No active account set, skipping translation');
            setTimeout(() => this.scheduleNext_(), 10000);
            return;
        }

        // Only process if we have time remaining or timed out
        if (deadline.timeRemaining() > 0 || deadline.didTimeout) {
            this.setProcessing(true);
            try {
                // 1. Fetch untranslated items from user's starred repos using JOIN
                const { data: starItems, error } = await supabase
                    .from('user_stars')
                    .select(`
                        repo_id,
                        repos!inner(
                            id,
                            name,
                            description,
                            description_cn
                        )
                    `)
                    .eq('user_id', this.userId)
                    .eq('github_user', this.githubUser) // Isolate by GitHub user
                    .is('repos.description_cn', null)
                    .not('repos.description', 'is', null)
                    .range(0, this.BATCH_SIZE - 1);

                if (error) throw error;

                // Deduplicate results immediately (防止查询返回重复记录)
                const uniqueItems = new Map();
                if (starItems) {
                    for (const item of starItems) {
                        const repo = (item as any).repos;
                        if (repo && !uniqueItems.has(repo.id)) {
                            uniqueItems.set(repo.id, item);
                        }
                    }
                }
                const deduplicatedItems = Array.from(uniqueItems.values());
                console.log(`[AutoTranslator] Fetched ${starItems?.length || 0} items, deduplicated to ${deduplicatedItems.length}`);

                if (!deduplicatedItems || deduplicatedItems.length === 0) {
                    // Nothing to translate, check again later but slower
                    setTimeout(() => this.scheduleNext_(), 10000);
                    return;
                }

                // 3. Process batch sequentially to avoid IndexedDB race conditions in db.saveTranslation
                for (const starItem of deduplicatedItems) {
                    const item = (starItem as any).repos;
                    if (!item) continue;

                    // Skip if already being processed
                    if (this.processingRepoIds.has(item.id)) {
                        console.log(`[AutoTranslator] Skipping ${item.name}, already in processing queue`);
                        continue;
                    }

                    // Mark as processing
                    this.processingRepoIds.add(item.id);

                    try {
                        // Skip if description is empty or very short
                        if (!item.description || item.description.trim().length < 2) continue;

                        // Double-check: verify this item still needs translation
                        // Prevents duplicate work if Supabase query was cached
                        const { data: recheck } = await supabase
                            .from('repos')
                            .select('description_cn')
                            .eq('id', item.id)
                            .single();

                        if (recheck?.description_cn) {
                            console.log(`[AutoTranslator] Skipping ${item.name}, already translated`);
                            continue;
                        }

                        const [translated] = await translateText(item.description, 'zh');
                        if (translated) {
                            // Update Supabase
                            await supabase
                                .from('repos')
                                .update({ description_cn: translated })
                                .eq('id', item.id);

                            // Update IndexedDB for real-time UI sync
                            // MUST be awaited to prevent race conditions within the same batch
                            try {
                                await db.saveTranslation(item.id, translated);
                            } catch (dbError) {
                                console.warn(`[AutoTranslator] Failed to sync to IndexedDB for ${item.name}:`, dbError);
                            }
                        }
                    } catch (e) {
                        console.error(`[AutoTranslator] Failed to translate ${item.name}`, e);
                    } finally {
                        // Always remove from processing set
                        this.processingRepoIds.delete(item.id);
                    }
                }

            } catch (err) {
                console.error('[AutoTranslator] Error in processQueue:', err);
            } finally {
                this.setProcessing(false);
                // Add delay after batch completion to allow Supabase to sync
                // Prevents querying the same items again due to eventual consistency
                setTimeout(() => this.scheduleNext_(), 2000);
            }
        } else {
            this.scheduleNext_();
        }
    }
}

// Singleton pattern with HMR support
// Use global variable to ensure only one instance exists across HMR reloads
declare global {
    interface Window {
        __autoTranslator?: AutoTranslator;
    }
}

// Clean up old instance if exists (HMR scenario)
// Check if window exists (for test environment compatibility)
if (typeof window !== 'undefined' && window.__autoTranslator) {
    console.log('[AutoTranslator] Cleaning up old instance due to HMR');
    window.__autoTranslator.stop();
}

// Create and export singleton instance
const autoTranslator = new AutoTranslator();
if (typeof window !== 'undefined') {
    window.__autoTranslator = autoTranslator;
}

export { autoTranslator };
