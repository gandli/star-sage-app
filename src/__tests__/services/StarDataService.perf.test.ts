import { describe, it, expect, vi, beforeEach } from 'vitest';
import { starService } from './StarDataService';
import { db } from '../utils/db';
import type { Repo } from '../types';

// Mock Worker to avoid issues in JSDOM/Node environment
class MockWorker {
    onmessage: ((e: MessageEvent) => void) | null = null;
    postMessage(msg: any) {}
    terminate() {}
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() { return true; }
}
global.Worker = MockWorker as any;

describe('StarDataService Performance', () => {
    const REPO_COUNT = 5000;

    beforeEach(async () => {
        await db.clearAllData();
        const repos: Repo[] = Array.from({ length: REPO_COUNT }, (_, i) => ({
            id: i,
            name: `repo-${i}`,
            full_name: `user/repo-${i}`,
            html_url: `http://github.com/user/repo-${i}`,
            stargazers_count: i,
            updated_at: new Date().toISOString(),
            description: `Description for repo ${i}`,
            language: 'TypeScript',
            topics: ['test'],
            owner: { login: 'user', avatar_url: '' },
            starred_at: new Date().toISOString(),
        }));
        await db.upsertRepos(repos);

        // Spy on calculateStats to avoid actual worker calls and timeouts
        vi.spyOn(starService, 'calculateStats').mockResolvedValue({
            languageStats: [],
            topicStats: [],
            trendStats: []
        });

        // Initialize service state (simulating load)
        await starService.refreshFromLocal();
    });

    it('measures refreshFromLocal performance', async () => {
        const start = performance.now();
        await starService.refreshFromLocal();
        const end = performance.now();
        const duration = end - start;
        console.log(`refreshFromLocal took: ${duration.toFixed(2)}ms for ${REPO_COUNT} items`);
        expect(duration).toBeGreaterThan(0);
    });

    it('measures updateRepo performance', async () => {
        // Pick a random repo to update
        const repoId = 100;

        const start = performance.now();
        await starService.updateRepo(repoId);
        const end = performance.now();
        const duration = end - start;
        console.log(`updateRepo took: ${duration.toFixed(2)}ms for single item update`);

        expect(duration).toBeLessThan(20); // Should be very fast
    });
});
