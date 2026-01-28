import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom'; // Import custom matchers
import RepoList from './RepoList';
import type { Repo } from '../types';

// Mock LoadingSkeleton
vi.mock('./LoadingSkeleton', () => ({
    LoadingSkeleton: ({ count }: { count: number }) => <div data-testid="loading-skeleton" data-count={count}>Skeleton</div>
}));

// Mock GlassCard
vi.mock('./GlassCard', () => ({
    GlassCard: vi.fn(({ children }) => <div>{children}</div>)
}));

// Mock dependencies
vi.mock('../utils/db', () => ({
    db: {
        getTranslationsFromSupabaseBatch: vi.fn().mockResolvedValue(new Map()),
        saveBatchTranslations: vi.fn().mockResolvedValue(undefined)
    }
}));

describe('RepoList hasMore', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Mock IntersectionObserver
        window.IntersectionObserver = vi.fn().mockImplementation(() => ({
            observe: vi.fn(),
            unobserve: vi.fn(),
            disconnect: vi.fn(),
        }));
    });

    afterEach(() => {
        cleanup();
    });

    const mockRepo: Repo = {
        id: 1,
        name: 'test-repo',
        full_name: 'owner/test-repo',
        description: 'Test description',
        html_url: 'https://github.com/owner/test-repo',
        stargazers_count: 100,
        updated_at: new Date().toISOString(),
        language: 'TypeScript',
        owner: {
            login: 'owner',
            avatar_url: 'https://example.com/avatar.png'
        }
    };

    it('should render LoadingSkeleton when hasMore is true', () => {
        const repos = [mockRepo];

        render(<RepoList repos={repos} hasMore={true} />);

        const skeleton = screen.getByTestId('loading-skeleton');
        expect(skeleton).toBeDefined();
        expect(skeleton.getAttribute('data-count')).toBe('3');
    });

    it('should NOT render LoadingSkeleton when hasMore is false', () => {
        const repos = [mockRepo];

        render(<RepoList repos={repos} hasMore={false} />);

        const skeleton = screen.queryByTestId('loading-skeleton');
        expect(skeleton).toBeNull();
    });

    it('should render LoadingSkeleton inside the grid container', () => {
        const repos = [mockRepo];
        const { container } = render(<RepoList repos={repos} hasMore={true} />);

        // The grid container has class 'grid'
        const grid = container.querySelector('.grid');
        const skeleton = screen.getByTestId('loading-skeleton');

        expect(grid).toContainElement(skeleton);
    });
});
