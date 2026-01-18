import { supabase } from '../lib/supabase';
import { translateText } from '../utils/translate';
import { db } from '../utils/db';

class AutoTranslator {
    private isProcessing = false;
    private idleCallbackId: number | null = null;
    private BATCH_SIZE = 5; // Translate 5 items at a time
    private enabled = true;
    private listeners: Set<(isTranslating: boolean) => void> = new Set();
    private githubUser: string | null = null;
    private userId: string | null = null;


    constructor() {
        // Note: account will be set via setAccount() when user logs in
    }

    public setAccount(userId: string | null, githubUser: string | null) {
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
        this.enabled = true;
        this.scheduleNext_();
    }

    public stop() {
        this.enabled = false;
        if (this.idleCallbackId) {
            cancelIdleCallback(this.idleCallbackId);
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

        if ('requestIdleCallback' in window) {
            this.idleCallbackId = requestIdleCallback((deadline) => {
                this.processQueue_(deadline);
            }, { timeout: 10000 }); // Process at least every 10s if really idle
        } else {
            // Fallback for Safari/others if requestIdleCallback missing (though most modern have it)
            this.idleCallbackId = setTimeout(() => {
                this.processQueue_({
                    timeRemaining: () => 50, // Mock infinite time
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

                // 2. Get accurate progress info using JOIN
                const { count: totalCount } = await supabase
                    .from('user_stars')
                    .select('repo_id, repos!inner(description)', { count: 'exact', head: true })
                    .eq('user_id', this.userId)
                    .eq('github_user', this.githubUser) // Isolate by GitHub user
                    .not('repos.description', 'is', null);

                const { count: untranslatedCount } = await supabase
                    .from('user_stars')
                    .select('repo_id, repos!inner(description_cn)', { count: 'exact', head: true })
                    .eq('user_id', this.userId)
                    .eq('github_user', this.githubUser) // Isolate by GitHub user
                    .not('repos.description', 'is', null)
                    .is('repos.description_cn', null);

                if (totalCount !== null && untranslatedCount !== null) {
                    const translatedCount = totalCount - untranslatedCount;
                    // Conservative percentage: use floor and cap at 99 if not truly finished
                    let progress = totalCount > 0 ? Math.floor((translatedCount / totalCount) * 100) : 100;
                    if (progress === 100 && translatedCount < totalCount) {
                        progress = 99;
                    }
                    console.log(`[AutoTranslator] Account: ${this.githubUser}, Progress: ${progress}% (${translatedCount}/${totalCount} items translated)`);
                }

                if (!starItems || starItems.length === 0) {
                    // Nothing to translate, check again later but slower
                    setTimeout(() => this.scheduleNext_(), 10000);
                    return;
                }

                // 3. Process batch
                await Promise.all(starItems.map(async (starItem) => {
                    const item = (starItem as any).repos;
                    if (!item) return;

                    try {
                        // Skip if description is empty or very short
                        if (!item.description || item.description.trim().length < 2) return;

                        const [translated] = await translateText(item.description, 'zh');
                        if (translated) {
                            // Update Supabase
                            await supabase
                                .from('repos')
                                .update({ description_cn: translated })
                                .eq('id', item.id);

                            // Update IndexedDB for real-time UI sync
                            try {
                                await db.saveTranslation(item.id, translated);
                            } catch (dbError) {
                                console.warn(`[AutoTranslator] Failed to sync to IndexedDB for ${item.name}:`, dbError);
                            }
                        }
                    } catch (e) {
                        console.error(`[AutoTranslator] Failed to translate ${item.name}`, e);
                    }
                }));

            } catch (err) {
                console.error('[AutoTranslator] Error in processQueue:', err);
            } finally {
                this.setProcessing(false);
                this.scheduleNext_();
            }
        } else {
            this.scheduleNext_();
        }
    }
}

export const autoTranslator = new AutoTranslator();
