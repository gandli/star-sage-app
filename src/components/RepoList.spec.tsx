import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import type { Repo } from '../types';

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

import RepoList from './RepoList';

describe('RepoList', () => {
    let observerInstances = 0;

    // Mock IntersectionObserver
    const mockIntersectionObserver = vi.fn();
    mockIntersectionObserver.mockImplementation(function (callback) {
        observerInstances++;
        return {
            observe: vi.fn(),
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

    beforeEach(() => {
        observerInstances = 0;
        window.IntersectionObserver = mockIntersectionObserver;
        window.ResizeObserver = MockResizeObserver;
    });

    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    const createMockRepos = (count: number): Repo[] => {
        return Array.from({ length: count }).map((_, i) => ({
            id: i,
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

    it('should export RepoList component', () => {
        expect(RepoList).toBeDefined();
    });

    it('should share a single IntersectionObserver instance', () => {
        const repoCount = 50;
        const repos = createMockRepos(repoCount);

        render(<RepoList repos={repos} />);

        // Optimized behavior: only 1 observer created shared among all cards
        expect(observerInstances).toBe(1);
    });
});
