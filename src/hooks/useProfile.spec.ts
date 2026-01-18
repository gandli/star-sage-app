import { describe, it, expect, vi } from 'vitest'
import { useProfile } from './useProfile'

// Mock Supabase
vi.mock('../lib/supabase', () => ({
    supabase: {
        auth: {
            getUser: vi.fn()
        },
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    single: vi.fn(() => Promise.resolve({ data: null, error: null }))
                }))
            })),
            upsert: vi.fn(() => Promise.resolve({ error: null }))
        }))
    }
}))

describe('useProfile', () => {
    it('should export useProfile function', () => {
        expect(typeof useProfile).toBe('function')
    })
})
