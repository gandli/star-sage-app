import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import type { Repo } from '../../types';

function generateRepos(count: number, translatedRatio: number): Repo[] {
    return Array.from({ length: count }, (_, i) => {
        const isTranslated = i < count * translatedRatio;
        return {
            id: i + 1,
            name: `repo-${i + 1}`,
            full_name: `user/repo-${i + 1}`,
            description: `Description for repo ${i + 1}`,
            description_cn: isTranslated ? `Translation for repo ${i + 1}` : undefined,
            html_url: `https://github.com/user/repo-${i + 1}`,
            stargazers_count: i * 10,
            updated_at: new Date().toISOString(),
            language: 'TypeScript',
            owner: {
                avatar_url: 'https://example.com/avatar.png',
                login: 'user'
            }
        };
    });
}

describe('Database Untranslated Benchmark', () => {
    beforeEach(async () => {
        await db.clearAllData();
    });

    it('benchmarks getUntranslatedRepos with 10000 records (90% translated)', async () => {
        const count = 10000;
        const repos = generateRepos(count, 0.9);

        // Chunk inserts to avoid large transaction issues if any
        const chunkSize = 1000;
        for (let i = 0; i < repos.length; i += chunkSize) {
            await db.upsertRepos(repos.slice(i, i + chunkSize));
        }

        const start = performance.now();
        const untranslated = await db.getUntranslatedRepos(50);
        const end = performance.now();

        console.log(`getUntranslatedRepos (10000 records, 90% translated) took: ${(end - start).toFixed(2)}ms`);
        console.log(`Found ${untranslated.length} untranslated repos`);

        expect(untranslated.length).toBeLessThanOrEqual(50);
        expect(untranslated.length).toBeGreaterThan(0);
        expect(untranslated[0].description_cn).toBeUndefined();
    });
});
