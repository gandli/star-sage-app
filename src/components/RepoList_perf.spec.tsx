import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import RepoList from './RepoList';
import type { Repo } from '../types';
import { db } from '../utils/db';
import { supabase } from '../lib/supabase';

// Mock AutoSizer
vi.mock('react-virtualized-auto-sizer', () => ({
  AutoSizer: ({ children }: any) => children({ height: 1000, width: 1000 }),
}));

// Mock react-window to render all items
vi.mock('react-window', () => ({
  FixedSizeGrid: ({ cellComponent: Cell, cellProps, columnCount, rowCount }: any) => (
      <div data-testid="fixed-size-grid">
          {Array.from({ length: rowCount * columnCount }).map((_, i) => {
              const rowIndex = Math.floor(i / columnCount);
              const columnIndex = i % columnCount;
              return (
                  <Cell
                      key={i}
                      columnIndex={columnIndex}
                      rowIndex={rowIndex}
                      style={{}}
                      {...cellProps}
                  />
              );
          })}
      </div>
  ),
}));

describe('RepoList Performance', () => {
    let observerInstances = 0;

    // Mock IntersectionObserver
    const mockIntersectionObserver = vi.fn();
    mockIntersectionObserver.mockImplementation(function (callback: any) {
        observerInstances++;

        return {
            observe: vi.fn((element) => {
                // Simulate immediate intersection for the observed element
                setTimeout(() => {
                    callback([{ isIntersecting: true, target: element }]);
                }, 10);
            }),
            unobserve: vi.fn(),
            disconnect: vi.fn(),
        };
    });

    // Mock ResizeObserver
    const MockResizeObserver = vi.fn(() => ({
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
    }));

    beforeEach(async () => {
        observerInstances = 0;
        window.IntersectionObserver = mockIntersectionObserver;
        window.ResizeObserver = MockResizeObserver;

        // Clear DB
        await db.clearAllData();
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    const createMockRepos = (count: number): Repo[] => {
        return Array.from({ length: count }).map((_, i) => ({
            id: 1000 + i,
            name: `repo-${i}`,
            full_name: `owner/repo-${i}`,
            description: `Description for repo ${i}`, // English description
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

    it('should reproduce N+1 Supabase queries when translations are missing locally', async () => {
        const repoCount = 10;
        const repos = createMockRepos(repoCount);

        // Pre-populate local DB with repos (no description_cn)
        // This forces db.getTranslation to fall back to Supabase
        await db.upsertRepos(repos);

        vi.useFakeTimers();

        // Mock Supabase select for single repo lookup
        // db.getTranslation calls: supabase.from('repos').select('description_cn').eq('id', repoId).single()
        // We mock it to return null to simulate no translation found even in Supabase (or found, doesn't matter for the count)
        const mockSelect = vi.fn().mockReturnThis();
        const mockEq = vi.fn().mockReturnThis();
        const mockIn = vi.fn();
        const mockSingle = vi.fn().mockResolvedValue({ data: null, error: null });

        // Setup the specific chain
        vi.spyOn(supabase, 'from').mockReturnValue({
            select: mockSelect,
        } as any);

        // Mock chain for individual calls: .select().eq().single()
        // Mock chain for batch calls: .select().in().not()

        const mockNot = vi.fn().mockResolvedValue({
            data: repos.map(r => ({ id: r.id, description_cn: 'Translated Batch' })),
            error: null
        });

        mockSelect.mockReturnValue({
            eq: mockEq,
            in: mockIn
        } as any);

        mockEq.mockReturnValue({
            single: mockSingle
        } as any);

        mockIn.mockReturnValue({
            not: mockNot
        } as any);

        render(<RepoList repos={repos} />);

        // Trigger IO callback
        await act(async () => {
            await vi.advanceTimersByTimeAsync(50);
        });

        // Wait for the async prefetch to likely finish and IDB to update
        // We can't easily await the internal promise of useEffect, but we can advance time
        // The prefetch is async but doesn't use timers (except internal IDB/fetch microtasks).
        // act() should flush microtasks.

        // Trigger translation timers (RepoCard)
        await act(async () => {
            await vi.advanceTimersByTimeAsync(1000);
        });

        // Verify calls
        // With optimization:
        // 1 call for batch prefetch (.in)
        // 0 calls for individual RepoCards (.eq), because they find data in IDB

        const fromCalls = supabase.from.mock.calls;

        // Check if .in was called
        expect(mockIn).toHaveBeenCalled();

        // Check that .eq (individual fetch) was NOT called
        expect(mockEq).not.toHaveBeenCalled();
    });
});
