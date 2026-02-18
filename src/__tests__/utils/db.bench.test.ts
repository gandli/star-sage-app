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
        language: 'TypeScript',
        owner: {
            avatar_url: 'https://example.com/avatar.png',
            login: 'user'
        }
    }));
}

describe('Database Performance Benchmark', () => {
    beforeEach(async () => {
        await db.clearAllData();
    });

    it('benchmarks upsertRepos with 1000 records', async () => {
        const repos = generateRepos(1000);

        const start = performance.now();
        await db.upsertRepos(repos);
        const end = performance.now();

        console.log(`upsertRepos (1000 records) took: ${(end - start).toFixed(2)}ms`);

        // Verification
        const stored = await db.getAllRepos();
        expect(stored.length).toBe(1000);
    });

    it('benchmarks upsertRepos update (read+write) with 1000 records', async () => {
        const repos = generateRepos(1000);
        await db.upsertRepos(repos); // Pre-fill

        // Modify something
        const updatedRepos = repos.map(r => ({ ...r, stargazers_count: r.stargazers_count + 1 }));

        const start = performance.now();
        await db.upsertRepos(updatedRepos);
        const end = performance.now();

        console.log(`upsertRepos UPDATE (1000 records) took: ${(end - start).toFixed(2)}ms`);

        // Verification
        const stored = await db.getAllRepos();
        expect(stored.length).toBe(1000);
        expect(stored[0].stargazers_count).toBe(1);
    });
});
