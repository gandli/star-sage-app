import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import type { Repo } from '../../types';

function generateReposWithTopics(count: number): Repo[] {
    const allTopics = ['react', 'vue', 'angular', 'svelte', 'nodejs', 'deno', 'bun', 'python', 'django', 'flask'];
    return Array.from({ length: count }, (_, i) => ({
        id: i + 1,
        name: `repo-${i + 1}`,
        full_name: `user/repo-${i + 1}`,
        description: `Description for repo ${i + 1}`,
        html_url: `https://github.com/user/repo-${i + 1}`,
        stargazers_count: i * 10,
        updated_at: new Date().toISOString(),
        language: 'TypeScript',
        topics: [
            allTopics[i % allTopics.length],
            allTopics[(i + 1) % allTopics.length],
            allTopics[(i + 2) % allTopics.length]
        ],
        owner: {
            avatar_url: 'https://example.com/avatar.png',
            login: 'user'
        }
    }));
}

describe('getTopicStats Benchmark', () => {
    beforeEach(async () => {
        await db.clearAllData();
    });

    it('benchmarks getTopicStats with 5000 records', async () => {
        const repos = generateReposWithTopics(5000);
        await db.upsertRepos(repos);

        const start = performance.now();
        const stats = await db.getTopicStats();
        const end = performance.now();

        console.log(`getTopicStats (5000 records) took: ${(end - start).toFixed(2)}ms`);

        expect(stats.length).toBeGreaterThan(0);
        expect(stats[0].value).toBeGreaterThan(0);
        // Verify we have some topics
        expect(stats.some(s => s.name === 'react')).toBe(true);
    });
});
