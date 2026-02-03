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
                description: `Description ${i}`,
                description_cn: i < UNTRANSLATED_COUNT ? undefined : '已翻译',
                sync_status: 'synced',
                language: 'TypeScript',
                topics: [],
                owner: { login: 'user', avatar_url: 'http://avatar' }
            } as Repo);
        }

        await db.upsertRepos(repos);

        // Measure Old Way (Full Scan Simulation)
        const startOld = performance.now();
        const allRepos = await db.getAllRepos();
        const untranslatedOld = allRepos.filter(r => r.description_cn === undefined || r.description_cn === null);
        const endOld = performance.now();

        expect(untranslatedOld.length).toBe(UNTRANSLATED_COUNT);
        console.log(`Old Way (Scan) Time: ${(endOld - startOld).toFixed(2)}ms`);

        // Measure New Way (Index)
        const startNew = performance.now();
        const untranslatedNew = await db.getUntranslatedRepos(UNTRANSLATED_COUNT + 10);
        const endNew = performance.now();

        expect(untranslatedNew.length).toBe(UNTRANSLATED_COUNT);
        console.log(`New Way (Index) Time: ${(endNew - startNew).toFixed(2)}ms`);

        if (endNew - startNew > 0) {
            console.log(`Improvement: ${((endOld - startOld) / (endNew - startNew)).toFixed(2)}x`);
        }
    });
});
