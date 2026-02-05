import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './db';
import type { Repo } from '../types';

describe('Database Performance Benchmark - Translation Status', () => {
    beforeEach(async () => {
        await db.clearAllData();
    });

    it('benchmarks untranslated repos retrieval and stats calculation', async () => {
        const TOTAL_REPOS = 5000;
        const TRANSLATED_COUNT = 2500;
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
                description_cn: i < TRANSLATED_COUNT ? `Translation for repo ${i}` : undefined,
                language: 'TypeScript',
                topics: ['test'],
                owner: { login: 'user', avatar_url: 'http://avatar' },
                starred_at: new Date().toISOString(),
                sync_status: 'synced'
            } as Repo);
        }

        console.log('Seeding database with 5000 records...');
        await db.upsertRepos(repos);
        console.log('Database seeded.');

        // Measure getStats
        const startStats = performance.now();
        const stats = await db.getStats();
        const endStats = performance.now();

        expect(stats.total).toBe(TOTAL_REPOS);
        expect(stats.translated).toBe(TRANSLATED_COUNT);
        console.log(`getStats Time: ${(endStats - startStats).toFixed(2)}ms`);

        // Measure getUntranslatedRepos
        const startUntranslated = performance.now();
        const untranslated = await db.getUntranslatedRepos(50);
        const endUntranslated = performance.now();

        expect(untranslated.length).toBe(50);
        expect(untranslated[0].description_cn).toBeUndefined();
        console.log(`getUntranslatedRepos (limit 50) Time: ${(endUntranslated - startUntranslated).toFixed(2)}ms`);
    });
});
