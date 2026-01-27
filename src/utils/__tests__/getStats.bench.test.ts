import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import type { Repo } from '../../types';

describe('getStats Benchmark', () => {
    const TOTAL_REPOS = 5000;
    const TRANSLATED_COUNT = 1000;

    beforeEach(async () => {
        await db.clearAllData();
        // Insert 5000 repos
        const repos: Repo[] = Array.from({ length: TOTAL_REPOS }, (_, i) => ({
            id: i + 1,
            name: `repo-${i + 1}`,
            full_name: `user/repo-${i + 1}`,
            description: `Description for repo ${i + 1}`,
            // 20% translated (every 5th)
            description_cn: i % 5 === 0 ? `Translated description ${i + 1}` : undefined,
            html_url: `https://github.com/user/repo-${i + 1}`,
            stargazers_count: i,
            updated_at: new Date().toISOString(),
            language: 'TypeScript',
            owner: { login: 'user', avatar_url: 'url' }
        }));
        await db.upsertRepos(repos);
    });

    it('benchmarks getStats performance', async () => {
        const start = performance.now();
        const stats = await db.getStats();
        const end = performance.now();

        console.log(`getStats took: ${(end - start).toFixed(2)}ms`);
        expect(stats.total).toBe(TOTAL_REPOS);
        expect(stats.translated).toBe(TRANSLATED_COUNT);
    });
});
