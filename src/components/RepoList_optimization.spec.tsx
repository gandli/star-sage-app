import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import RepoList from './RepoList';
import type { Repo } from '../types';
import { db } from '../utils/db';
import { supabase } from '../lib/supabase';

describe('RepoList Optimization Verification', () => {
    let observerInstances = 0;

    // Mock IntersectionObserver
    const mockIntersectionObserver = vi.fn();
    mockIntersectionObserver.mockImplementation(function (callback: any) {
        observerInstances++;
        return {
            observe: vi.fn(),
            unobserve: vi.fn(),
            disconnect: vi.fn(),
        };
    });

    // Mock ResizeObserver
    class MockResizeObserver {
        observe = vi.fn();
        unobserve = vi.fn();
        disconnect = vi.fn();
    }

    beforeEach(async () => {
        observerInstances = 0;
        window.IntersectionObserver = mockIntersectionObserver;
        window.ResizeObserver = MockResizeObserver;
        await db.clearAllData();
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    const createMockRepos = (count: number): Repo[] => {
        return Array.from({ length: count }).map((_, i) => ({
            id: 2000 + i,
            name: `repo-${i}`,
            full_name: `owner/repo-${i}`,
            description: `Description for repo ${i}`,
            html_url: `https://github.com/owner/repo-${i}`,
            stargazers_count: 100 + i,
            updated_at: new Date().toISOString(),
            language: 'TypeScript',
            owner: {
                login: 'owner',
                avatar_url: 'https://example.com/avatar.png'
            }
        }));
    };

    it('should correctly calculate missingIds and fetch translations', async () => {
        const repos = createMockRepos(5);

        // Mock db.getTranslationsFromSupabaseBatch
        // This is the function we expect to be called with the correct IDs
        const mockBatchFetch = vi.spyOn(db, 'getTranslationsFromSupabaseBatch');
        mockBatchFetch.mockResolvedValue(new Map([
            [2000, 'Translated 0'],
            [2001, 'Translated 1']
        ]));

        vi.spyOn(db, 'saveBatchTranslations').mockResolvedValue();

        vi.useFakeTimers();

        render(<RepoList repos={repos} />);

        // Advance timers to trigger useEffect async logic
        await act(async () => {
            await vi.advanceTimersByTimeAsync(100);
        });

        // Verify that batch fetch was called
        expect(mockBatchFetch).toHaveBeenCalledTimes(1);

        // Verify the IDs passed to it. Should be all 5 repos since none have description_cn
        const calledIds = mockBatchFetch.mock.calls[0][0];
        expect(calledIds).toHaveLength(5);
        expect(calledIds).toContain(2000);
        expect(calledIds).toContain(2004);
    });

    it('should not fetch if all repos are already translated or invalid', async () => {
        const repos = createMockRepos(3).map(r => ({ ...r, description_cn: 'Already translated' }));

        const mockBatchFetch = vi.spyOn(db, 'getTranslationsFromSupabaseBatch');

        vi.useFakeTimers();
        render(<RepoList repos={repos} />);

        await act(async () => {
            await vi.advanceTimersByTimeAsync(100);
        });

        expect(mockBatchFetch).not.toHaveBeenCalled();
    });
});
