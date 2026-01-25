import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import type { Repo } from '../../types';

function generateRepos(count: number): Repo[] {
    const languages = ['TypeScript', 'JavaScript', 'Python', 'Rust', 'Go', 'Java', 'C++', 'C'];
    return Array.from({ length: count }, (_, i) => ({
        id: i + 1,
        name: `repo-${i + 1}`,
        full_name: `user/repo-${i + 1}`,
        description: `Description for repo ${i + 1}`,
        html_url: `https://github.com/user/repo-${i + 1}`,
        stargazers_count: i * 10,
        updated_at: new Date().toISOString(),
        language: languages[i % languages.length],
        owner: {
            avatar_url: 'https://example.com/avatar.png',
            login: 'user'
        }
    }));
}

describe('getLanguageStats Benchmark', () => {
    beforeEach(async () => {
        await db.clearAllData();
    });

    it('benchmarks getLanguageStats with 5000 records', async () => {
        const repos = generateRepos(5000);
        await db.upsertRepos(repos);

        const start = performance.now();
        const stats = await db.getLanguageStats();
        const end = performance.now();

        console.log(`getLanguageStats (5000 records) took: ${(end - start).toFixed(2)}ms`);

        expect(stats.length).toBeGreaterThan(0);
        expect(stats[0].value).toBeGreaterThan(0);
    });
});
