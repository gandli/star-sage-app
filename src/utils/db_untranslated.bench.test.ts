import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './db';
import type { Repo } from '../types';

describe('Untranslated Repos Benchmark', () => {
    beforeEach(async () => {
        await db.clearAllData();
    });

    it('benchmarks getUntranslatedRepos performance (Worst Case)', async () => {
        const TOTAL_REPOS = 3000;
        const UNTRANSLATED_COUNT = 50;
        const repos: Repo[] = [];

        for (let i = 0; i < TOTAL_REPOS; i++) {
            repos.push({
                id: i,
                name: `repo-${i}`,
                full_name: `user/repo-${i}`,
                html_url: `http://github.com/user/repo-${i}`,
                stargazers_count: i,
                updated_at: new Date().toISOString(),
                description: `Description for repo ${i}`,
                // Last 50 are untranslated.
                // This forces the cursor to scan 2950 items before finding the first untranslated one.
                description_cn: i >= TOTAL_REPOS - UNTRANSLATED_COUNT ? undefined : 'Translated content',
                language: 'TypeScript',
                topics: ['test'],
                owner: { login: 'user', avatar_url: 'http://avatar' },
                starred_at: new Date().toISOString(),
                sync_status: 'synced'
            } as Repo);
        }

        await db.upsertRepos(repos);

        const start = performance.now();
        const untranslated = await db.getUntranslatedRepos(UNTRANSLATED_COUNT);
        const end = performance.now();

        expect(untranslated.length).toBe(UNTRANSLATED_COUNT);
        console.log(`getUntranslatedRepos (Worst Case) Time: ${(end - start).toFixed(2)}ms`);
    });

    it('benchmarks getStats performance', async () => {
        const TOTAL_REPOS = 3000;
        const repos: Repo[] = [];

        for (let i = 0; i < TOTAL_REPOS; i++) {
             repos.push({
                id: i,
                name: `repo-${i}`,
                full_name: `user/repo-${i}`,
                description: 'desc',
                description_cn: i % 2 === 0 ? 'translated' : undefined,
                owner: { login: 'u', avatar_url: 'a' },
                html_url: 'url',
                stargazers_count: 0,
                updated_at: new Date().toISOString(),
                language: 'ts',
                sync_status: 'synced'
            } as Repo);
        }
        await db.upsertRepos(repos);

        const start = performance.now();
        const stats = await db.getStats();
        const end = performance.now();

        expect(stats.total).toBe(TOTAL_REPOS);
        expect(stats.translated).toBe(TOTAL_REPOS / 2);
        console.log(`getStats (Baseline) Time: ${(end - start).toFixed(2)}ms`);
    });
});
