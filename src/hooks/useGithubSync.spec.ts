import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useGithubSync } from './useGithubSync'
import type { Config } from '../types'
import { starService } from '../services/StarDataService'

// Mock dependencies
vi.mock('../lib/supabase', () => ({
    supabase: {
        auth: {
            getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null }))
        },
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
            })),
            upsert: vi.fn(() => Promise.resolve({ error: null })),
            delete: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ error: null }))
            }))
        }))
    }
}))

vi.mock('../utils/db', () => ({
    db: {
        set: vi.fn(),
        get: vi.fn(),
        getAllRepos: vi.fn(() => Promise.resolve([])),
        clearAllData: vi.fn(() => Promise.resolve())
    }
}))

// Mock starService
vi.mock('../services/StarDataService', () => ({
    starService: {
        subscribe: vi.fn((callback) => {
             // Immediately call callback with default state to avoid issues
             callback({
                 repos: [],
                 loading: false,
                 syncProgress: null,
                 error: null
             });
             return vi.fn();
        }),
        initialize: vi.fn(),
        sync: vi.fn()
    }
}))

describe('useGithubSync', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should export useGithubSync function', () => {
        expect(typeof useGithubSync).toBe('function')
    })

    it('should use passed config if it matches current config', () => {
        const config: Config = { type: 'username', value: 'testuser' };
        const matchingConfig: Config = { type: 'username', value: 'testuser', resolvedUsername: 'TestUser' };

        const { result } = renderHook(() => useGithubSync(config));

        result.current.fetchAllStars(matchingConfig, true, 2);

        expect(starService.sync).toHaveBeenCalledWith(matchingConfig, true, 2);
    })

    it('should fall back to hook config if passed config does not match', () => {
        const config: Config = { type: 'username', value: 'testuser' };
        const otherConfig: Config = { type: 'username', value: 'otheruser' };

        const { result } = renderHook(() => useGithubSync(config));

        result.current.fetchAllStars(otherConfig, true, 2);

        expect(starService.sync).toHaveBeenCalledWith(config, true, 2);
    })
})
