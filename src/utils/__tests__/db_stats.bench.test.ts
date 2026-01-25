import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import type { Repo } from '../../types';

function generateRepos(count: number): Repo[] {
    const languages = ['TypeScript', 'JavaScript', 'Python', 'Rust', 'Go', 'Java', 'C++', 'C', 'Ruby', 'PHP'];
    return Array.from({ length: count }, (_, i) => ({
        id: i + 1,
        name: `repo-${i + 1}`,
        full_name: `user/repo-${i + 1}`,
        description: `Description for repo ${i + 1}`,
        html_url: `https://github.com/user/repo-${i + 1}`,
        stargazers_count: i * 10,
        updated_at: new Date().toISOString(),
        // 10% unknown
        language: i % 10 === 9 ? undefined : languages[i % languages.length],
        owner: {
            avatar_url: 'https://example.com/avatar.png',
            login: 'user'
        }
    }));
}

describe('getLanguageStats Benchmark', () => {
    beforeEach(async () => {
        await db.clearAllData();
        // Insert 5000 repos
        const repos = generateRepos(5000);
        await db.upsertRepos(repos);
    });

    it('benchmarks getLanguageStats performance', async () => {
        // Baseline: Manual implementation of OLD Logic (getAll + in-memory loop)
        const startBaseline = performance.now();
        const dbInstance = await (db as any).dbPromise;
        const repos = await dbInstance.getAll('repos');
        const statsBaseline: Record<string, number> = {};

        for (const repo of repos) {
            const lang = repo.language || 'Unknown';
            statsBaseline[lang] = (statsBaseline[lang] || 0) + 1;
        }

        const resultBaseline = Object.entries(statsBaseline)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));

        const endBaseline = performance.now();
        console.log(`Baseline (Old Logic / getAll) took: ${(endBaseline - startBaseline).toFixed(2)}ms`);

        // Optimization: Current Implementation (getLanguageStats)
        const startOpt = performance.now();
        const resultOpt = await db.getLanguageStats();
        const endOpt = performance.now();
        console.log(`Optimization (New Logic / Cursor) took: ${(endOpt - startOpt).toFixed(2)}ms`);

        // Normalize sorting for comparison
        const normalizedOpt = [...resultOpt].sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));

        expect(normalizedOpt).toEqual(resultBaseline);
    });
});
