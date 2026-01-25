import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import type { Repo } from '../../types';

function generateMockApiResults(batches: number, itemsPerBatch: number): any[][] {
    const results: any[][] = [];
    let idCounter = 1;
    for (let i = 0; i < batches; i++) {
        const batch: any[] = [];
        for (let j = 0; j < itemsPerBatch; j++) {
            batch.push({
                repo: {
                    id: idCounter++,
                    name: `repo-${idCounter}`,
                    full_name: `user/repo-${idCounter}`,
                    html_url: `https://github.com/user/repo-${idCounter}`,
                    stargazers_count: 100,
                    pushed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    description: `Description for repo ${idCounter}`,
                    language: 'TypeScript',
                    topics: ['react', 'typescript'],
                    owner: {
                        login: 'user',
                        avatar_url: 'https://example.com/avatar.png'
                    }
                },
                starred_at: new Date().toISOString()
            });
        }
        results.push(batch);
    }
    return results;
}

describe('Sync Performance Benchmark', () => {
    beforeEach(async () => {
        await db.clearAllData();
    });

    it('benchmarks sequential upsert (current behavior)', async () => {
        const batches = 5;
        const itemsPerBatch = 100;
        const results = generateMockApiResults(batches, itemsPerBatch);

        const start = performance.now();

        let processedCount = 0;
        for (const data of results) {
            if (!Array.isArray(data) || data.length === 0) continue;

            const processed = data.map((item: any) => ({
                id: item.repo.id,
                name: item.repo.name,
                full_name: item.repo.full_name,
                html_url: item.repo.html_url,
                stargazers_count: item.repo.stargazers_count,
                updated_at: item.repo.pushed_at || item.repo.updated_at,
                description: item.repo.description,
                language: item.repo.language,
                topics: item.repo.topics || [],
                owner: { login: item.repo.owner.login, avatar_url: item.repo.owner.avatar_url },
                starred_at: item.starred_at,
                sync_status: 'pending'
            } as Repo));

            await db.upsertRepos(processed);
            processedCount += processed.length;
        }

        const end = performance.now();
        console.log(`Sequential Upsert (${batches} batches of ${itemsPerBatch}) took: ${(end - start).toFixed(2)}ms`);

        const stored = await db.getAllRepos();
        expect(stored.length).toBe(batches * itemsPerBatch);
    });

    it('benchmarks batched upsert (optimized behavior)', async () => {
        const batches = 5;
        const itemsPerBatch = 100;
        const results = generateMockApiResults(batches, itemsPerBatch);

        const start = performance.now();

        const allItems = results.flat();
        const processed = allItems.map((item: any) => ({
            id: item.repo.id,
            name: item.repo.name,
            full_name: item.repo.full_name,
            html_url: item.repo.html_url,
            stargazers_count: item.repo.stargazers_count,
            updated_at: item.repo.pushed_at || item.repo.updated_at,
            description: item.repo.description,
            language: item.repo.language,
            topics: item.repo.topics || [],
            owner: { login: item.repo.owner.login, avatar_url: item.repo.owner.avatar_url },
            starred_at: item.starred_at,
            sync_status: 'pending'
        } as Repo));

        await db.upsertRepos(processed);

        const end = performance.now();
        console.log(`Batched Upsert (${batches * itemsPerBatch} items) took: ${(end - start).toFixed(2)}ms`);

        const stored = await db.getAllRepos();
        expect(stored.length).toBe(batches * itemsPerBatch);
    });
});
