import { openDB } from 'idb';
import type { IDBPDatabase, DBSchema } from 'idb';
import type { Repo } from '../types';
import { supabase } from '../lib/supabase';

interface StarSageDB extends DBSchema {
    repos: {
        key: number;
        value: Repo & {
            sync_status?: 'pending' | 'synced';
            last_updated?: number;
        };
        indexes: {
            'by-sync': string;
            'by-lang': string;
        };
    };
    metadata: {
        key: string;
        value: any;
    };
    translations: {
        key: number;
        value: string;
    };
}

const DB_NAME = 'StarsDashDB';
const DB_VERSION = 1;

class DatabaseService {
    private dbPromise: Promise<IDBPDatabase<StarSageDB>>;
    private translationQueue = new Map<number, { resolve: (value: string | null) => void; reject: (reason?: any) => void }[]>();
    private translationTimer: ReturnType<typeof setTimeout> | null = null;

    constructor() {
        this.dbPromise = openDB<StarSageDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                // Repos Store
                const repoStore = db.createObjectStore('repos', {
                    keyPath: 'id'
                });
                repoStore.createIndex('by-sync', 'sync_status');
                repoStore.createIndex('by-lang', 'language');

                // Metadata Store (for flags, config, etc)
                db.createObjectStore('metadata');

                // Translations Cache (simple fallback)
                db.createObjectStore('translations');
            }
        });
    }

    // --- Repo Operations ---
    async upsertRepos(repos: Repo[]): Promise<void> {
        const db = await this.dbPromise;
        const tx = db.transaction('repos', 'readwrite');
        const store = tx.objectStore('repos');

        // Deduplicate repos by ID (Last Write Wins)
        // This prevents race conditions if the input array has duplicates
        const uniqueRepos = new Map<number, Repo>();
        for (const repo of repos) {
            uniqueRepos.set(repo.id, repo);
        }

        await Promise.all(Array.from(uniqueRepos.values()).map(async (repo) => {
            const existing = await store.get(repo.id);
            if (existing) {
                await store.put({
                    ...existing,
                    ...repo,
                    sync_status: repo.sync_status || 'pending',
                    last_updated: Date.now()
                });
            } else {
                await store.put({
                    ...repo,
                    sync_status: repo.sync_status || 'pending',
                    last_updated: Date.now()
                });
            }
        }));

        await tx.done;
    }

    async getAllRepos(): Promise<Repo[]> {
        const db = await this.dbPromise;
        return db.getAll('repos');
    }

    async getUntranslatedRepos(limit: number = 50): Promise<Repo[]> {
        const db = await this.dbPromise;
        const tx = db.transaction('repos', 'readonly');
        const results: Repo[] = [];
        let cursor = await tx.store.openCursor();

        while (cursor && results.length < limit) {
            const r = cursor.value;
            if (r.description_cn === null || r.description_cn === undefined) {
                results.push(r);
            }
            cursor = await cursor.continue();
        }
        return results;
    }

    async getRepo(id: number): Promise<Repo | undefined> {
        const db = await this.dbPromise;
        return db.get('repos', id);
    }

    async getPendingRepos(): Promise<Repo[]> {
        const db = await this.dbPromise;
        return db.getAllFromIndex('repos', 'by-sync', 'pending');
    }

    // --- Translation Operations ---
    async saveTranslation(repoId: number, translation: string): Promise<void> {
        const db = await this.dbPromise;
        const tx = db.transaction(['repos', 'translations'], 'readwrite');

        // 1. Update primary repo record
        const repo = await tx.objectStore('repos').get(repoId);
        if (repo) {
            repo.description_cn = translation;
            repo.sync_status = 'pending'; // Mark for cloud sync
            await tx.objectStore('repos').put(repo);
        }

        // 2. Update simple lookup cache
        await tx.objectStore('translations').put(translation, repoId);

        await tx.done;
    }

    async saveBatchTranslations(translations: Array<{ repoId: number; translation: string }>): Promise<void> {
        const db = await this.dbPromise;
        const tx = db.transaction(['repos', 'translations'], 'readwrite');

        await Promise.all(translations.map(async ({ repoId, translation }) => {
            // 1. Update primary repo record
            const repo = await tx.objectStore('repos').get(repoId);
            if (repo) {
                repo.description_cn = translation;
                repo.sync_status = 'pending'; // Mark for cloud sync
                await tx.objectStore('repos').put(repo);
            }

            // 2. Update simple lookup cache
            await tx.objectStore('translations').put(translation, repoId);
        }));

        await tx.done;
    }

    async getTranslation(repoId: number): Promise<string | null> {
        const db = await this.dbPromise;

        // Check repos store first
        const repo = await db.get('repos', repoId);
        if (repo?.description_cn) return repo.description_cn;

        // Check translations cache
        const cached = await db.get('translations', repoId);
        if (cached) return cached;

        // Queue for batched Supabase fallback
        return new Promise((resolve, reject) => {
            if (!this.translationQueue.has(repoId)) {
                this.translationQueue.set(repoId, []);
            }
            this.translationQueue.get(repoId)!.push({ resolve, reject });

            if (!this.translationTimer) {
                this.translationTimer = setTimeout(() => {
                    this.processTranslationQueue();
                }, 10); // 10ms buffer
            }
        });
    }

    private async processTranslationQueue() {
        // Clear timer ref
        this.translationTimer = null;

        const queue = new Map(this.translationQueue);
        this.translationQueue.clear();

        const repoIds = Array.from(queue.keys());
        if (repoIds.length === 0) return;

        try {
            const translationsMap = await this.getTranslationsFromSupabaseBatch(repoIds);

            // Save to local DB if we found anything
            if (translationsMap.size > 0) {
                const updates = Array.from(translationsMap.entries()).map(([repoId, translation]) => ({
                    repoId,
                    translation
                }));
                await this.saveBatchTranslations(updates);
            }

            // Resolve promises
            queue.forEach((resolvers, repoId) => {
                const translation = translationsMap.get(repoId) || null;
                resolvers.forEach(({ resolve }) => resolve(translation));
            });

        } catch (error) {
            console.warn('[db] Batch translation fallback failed:', error);
            // Resolve all with null to maintain graceful fallback behavior
            queue.forEach((resolvers) => {
                resolvers.forEach(({ resolve }) => resolve(null));
            });
        }
    }

    async getTranslationsFromSupabaseBatch(repoIds: number[]): Promise<Map<number, string>> {
        const results = new Map<number, string>();
        if (repoIds.length === 0) return results;

        try {
            const { data, error } = await supabase
                .from('repos')
                .select('id, description_cn')
                .in('id', repoIds)
                .not('description_cn', 'is', null);

            if (error) throw error;

            if (data) {
                data.forEach(row => {
                    if (row.description_cn) {
                        results.set(Number(row.id), row.description_cn);
                    }
                });
            }
        } catch (e) {
            console.warn('[db] Batch Supabase translation lookup failed:', e);
        }

        return results;
    }

    async getStats(): Promise<{ total: number; translated: number }> {
        const db = await this.dbPromise;
        const total = await db.count('repos');

        let translated = 0;
        const tx = db.transaction('repos', 'readonly');
        let cursor = await tx.store.openCursor();

        while (cursor) {
            const r = cursor.value;
            if (r.description_cn !== null && r.description_cn !== undefined) {
                translated++;
            }
            cursor = await cursor.continue();
        }

        return {
            total,
            translated
        };
    }

    async getLanguageStats(): Promise<{ name: string; value: number }[]> {
        const db = await this.dbPromise;
        const tx = db.transaction('repos', 'readonly');
        const index = tx.store.index('by-lang');
        let cursor = await index.openKeyCursor();

        const stats: Record<string, number> = {};
        let totalIndexed = 0;

        while (cursor) {
            const lang = cursor.key as string;
            // Count all records with this specific language key
            // Note: index.count(key) is efficient
            const count = await index.count(lang);

            const label = lang || 'Unknown';
            stats[label] = (stats[label] || 0) + count;
            totalIndexed += count;

            // Jump to next language to avoid iterating every record
            // Appending a null character (or very small char) to the current string
            // creates a key strictly greater than current but less than any other valid string starting with current + something else?
            // Actually, we want the next DIFFERENT key.
            // current key: "JavaScript"
            // "JavaScript" + "\u0000" is > "JavaScript".
            // If the next key is "Kotlin", "JavaScript\u0000" < "Kotlin".
            // So this skips all "JavaScript" records and lands on "Kotlin".
            cursor = await cursor.continue(lang + '\u0000');
        }

        // Calculate 'Unknown' (repos not in the index or null keys)
        // Note: repos with null/undefined language are NOT added to 'by-lang' index
        // Use the same transaction to ensure consistency
        const totalRepos = await tx.store.count();
        const missing = totalRepos - totalIndexed;
        if (missing > 0) {
            stats['Unknown'] = (stats['Unknown'] || 0) + missing;
        }

        return Object.entries(stats)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }

    async getTopicStats(): Promise<{ name: string; value: number }[]> {
        const db = await this.dbPromise;
        const tx = db.transaction('repos', 'readonly');
        const stats: Record<string, number> = {};

        let cursor = await tx.store.openCursor();

        while (cursor) {
            const topics = cursor.value.topics;
            if (topics && Array.isArray(topics)) {
                for (const topic of topics) {
                    stats[topic] = (stats[topic] || 0) + 1;
                }
            }
            cursor = await cursor.continue();
        }

        return Object.entries(stats)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);
    }

    async getTrendStats(): Promise<{ month: string; count: number }[]> {
        const db = await this.dbPromise;
        const tx = db.transaction('repos', 'readonly');
        const trends: Record<string, number> = {};

        let cursor = await tx.store.openCursor();
        while (cursor) {
            const starredAt = cursor.value.starred_at;
            if (starredAt) {
                const month = starredAt.substring(0, 7);
                trends[month] = (trends[month] || 0) + 1;
            }
            cursor = await cursor.continue();
        }

        return Object.entries(trends)
            .map(([month, count]) => ({ month, count }))
            .sort((a, b) => a.month.localeCompare(b.month));
    }

    // --- Readme Operations ---
    async saveReadmeSummary(repoId: number, summary: string, skipCloudSync: boolean = false): Promise<void> {
        const db = await this.dbPromise;
        const tx = db.transaction('repos', 'readwrite');
        const repo = await tx.objectStore('repos').get(repoId);
        if (repo) {
            repo.readme_summary = summary;
            repo.sync_status = 'pending';
            await tx.objectStore('repos').put(repo);
        }
        await tx.done;

        if (!skipCloudSync) {
            // Fire and forget cloud update
            supabase.from('repos').update({ readme_summary: summary }).eq('id', repoId).then(({ error }) => {
                if (error) console.warn('Background README sync failed:', error);
            });
        }
    }

    // --- Generic Metadata ---
    async setMetadata(key: string, value: any): Promise<void> {
        const db = await this.dbPromise;
        await db.put('metadata', value, key);
    }

    async getMetadata(key: string): Promise<any> {
        const db = await this.dbPromise;
        return db.get('metadata', key);
    }

    // --- Compatibility Wrappers (to minimize breakage during transition) ---
    async get(key: string): Promise<any> {
        if (key === 'gh_stars_data') return this.getAllRepos();
        return this.getMetadata(key);
    }

    async set(key: string, value: any): Promise<void> {
        if (key === 'gh_stars_data' && Array.isArray(value)) {
            return this.upsertRepos(value);
        }
        return this.setMetadata(key, value);
    }

    async clearAllData(): Promise<void> {
        const db = await this.dbPromise;
        await Promise.all([
            db.clear('repos'),
            db.clear('metadata'),
            db.clear('translations')
        ]);
    }

    // --- Sync Checkpoint Support ---
    async getSyncCheckpoint(configId: string): Promise<number | null> {
        const meta = await this.getMetadata(`checkpoint_${configId}`);
        return meta ? parseInt(meta, 10) : null;
    }

    async setSyncCheckpoint(configId: string, page: number | null): Promise<void> {
        if (page === null) {
            // Remove checkpoint when done or starting over
            const db = await this.dbPromise;
            await db.delete('metadata', `checkpoint_${configId}`);
        } else {
            await this.setMetadata(`checkpoint_${configId}`, page.toString());
        }
    }
}

export const db = new DatabaseService();
