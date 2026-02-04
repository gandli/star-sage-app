import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './db';
import type { Repo } from '../types';

describe('Database Performance Benchmark', () => {
    beforeEach(async () => {
        await db.clearAllData();
    });

    it('benchmarks pending repos retrieval', async () => {
        const TOTAL_REPOS = 5000;
        const PENDING_COUNT = 50;
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
                language: 'TypeScript',
                topics: ['test'],
                owner: { login: 'user', avatar_url: 'http://avatar' },
                starred_at: new Date().toISOString(),
                sync_status: i < PENDING_COUNT ? 'pending' : 'synced'
            } as Repo);
        }

        await db.upsertRepos(repos);

        // Measure Old Way
        const startOld = performance.now();
        const allRepos = await db.getAllRepos();
        const pendingOld = allRepos.filter(r => r.sync_status === 'pending');
        const endOld = performance.now();

        expect(pendingOld.length).toBe(PENDING_COUNT);
        console.log(`Old Way Time: ${(endOld - startOld).toFixed(2)}ms`);

        // Measure New Way
        const startNew = performance.now();
        const pendingNew = await db.getPendingRepos();
        const endNew = performance.now();

        expect(pendingNew.length).toBe(PENDING_COUNT);
        console.log(`New Way Time: ${(endNew - startNew).toFixed(2)}ms`);

        if (endNew - startNew > 0) {
            console.log(`Improvement: ${((endOld - startOld) / (endNew - startNew)).toFixed(2)}x`);
        }
    });

    it('benchmarks untranslated repos retrieval', async () => {
        const TOTAL_REPOS = 5000;
        // Make majority translated, few untranslated to simulate finding "next batch"
        // Put untranslated items at the END to simulate worst-case scan scenario
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
                // Worst case: First 4950 are translated, last 50 are untranslated
                description_cn: i < (TOTAL_REPOS - UNTRANSLATED_COUNT) ? 'Translated Description' : undefined,
                language: 'TypeScript',
                topics: ['test'],
                owner: { login: 'user', avatar_url: 'http://avatar' },
                starred_at: new Date().toISOString(),
            } as Repo);
        }

        await db.upsertRepos(repos);

        const start = performance.now();
        const untranslated = await db.getUntranslatedRepos(50);
        const end = performance.now();

        expect(untranslated.length).toBeLessThanOrEqual(50);
        // We might get fewer if we limit the query, but here we expect to find at least some
        expect(untranslated.length).toBeGreaterThan(0);

        console.log(`Untranslated Retrieval Time (5000 records): ${(end - start).toFixed(2)}ms`);
    });
});
