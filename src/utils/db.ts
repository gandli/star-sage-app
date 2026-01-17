const DB_NAME = 'StarsDashDB';
const STORE_NAME = 'repos';
import { supabase } from '../lib/supabase';

export const db = {
    async init(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 1);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },
    async set(key: string, value: any): Promise<void> {
        const idb = await this.init();
        return new Promise((resolve, reject) => {
            const tx = idb.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).put(value, key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    },
    async get(key: string): Promise<any> {
        return this.internalGet(key);
    },

    async internalGet(key: string): Promise<any> {
        const idb = await this.init();
        return new Promise((resolve, reject) => {
            const tx = idb.transaction(STORE_NAME, 'readonly');
            const req = tx.objectStore(STORE_NAME).get(key);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    },

    async saveTranslation(repoId: number, translation: string): Promise<void> {
        // 【边翻译边写入】使用增量更新策略，避免全量读写
        try {
            const repos = await this.get('gh_stars_data') || [];
            const repoIndex = repos.findIndex((r: any) => r.id === repoId);

            if (repoIndex !== -1) {
                // 直接修改对应的 repo 对象
                repos[repoIndex] = {
                    ...repos[repoIndex],
                    description: translation, // User request: prioritize Chinese
                    description_cn: translation
                };

                // 立即写入 IndexedDB
                await this.set('gh_stars_data', repos);
                console.log(`Translation saved to IDB for repo ${repoId}`);
            } else {
                console.warn(`Repo ${repoId} not found in local data`);
            }
        } catch (e) {
            console.error('Failed to update local repos list with translation:', e);
        }

        // Save to Supabase repos table (fire and forget)
        supabase.from('repos').update({ description_cn: translation }).eq('id', repoId).then(({ error }) => {
            if (error) console.error('Supabase translation save failed:', error);
        });
    },

    async getTranslation(repoId: number): Promise<string | null> {
        // 1. Try local IDB (gh_stars_data) first
        try {
            const repos = await this.internalGet('gh_stars_data') || [];
            const repo = repos.find((r: any) => r.id === repoId);
            if (repo?.description_cn) {
                return repo.description_cn;
            }
        } catch (e) {
            console.warn('Local IDB lookup failed', e);
        }

        // 2. Try Supabase repos table
        const { data } = await supabase.from('repos').select('description_cn').eq('id', repoId).single();

        if (data && data.description_cn) {
            // Update the main repos list in IndexedDB to reflect this discovery
            try {
                const repos = await this.internalGet('gh_stars_data') || [];
                const updatedRepos = repos.map((r: any) => {
                    if (r.id === repoId) {
                        return {
                            ...r,
                            description: data.description_cn, // Prioritize Chinese
                            description_cn: data.description_cn
                        };
                    }
                    return r;
                });

                // Use a new transaction to write back
                await this.set('gh_stars_data', updatedRepos);
            } catch (e) {
                console.error('Failed to backfill local repos list from Supabase:', e);
            }

            return data.description_cn;
        }

        return null;
    },

    async saveReadmeSummary(repoId: number, summary: string): Promise<void> {
        // 【边获取边写入】将 README summary 保存到 gh_stars_data
        try {
            const repos = await this.get('gh_stars_data') || [];
            const repoIndex = repos.findIndex((r: any) => r.id === repoId);

            if (repoIndex !== -1) {
                repos[repoIndex] = {
                    ...repos[repoIndex],
                    readme_summary: summary
                };

                // 立即写入 IndexedDB
                await this.set('gh_stars_data', repos);
                console.log(`README summary saved to IDB for repo ${repoId}`);
            } else {
                console.warn(`Repo ${repoId} not found in local data`);
            }
        } catch (e) {
            console.error('Failed to update local repos list with README summary:', e);
        }

        // Save to Supabase repos table (fire and forget)
        supabase.from('repos').update({ readme_summary: summary }).eq('id', repoId).then(({ error }) => {
            if (error) console.error('Supabase README summary save failed:', error);
        });
    }
};
