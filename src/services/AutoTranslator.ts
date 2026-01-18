import { translateText, translateBatch, containsChinese } from '../utils/translate';
import { db } from '../utils/db';
import { starService } from './StarDataService';

class AutoTranslator {
    private isProcessing = false;
    private idleCallbackId: number | null = null;
    private BATCH_SIZE = 30;
    private enabled = true;
    private listeners: Set<(isTranslating: boolean) => void> = new Set();
    private processingRepoIds: Set<number> = new Set();
    private failedRepoIds: Set<number> = new Set();
    private isFallback_ = false;

    constructor() {
        console.log('[AutoTranslator] Local-First Instance created');
    }

    public start() {
        this.enabled = true;
        this.scheduleNext_();
    }

    public stop() {
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
        if (this.isProcessing || !this.enabled) return;

        // Check for time
        if (deadline.timeRemaining() > 0 || deadline.didTimeout) {
            this.setProcessing(true);
            try {
                // 1. Discover tasks from Local IndexedDB
                const untranslated = await db.getUntranslatedRepos(this.BATCH_SIZE);

                if (untranslated.length === 0) {
                    console.log('[AutoTranslator] No more local tasks found.');
                    setTimeout(() => this.scheduleNext_(), 60000); // Check again in 1 min
                    return;
                }

                console.log(`[AutoTranslator] Found ${untranslated.length} local tasks.`);

                // 2. Prepare batch translation
                const reposNeedingTranslation: typeof untranslated = [];
                const textsToTranslate: string[] = [];

                for (const repo of untranslated) {
                    if (this.processingRepoIds.has(repo.id) || this.failedRepoIds.has(repo.id)) continue;

                    // Skip if already contains Chinese
                    if (containsChinese(repo.description)) {
                        // Directly update with original text
                        this.processingRepoIds.add(repo.id);
                        try {
                            await starService.updateRepoTranslation(repo.id, repo.description);
                        } catch (e) {
                            console.error(`[AutoTranslator] Failed to update ${repo.name}:`, e);
                            this.failedRepoIds.add(repo.id);
                        } finally {
                            this.processingRepoIds.delete(repo.id);
                        }
                    } else {
                        reposNeedingTranslation.push(repo);
                        textsToTranslate.push(repo.description);
                    }
                }

                // 3. Batch translate
                if (textsToTranslate.length > 0) {
                    // Mark all repos as processing BEFORE the API call to prevent duplicate requests
                    reposNeedingTranslation.forEach(repo => this.processingRepoIds.add(repo.id));

                    try {
                        console.log(`[AutoTranslator] Batch translating ${textsToTranslate.length} descriptions...`);
                        const translations = await translateBatch(textsToTranslate, 'zh');

                        // 4. Update all translations
                        for (let i = 0; i < reposNeedingTranslation.length; i++) {
                            const repo = reposNeedingTranslation[i];
                            const translated = translations[i];

                            if (!this.enabled) break;

                            try {
                                if (translated) {
                                    await starService.updateRepoTranslation(repo.id, translated);
                                } else {
                                    this.failedRepoIds.add(repo.id);
                                }
                            } catch (e) {
                                console.error(`[AutoTranslator] Failed to update ${repo.name}:`, e);
                                this.failedRepoIds.add(repo.id);
                            } finally {
                                this.processingRepoIds.delete(repo.id);
                            }

                            // Check deadline
                            if (deadline.timeRemaining() <= 0 && !deadline.didTimeout) break;
                        }
                    } catch (batchError) {
                        // Fallback: If batch translation fails, try one by one
                        console.warn('[AutoTranslator] Batch translation failed, falling back to individual translation:', batchError);

                        for (const repo of reposNeedingTranslation) {
                            if (!this.enabled) break;
                            if (this.processingRepoIds.has(repo.id) || this.failedRepoIds.has(repo.id)) continue;

                            this.processingRepoIds.add(repo.id);
                            try {
                                const [translated] = await translateText(repo.description, 'zh');
                                if (translated) {
                                    await starService.updateRepoTranslation(repo.id, translated);
                                } else {
                                    this.failedRepoIds.add(repo.id);
                                }
                            } catch (e) {
                                console.error(`[AutoTranslator] Failed for ${repo.name}:`, e);
                                this.failedRepoIds.add(repo.id);
                            } finally {
                                this.processingRepoIds.delete(repo.id);
                            }

                            if (deadline.timeRemaining() <= 0 && !deadline.didTimeout) break;
                        }
                    }
                }
            } catch (err) {
                console.error('[AutoTranslator] Error discovered:', err);
            } finally {
                this.setProcessing(false);
                setTimeout(() => this.scheduleNext_(), 5000);
            }
        } else {
            this.scheduleNext_();
        }
    }

    // Dummy for compatibility
    public setAccount(_userId: string | null, _githubUser: string | null) {
        this.start();
    }
}

export const autoTranslator = new AutoTranslator();
