import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Worker
class MockWorker {
    onmessage: ((e: MessageEvent) => void) | null = null;
    postMessage = vi.fn();
    terminate = vi.fn();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_url: string | URL, _options?: WorkerOptions) {}
}

// We need to set Worker on global before importing the service
// eslint-disable-next-line @typescript-eslint/no-explicit-any
global.Worker = MockWorker as any;

describe('StarDataService Persistence', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
        localStorage.clear();
        // Clear global mocks that might persist
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (global.Worker as any) = MockWorker;
    });

    it('should load stats from localStorage on initialization', async () => {
        const cachedStats = {
            languageStats: [{ name: 'Rust', value: 100 }],
            topicStats: [{ name: 'System', value: 50 }],
            trendStats: [{ month: '2023-01', count: 10 }]
        };
        localStorage.setItem('gh_stars_stats', JSON.stringify(cachedStats));
        localStorage.setItem('gh_stars_total_count', '100');

        // Dynamically import to ensure new instance
        const { starService } = await import('../StarDataService');

        const state = starService.getState();
        expect(state.stats.githubTotal).toBe(100);
        expect(state.stats.languageStats).toEqual(cachedStats.languageStats);
        expect(state.stats.topicStats).toEqual(cachedStats.topicStats);
        expect(state.stats.trendStats).toEqual(cachedStats.trendStats);
    });

    it('should save stats to localStorage when STATS_CALCULATED is received', async () => {
        // Ensure clean start
        localStorage.clear();

        const { starService } = await import('../StarDataService');
        const worker = starService.getWorker();

        expect(worker).toBeDefined();

        const newStats = {
            languageStats: [{ name: 'Go', value: 200 }],
            topicStats: [{ name: 'Web', value: 120 }],
            trendStats: [{ month: '2023-02', count: 20 }]
        };

        // Simulate worker message
        // We act as the worker sending a message back to the main thread (service)
        if (worker && worker.onmessage) {
             worker.onmessage({
                data: {
                    type: 'STATS_CALCULATED',
                    stats: newStats
                }
            } as MessageEvent);
        } else {
            throw new Error('Worker onmessage not bound');
        }

        // Check localStorage
        expect(localStorage.setItem).toHaveBeenCalledWith('gh_stars_stats', expect.stringContaining('"name":"Go"'));

        // Verify content
        const saved = localStorage.getItem('gh_stars_stats');
        expect(saved).not.toBeNull();
        if (saved) {
            const parsed = JSON.parse(saved);
            expect(parsed.languageStats).toEqual(newStats.languageStats);
        }
    });

    it('should handle corrupted localStorage gracefully', async () => {
        localStorage.setItem('gh_stars_stats', 'invalid-json{');

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const { starService } = await import('../StarDataService');

        const state = starService.getState();
        // Should default to undefined/empty
        expect(state.stats.languageStats).toBeUndefined();

        consoleSpy.mockRestore();
    });
});
