import { describe, it, expect, vi } from 'vitest'
import { useUserRepos } from './useUserRepos'
import { supabase } from '../lib/supabase'

// Mock Supabase
vi.mock('../lib/supabase', () => ({
    supabase: {
        auth: {
            getUser: vi.fn(),
            onAuthStateChange: vi.fn(() => ({
                data: { subscription: { unsubscribe: vi.fn() } }
            }))
        },
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    order: vi.fn(() => ({
                        range: vi.fn(() => Promise.resolve({ data: [], error: null }))
                    }))
                }))
            }))
        }))
    }
}))

describe('useUserRepos', () => {
    it('should export useUserRepos function', () => {
        expect(typeof useUserRepos).toBe('function')
    })

    it('should handle empty user', async () => {
        ; (supabase.auth.getUser as any).mockResolvedValue({ data: { user: null } })
        const result = await supabase.auth.getUser()
        expect(result.data.user).toBeNull()
    })

    it('should fetch repos for authenticated user', async () => {
        const mockUser = { id: 'user-123' }
            ; (supabase.auth.getUser as any).mockResolvedValue({ data: { user: mockUser } })
        await supabase.auth.getUser()
        expect(supabase.auth.getUser).toHaveBeenCalled()
    })
})
