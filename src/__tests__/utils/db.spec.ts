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

    describe('upsertRepos', () => {
        it('should handle empty list', async () => {
            await db.upsertRepos([]);
            const result = await db.getAllRepos();
            expect(result).toHaveLength(0);
        });

        it('should insert new repos', async () => {
            const repos = [{ id: 1, name: 'r1' } as Repo, { id: 2, name: 'r2' } as Repo];
            await db.upsertRepos(repos);
            const result = await db.getAllRepos();
            expect(result).toHaveLength(2);
            expect(result.map(r => r.id).sort((a, b) => a - b)).toEqual([1, 2]);
        });

        it('should update existing repos', async () => {
            await db.upsertRepos([{ id: 1, name: 'r1', description_cn: 'old' } as Repo]);
            await db.upsertRepos([{ id: 1, name: 'r1_updated' } as Repo]);
            const result = await db.getRepo(1);
            expect(result?.name).toBe('r1_updated');
            expect(result?.description_cn).toBe('old'); // Should preserve existing fields
        });

        it('should handle interleaving of existing and new', async () => {
            // Setup: 1, 3 exist
            await db.upsertRepos([{ id: 1 } as Repo, { id: 3 } as Repo]);

            // Upsert: 1 (update), 2 (new), 3 (update), 4 (new)
            await db.upsertRepos([
                { id: 1, name: 'u1' } as Repo,
                { id: 2, name: 'n2' } as Repo,
                { id: 3, name: 'u3' } as Repo,
                { id: 4, name: 'n4' } as Repo
            ]);

            const all = await db.getAllRepos();
            expect(all).toHaveLength(4);
            const r1 = await db.getRepo(1);
            expect(r1?.name).toBe('u1');
            const r2 = await db.getRepo(2);
            expect(r2?.name).toBe('n2');
        });

        it('should handle unsorted input', async () => {
            await db.upsertRepos([
                { id: 3, name: 'r3' } as Repo,
                { id: 1, name: 'r1' } as Repo,
                { id: 2, name: 'r2' } as Repo
            ]);
            const all = await db.getAllRepos();
            expect(all).toHaveLength(3);
            expect(all.map(r => r.id).sort((a, b) => a - b)).toEqual([1, 2, 3]);
        });
    });
});
