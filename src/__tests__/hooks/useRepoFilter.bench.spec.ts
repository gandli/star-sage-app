import { renderHook } from '@testing-library/react';
import { useRepoFilter } from './useRepoFilter';
import { test, expect } from 'vitest';
import type { Repo } from '../types';

test('useRepoFilter performance with 10k repos', () => {
    const repos: Repo[] = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        name: `repo-${i}`,
        full_name: `user/repo-${i}`,
        description: `Description ${i}`,
        html_url: `http://github.com/user/repo-${i}`,
        stargazers_count: i,
        updated_at: new Date().toISOString(),
        language: ['TypeScript', 'JavaScript', 'Python', 'Rust', 'Go'][i % 5],
        owner: { login: 'user', avatar_url: '' },
    }));

    // Case 1: Without languageStats (Baseline / Fallback)
    const start1 = performance.now();
    renderHook(() => useRepoFilter({
        repos,
        searchQuery: '',
        selectedLanguage: null,
        sortOrder: 'starred_at',
        sortDirection: 'desc',
        currentPage: 1,
        itemsPerPage: 30,
        isMobile: false
    }));
    const end1 = performance.now();
    const duration1 = end1 - start1;
    console.log(`[Baseline] Without languageStats: ${duration1.toFixed(2)}ms`);

    // Case 2: With languageStats (Optimized)
    const precalculatedStats = [
        { name: 'TypeScript', value: 2000 },
        { name: 'JavaScript', value: 2000 },
        { name: 'Python', value: 2000 },
        { name: 'Rust', value: 2000 },
        { name: 'Go', value: 2000 }
    ];

    const start2 = performance.now();
    renderHook(() => useRepoFilter({
        repos,
        languageStats: precalculatedStats,
        searchQuery: '',
        selectedLanguage: null,
        sortOrder: 'starred_at',
        sortDirection: 'desc',
        currentPage: 1,
        itemsPerPage: 30,
        isMobile: false
    }));
    const end2 = performance.now();
    const duration2 = end2 - start2;
    console.log(`[Optimized] With languageStats: ${duration2.toFixed(2)}ms`);

    expect(duration2).toBeLessThan(duration1);
});
