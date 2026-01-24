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

        await Promise.all(repos.map(async (repo) => {
            const existing = await store.get(repo.id);
            await store.put({
                ...existing,
                ...repo,
                sync_status: repo.sync_status || 'pending',
                last_updated: Date.now()
            });
        }));

        await tx.done;
    }

    async getAllRepos(): Promise<Repo[]> {
        const db = await this.dbPromise;
        return db.getAll('repos');
    }

    async getUntranslatedRepos(limit: number = 50): Promise<Repo[]> {
        const db = await this.dbPromise;
        const repos = await db.getAll('repos');
        return repos
            .filter(r => r.description_cn === null || r.description_cn === undefined)
            .slice(0, limit);
    }

    async getRepo(id: number): Promise<Repo | undefined> {
        const db = await this.dbPromise;
        return db.get('repos', id);
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

        for (const { repoId, translation } of translations) {
            // 1. Update primary repo record
            const repo = await tx.objectStore('repos').get(repoId);
            if (repo) {
                repo.description_cn = translation;
                repo.sync_status = 'pending'; // Mark for cloud sync
                await tx.objectStore('repos').put(repo);
            }

            // 2. Update simple lookup cache
            await tx.objectStore('translations').put(translation, repoId);
        }

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

        // Supabase fallback (as before)
        try {
            const { data } = await supabase.from('repos').select('description_cn').eq('id', repoId).single();
            if (data?.description_cn) {
                await this.saveTranslation(repoId, data.description_cn);
                return data.description_cn;
            }
        } catch (e) {
            console.warn('Supabase backfill failed:', e);
        }

        return null;
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
        const repos = await db.getAll('repos');
        return {
            total: repos.length,
            translated: repos.filter(r => r.description_cn !== null && r.description_cn !== undefined).length
        };
    }

    // --- Readme Operations ---
    async saveReadmeSummary(repoId: number, summary: string): Promise<void> {
        const db = await this.dbPromise;
        const tx = db.transaction('repos', 'readwrite');
        const repo = await tx.objectStore('repos').get(repoId);
        if (repo) {
            repo.readme_summary = summary;
            repo.sync_status = 'pending';
            await tx.objectStore('repos').put(repo);
        }
        await tx.done;

        // Fire and forget cloud update
        supabase.from('repos').update({ readme_summary: summary }).eq('id', repoId).then(({ error }) => {
            if (error) console.warn('Background README sync failed:', error);
        });
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
