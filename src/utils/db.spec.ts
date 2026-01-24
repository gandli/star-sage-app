import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from './db';
import type { Repo } from '../types';

describe('DatabaseService', () => {
    beforeEach(async () => {
        await db.clearAllData();
    });

    afterEach(async () => {
        await db.clearAllData();
    });

    describe('getUntranslatedRepos', () => {
        it('should return only untranslated repos', async () => {
            const repos: Repo[] = [
                { id: 1, name: 'repo1', full_name: 'u/r1', description_cn: 'translated', sync_status: 'synced', last_updated: 1 } as Repo,
                { id: 2, name: 'repo2', full_name: 'u/r2', description_cn: undefined, sync_status: 'synced', last_updated: 1 } as Repo,
                { id: 3, name: 'repo3', full_name: 'u/r3', description_cn: null as any, sync_status: 'synced', last_updated: 1 } as Repo,
                { id: 4, name: 'repo4', full_name: 'u/r4', description_cn: 'translated', sync_status: 'synced', last_updated: 1 } as Repo,
            ];
            await db.upsertRepos(repos);

            const result = await db.getUntranslatedRepos();
            expect(result).toHaveLength(2);
            expect(result.map(r => r.id).sort()).toEqual([2, 3]);
        });

        it('should respect the limit', async () => {
            const repos: Repo[] = [];
            for (let i = 0; i < 10; i++) {
                repos.push({
                    id: i,
                    name: `repo${i}`,
                    full_name: `u/r${i}`,
                    description_cn: undefined
                } as Repo);
            }
            await db.upsertRepos(repos);

            const result = await db.getUntranslatedRepos(5);
            expect(result).toHaveLength(5);
        });
    });
});
