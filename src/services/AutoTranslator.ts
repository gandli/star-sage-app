import { supabase } from '../lib/supabase';
import { translateText, containsChinese } from '../utils/translate';
import { db } from '../utils/db';
import { starService } from './StarDataService';

class AutoTranslator {
    private isProcessing = false;
    private idleCallbackId: number | null = null;
    private BATCH_SIZE = 50; // Increased to 50 for faster progress
    private enabled = true;
    private listeners: Set<(isTranslating: boolean) => void> = new Set();
    private githubUser: string | null = null;
    private userId: string | null = null;
    private processingRepoIds: Set<number> = new Set(); // Track repos being processed
    private failedRepoIds: Set<number> = new Set(); // Track repos that failed repeatedly
    private isFallback_ = false;

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
            // Check global progress before starting batch
            try {
                // Check progress via Service State (Centralized)
                const { stats } = starService.getState();
                if (stats.githubTotal > 0 && stats.translated >= stats.githubTotal) {
                    console.log(`[AutoTranslator] 100% Progress reached via Service (${stats.translated}/${stats.githubTotal}). Sleeping deeply.`);
                    this.setProcessing(false);
                    setTimeout(() => this.scheduleNext_(), 300000); // 5 min
                    return;
                }
            } catch (pErr) {
                console.warn('[AutoTranslator] Progress check failed, continuing with queue:', pErr);
            }

            this.setProcessing(true);
            try {
                // 1. Fetch untranslated items from user's starred repos using JOIN
                // Use a random offset to prevent stalling on the same block if many items fail
                const randomOffset = Math.floor(Math.random() * 5);
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
                    .eq('github_user', this.githubUser)
                    .is('repos.description_cn', null)
                    .not('repos.description', 'is', null)
                    .neq('repos.description', '') // Filter out empty descriptions at source
                    // Skip failed ones in this session
                    .not('repo_id', 'in', `(${Array.from(this.failedRepoIds).join(',') || -1})`)
                    .range(randomOffset, randomOffset + this.BATCH_SIZE - 1);

                if (error) throw error;

                // 2. Deduplicate results
                const uniqueItems = new Map();
                if (starItems) {
                    for (const starItem of starItems) {
                        const repo = (starItem as any).repos;
                        if (repo && !uniqueItems.has(repo.id)) {
                            uniqueItems.set(repo.id, starItem);
                        }
                    }
                }
                const deduplicatedItems = Array.from(uniqueItems.values());
                console.log(`[AutoTranslator] Fetched ${starItems?.length || 0} items at offset ${randomOffset}, deduplicated to ${deduplicatedItems.length}`);

                if (!deduplicatedItems || deduplicatedItems.length === 0) {
                    // Nothing to translate, check again later but slower
                    setTimeout(() => this.scheduleNext_(), 30000);
                    return;
                }

                // 3. Process batch sequentially
                for (const starItem of deduplicatedItems) {
                    const item = (starItem as any).repos;
                    if (!item) continue;

                    // Skip if already being processed or failed
                    if (this.processingRepoIds.has(item.id) || this.failedRepoIds.has(item.id)) {
                        continue;
                    }

                    // Mark as processing
                    this.processingRepoIds.add(item.id);

                    try {
                        // Mark as handled even if empty to prevent stalling the queue
                        if (!item.description || item.description.trim().length < 2) {
                            console.log(`[AutoTranslator] Skipping ${item.name} due to short/empty description`);
                            await supabase.from('repos').update({ description_cn: '' }).eq('id', item.id);
                            await db.saveTranslation(item.id, '');
                            continue;
                        }

                        // Double-check: verify this item still needs translation
                        const { data: recheck } = await supabase
                            .from('repos')
                            .select('description_cn')
                            .eq('id', item.id)
                            .single();

                        if (recheck && recheck.description_cn !== null) {
                            console.log(`[AutoTranslator] Skipping ${item.name}, already translated`);
                            continue;
                        }

                        let translated = '';
                        if (containsChinese(item.description)) {
                            console.log(`[AutoTranslator] ${item.name} is already in Chinese`);
                            translated = item.description;
                        } else {
                            const [res] = await translateText(item.description, 'zh');
                            translated = res;
                        }

                        if (translated !== undefined) {
                            // Update IndexedDB FIRST for real-time UI sync
                            try {
                                await db.saveTranslation(item.id, translated || '');
                            } catch (dbError) {
                                console.warn(`[AutoTranslator] Failed to sync to IndexedDB for ${item.name}:`, dbError);
                            }

                            // Update Supabase
                            const { error: updateError } = await supabase
                                .from('repos')
                                .update({ description_cn: translated || '' })
                                .eq('id', item.id);

                            if (updateError) {
                                console.error(`[AutoTranslator] Failed to update Supabase for ${item.name}:`, updateError);
                                this.failedRepoIds.add(item.id);
                            }
                        } else {
                            this.failedRepoIds.add(item.id);
                        }
                    } catch (e) {
                        console.error(`[AutoTranslator] Failed to translate ${item.name}`, e);
                        this.failedRepoIds.add(item.id);
                    } finally {
                        this.processingRepoIds.delete(item.id);
                    }
                }

            } catch (err) {
                console.error('[AutoTranslator] Error in processQueue:', err);
            } finally {
                this.setProcessing(false);
                // Add delay after batch completion
                setTimeout(() => this.scheduleNext_(), 2000);
            }
        } else {
            this.scheduleNext_();
        }
    }
}

// Singleton pattern with HMR support
declare global {
    interface Window {
        __autoTranslator?: AutoTranslator;
    }
}

// Clean up old instance if exists
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
