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

    it('benchmarks topic stats calculation', async () => {
        const TOTAL_REPOS = 5000;
        const TOPICS = ['react', 'vue', 'angular', 'svelte', 'nodejs', 'python', 'rust', 'go', 'java', 'kotlin'];
        const repos: Repo[] = [];

        for (let i = 0; i < TOTAL_REPOS; i++) {
            // Assign 2 random topics
            const t1 = TOPICS[Math.floor(Math.random() * TOPICS.length)];
            const t2 = TOPICS[Math.floor(Math.random() * TOPICS.length)];
            const topics = Array.from(new Set([t1, t2])); // Unique topics

            repos.push({
                id: i,
                name: `repo-${i}`,
                full_name: `user/repo-${i}`,
                html_url: `http://github.com/user/repo-${i}`,
                stargazers_count: i,
                updated_at: new Date().toISOString(),
                description: `Description for repo ${i}`,
                language: 'TypeScript',
                topics: topics,
                owner: { login: 'user', avatar_url: 'http://avatar' },
                starred_at: new Date().toISOString(),
                sync_status: 'synced'
            } as Repo);
        }

        await db.upsertRepos(repos);

        // Measure New Optimized Way
        const startNew = performance.now();
        const stats = await db.getTopicStats();
        const endNew = performance.now();

        console.log(`Topic Stats Calculation Time: ${(endNew - startNew).toFixed(2)}ms`);
        console.log('Top Topics:', stats);

        expect(stats.length).toBeLessThanOrEqual(10);
        expect(stats[0].value).toBeGreaterThan(0);

        // Simulating the old O(N) way for comparison
        const startOld = performance.now();
        const allRepos = await db.getAllRepos();
        const oldStats: Record<string, number> = {};
        for (const r of allRepos) {
            if (r.topics) {
                for (const t of r.topics) {
                    oldStats[t] = (oldStats[t] || 0) + 1;
                }
            }
        }
        Object.entries(oldStats)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        const endOld = performance.now();

        console.log(`Old (Simulated) Way Time: ${(endOld - startOld).toFixed(2)}ms`);
        if (endNew - startNew > 0) {
            console.log(`Improvement: ${((endOld - startOld) / (endNew - startNew)).toFixed(2)}x`);
        }
    });
});
