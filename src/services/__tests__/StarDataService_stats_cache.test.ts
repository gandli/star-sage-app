import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Worker
class MockWorker {
    onmessage: ((e: MessageEvent) => void) | null = null;
    postMessage(msg: any) {}
    terminate() {}
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() { return true; }
}

describe('StarDataService Caching', () => {
    beforeEach(() => {
        vi.resetModules();
        localStorage.clear();
        global.Worker = MockWorker as any;
    });

    it('should load stats from localStorage on initialization', async () => {
        // Setup cache
        const cachedStats = {
            languageStats: [{ name: 'Rust', value: 100 }],
            topicStats: [{ name: 'performance', value: 50 }],
            trendStats: [{ month: '2023-01', count: 10 }]
        };
        localStorage.setItem('gh_stars_stats', JSON.stringify(cachedStats));

        // Dynamically import to trigger new instance/constructor
        const { starService } = await import('../StarDataService');

        const state = starService.getState();
        expect(state.stats.languageStats).toEqual(cachedStats.languageStats);
        expect(state.stats.topicStats).toEqual(cachedStats.topicStats);
        expect(state.stats.trendStats).toEqual(cachedStats.trendStats);
    });

    it('should save stats to localStorage when calculated', async () => {
        const { starService } = await import('../StarDataService');

        // Simulate worker sending stats
        const worker = starService.getWorker();

        // Ensure worker exists (mocked)
        expect(worker).toBeDefined();

        if (worker && worker.onmessage) {
            const newStats = {
                languageStats: [{ name: 'Go', value: 200 }],
                topicStats: [{ name: 'concurrency', value: 80 }],
                trendStats: [{ month: '2023-02', count: 20 }]
            };

            // Trigger the onmessage handler
            // Note: onmessage is an async function in StarDataService
            await worker.onmessage({
                data: {
                    type: 'STATS_CALCULATED',
                    stats: newStats
                }
            } as MessageEvent);

            // Check localStorage
            const saved = localStorage.getItem('gh_stars_stats');
            expect(saved).toBeTruthy();
            expect(JSON.parse(saved!)).toEqual(newStats);

            // Also check state update
            const state = starService.getState();
            expect(state.stats.languageStats).toEqual(newStats.languageStats);
        } else {
             throw new Error('Worker.onmessage was not assigned');
        }
    });
});
