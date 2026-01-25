import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './db';
import type { Repo } from '../types';

describe('Database Trend Stats Benchmark', () => {
    beforeEach(async () => {
        await db.clearAllData();
    });

    it('benchmarks trend stats calculation', async () => {
        const TOTAL_REPOS = 5000;
        const repos: Repo[] = [];

        // Generate repos with random starred_at dates over the last 2 years
        const startDate = new Date().getTime();
        for (let i = 0; i < TOTAL_REPOS; i++) {
            // Random date within last 700 days
            const date = new Date(startDate - Math.floor(Math.random() * 700 * 24 * 60 * 60 * 1000));

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
                starred_at: date.toISOString(),
                sync_status: 'synced'
            } as Repo);
        }

        console.log(`Inserting ${TOTAL_REPOS} repos...`);
        await db.upsertRepos(repos);
        console.log('Insertion complete.');

        // Measure getTrendStats
        const start = performance.now();
        const trends = await db.getTrendStats();
        const end = performance.now();

        console.log(`getTrendStats Time: ${(end - start).toFixed(2)}ms`);
        console.log(`Trends length: ${trends.length}`);

        // Basic verification
        expect(trends.length).toBeGreaterThan(0);
        const totalCount = trends.reduce((sum, item) => sum + item.count, 0);
        expect(totalCount).toBe(TOTAL_REPOS);
    });
});
