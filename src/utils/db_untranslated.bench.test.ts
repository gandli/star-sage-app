import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './db';
import type { Repo } from '../types';

describe('Untranslated Repos Benchmark', () => {
    beforeEach(async () => {
        await db.clearAllData();
    });

    it('benchmarks getUntranslatedRepos with 5000 translated items (Worst Case)', async () => {
        const TOTAL_REPOS = 5000;
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
                description_cn: `Translated description for repo ${i}`,
                language: 'TypeScript',
                topics: ['test'],
                owner: { login: 'user', avatar_url: 'http://avatar' },
                starred_at: new Date().toISOString(),
                sync_status: 'synced'
            } as Repo);
        }

        await db.upsertRepos(repos);

        const start = performance.now();
        const untranslated = await db.getUntranslatedRepos(50);
        const end = performance.now();

        expect(untranslated.length).toBe(0);
        console.log(`[Benchmark] getUntranslatedRepos (5000 items, 0 untranslated): ${(end - start).toFixed(2)}ms`);
    });

    it('benchmarks getUntranslatedRepos with mixed items', async () => {
        const TOTAL_REPOS = 1000;
        const repos: Repo[] = [];

        for (let i = 0; i < TOTAL_REPOS; i++) {
            const isTranslated = i % 2 === 0;
            repos.push({
                id: i,
                name: `repo-${i}`,
                full_name: `user/repo-${i}`,
                html_url: `http://github.com/user/repo-${i}`,
                stargazers_count: i,
                updated_at: new Date().toISOString(),
                description: `Description for repo ${i}`,
                description_cn: isTranslated ? `Translated ${i}` : undefined,
                language: 'TypeScript',
                topics: ['test'],
                owner: { login: 'user', avatar_url: 'http://avatar' },
                starred_at: new Date().toISOString(),
                sync_status: 'synced'
            } as Repo);
        }

        await db.upsertRepos(repos);

        const start = performance.now();
        const untranslated = await db.getUntranslatedRepos(50);
        const end = performance.now();

        expect(untranslated.length).toBe(50);
        console.log(`[Benchmark] getUntranslatedRepos (1000 items, mixed): ${(end - start).toFixed(2)}ms`);
    });
});
