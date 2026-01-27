import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '../utils/db';

// Mock cleanMarkdown
vi.mock('../utils/markdown', () => ({
    cleanMarkdown: (s: string) => s
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Simulate the worker's fetchAndSummarizeReadme function (New version)
async function fetchAndSummarizeReadme_New(repo: any, options: { skipCloudSync?: boolean; skipSave?: boolean } = {}) {
    // Simulate successful fetch
    const summary = "mock summary";
    if (!options.skipSave) {
        await db.saveReadmeSummary(repo.id, summary, options.skipCloudSync);
    }
    return summary;
}

describe('Worker Batch Processing Perf', () => {
    beforeEach(async () => {
        await db.clearAllData();
        vi.clearAllMocks();

        // Mock successful fetch response
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ content: btoa("some markdown") })
        });
    });

    it('processes batch with batched writes (Optimized)', async () => {
        const repoCount = 10;
        const repos = Array.from({length: repoCount}, (_, i) => ({
            id: i + 1,
            name: `repo${i}`,
            full_name: `user/repo${i}`,
            description: '',
            stargazers_count: 0,
            html_url: '',
            updated_at: '',
            language: '',
            owner: { avatar_url: '' }
        }));

        // Setup initial DB state
        await db.upsertRepos(repos as any);

        const saveSpy = vi.spyOn(db, 'saveReadmeSummary');
        const upsertSpy = vi.spyOn(db, 'upsertRepos');

        // Simulate the NEW worker loop logic
        const CONCURRENCY = 5;
        const readmeUpdates: any[] = [];

        for (let i = 0; i < repos.length; i += CONCURRENCY) {
            const batch = repos.slice(i, i + CONCURRENCY);
            const batchUpdates: any[] = [];

            await Promise.all(batch.map(async (repo) => {
                const summary = await fetchAndSummarizeReadme_New(repo, { skipCloudSync: true, skipSave: true });
                if (summary) {
                    repo.readme_summary = summary;
                    repo.sync_status = 'pending';
                    readmeUpdates.push(repo);
                    batchUpdates.push(repo);
                }
            }));

            if (batchUpdates.length > 0) {
                await db.upsertRepos(batchUpdates);
            }
        }

        // Verification: saveReadmeSummary called 0 times
        expect(saveSpy).toHaveBeenCalledTimes(0);

        // Verification: upsertRepos called once per batch (10 items / 5 = 2 batches)
        expect(upsertSpy).toHaveBeenCalledTimes(2);
    });
});
