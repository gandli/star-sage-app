
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import RepoList from './RepoList';
import type { Repo } from '../types';

// Mock dependencies
vi.mock('../utils/db', () => ({
    db: {
        getTranslation: vi.fn().mockResolvedValue(null),
        saveTranslation: vi.fn().mockResolvedValue(undefined),
        getTranslationsFromSupabaseBatch: vi.fn().mockResolvedValue(new Map()),
        saveBatchTranslations: vi.fn().mockResolvedValue(undefined),
    }
}));

vi.mock('../services/StarDataService', () => ({
    starService: {
        fetchAndSummarizeReadme: vi.fn().mockResolvedValue('Summary'),
    }
}));

// Mock AutoSizer to provide dimensions in JSDOM
vi.mock('react-virtualized-auto-sizer', () => ({
    AutoSizer: ({ children }: any) => children({ width: 1200, height: 800 })
}));

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
};

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
} as any;

const createMockRepo = (id: number): Repo => ({
    id,
    name: `repo-${id}`,
    full_name: `owner/repo-${id}`,
    html_url: `https://github.com/owner/repo-${id}`,
    description: `Description for repo ${id}`,
    stargazers_count: 100,
    language: 'TypeScript',
    updated_at: new Date().toISOString(),
    owner: {
        login: 'owner',
        avatar_url: 'https://example.com/avatar.png',
        html_url: 'https://github.com/owner'
    },
    topics: ['react', 'typescript'],
    starred_at: new Date().toISOString()
});

describe('RepoList Performance', () => {
    it('renders 1000 items (baseline check)', () => {
        const repos = Array.from({ length: 1000 }, (_, i) => createMockRepo(i));

        const { container } = render(
            <div style={{ height: 800, width: 1200 }}>
                <RepoList repos={repos} />
            </div>
        );

        // Without virtualization, all 1000 items are in the DOM
        // We look for elements that indicate a card, e.g., the name
        const cardTitles = container.querySelectorAll('h3');
        console.log(`Rendered ${cardTitles.length} cards`);

        // This assertion confirms the baseline "problem"
        // After virtualization, this number should be much lower (only visible ones)
        // But JSDOM layout is tricky. With react-window, it renders based on container size.
        // In JSDOM, we need to ensure AutoSizer works (often requires mocks).

        // For baseline, we expect 1000.
        // With virtualization, we expect significantly fewer.
        // 1200px width -> ~4 columns.
        // 800px height -> ~3 rows.
        // 4 * 3 = 12 visible. + overscan.
        // Should be < 50.
        expect(cardTitles.length).toBeLessThan(50);
        expect(cardTitles.length).toBeGreaterThan(0);
    }, 15000); // 15s timeout
});
