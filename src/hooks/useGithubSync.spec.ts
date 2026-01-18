import { describe, it, expect, vi } from 'vitest'
import { useGithubSync } from './useGithubSync'

// Mock dependencies
vi.mock('../lib/supabase', () => ({
    supabase: {
        auth: {
            getUser: vi.fn()
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
        get: vi.fn()
    }
}))

describe('useGithubSync', () => {
    it('should export useGithubSync function', () => {
        expect(typeof useGithubSync).toBe('function')
    })
})
