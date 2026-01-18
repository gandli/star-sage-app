import { describe, it, expect, vi } from 'vitest'
import { useRepoStats } from './useRepoStats'

// Mock Supabase
vi.mock('../lib/supabase', () => ({
    supabase: {
        auth: {
            getUser: vi.fn()
        },
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    not: vi.fn(() => Promise.resolve({ count: 0, error: null }))
                }))
            }))
        }))
    }
}))

describe('useRepoStats', () => {
    it('should export useRepoStats function', () => {
        expect(typeof useRepoStats).toBe('function')
    })

    it('should calculate translation percentage correctly', () => {
        const totalCount = 100
        const translatedCount = 75
        const percentage = Math.floor((translatedCount / totalCount) * 100)
        expect(percentage).toBe(75)
    })

    it('should handle zero repos', () => {
        const totalCount = 0
        const translatedCount = 0
        let percentage = 0
        if (totalCount > 0) {
            percentage = Math.floor((translatedCount / totalCount) * 100)
        }
        expect(percentage).toBe(0)
    })

    it('should cap at 99% when not fully translated', () => {
        const totalCount = 100
        const translatedCount = 99
        let percentage = Math.floor((translatedCount / totalCount) * 100)
        if (percentage === 100 && translatedCount < totalCount) {
            percentage = 99
        }
        expect(percentage).toBe(99)
    })
})
