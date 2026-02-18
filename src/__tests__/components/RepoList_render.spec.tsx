import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import React from 'react';
import RepoList from './RepoList';
import type { Repo } from '../types';

// Mock GlassCard to track renders
vi.mock('./GlassCard', () => ({
    GlassCard: vi.fn(({ children }) => <div>{children}</div>)
}));

import { GlassCard } from './GlassCard';

describe('RepoList Render Performance', () => {
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

    it('should avoid unnecessary re-renders of children when parent updates', () => {
        const repos = [mockRepo];

        // Initial render
        const { rerender } = render(<RepoList repos={repos} />);

        const initialRenderCount = (GlassCard as any).mock.calls.length;
        expect(initialRenderCount).toBe(1);

        // Re-render with SAME props (simulating parent re-render)
        rerender(<RepoList repos={repos} />);

        const secondRenderCount = (GlassCard as any).mock.calls.length;

        // With React.memo, RepoList should NOT re-render with same props.
        // Even if RepoList re-renders (if we passed new prop ref), RepoCard should NOT re-render.
        expect(secondRenderCount).toBe(initialRenderCount);
    });
});
