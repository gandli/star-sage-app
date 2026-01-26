import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import type { Repo } from '../../types';

function generateRepos(count: number): Repo[] {
    return Array.from({ length: count }, (_, i) => ({
        id: i + 1,
        name: `repo-${i + 1}`,
        full_name: `user/repo-${i + 1}`,
        description: `Description for repo ${i + 1}`,
        html_url: `https://github.com/user/repo-${i + 1}`,
        stargazers_count: i * 10,
        updated_at: new Date().toISOString(),
        // 50% translated
        description_cn: i % 2 === 0 ? `Translation for repo ${i + 1}` : undefined,
        language: 'TypeScript',
        owner: {
            avatar_url: 'https://example.com/avatar.png',
            login: 'user'
        }
    }));
}

describe('getStats Benchmark', () => {
    beforeEach(async () => {
        await db.clearAllData();
        // Insert 5000 repos
        const repos = generateRepos(5000);
        await db.upsertRepos(repos);
    });

    it('benchmarks getStats performance', async () => {
        // Warmup (optional, but good for JIT)
        await db.getStats();

        const start = performance.now();
        const stats = await db.getStats();
        const end = performance.now();

        console.log(`getStats took: ${(end - start).toFixed(2)}ms`);

        expect(stats.total).toBe(5000);
        expect(stats.translated).toBe(2500);
    });
});
