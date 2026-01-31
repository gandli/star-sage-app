import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useProfile } from './useProfile'

const mockUser = {
    id: 'test-user-id',
    email: 'testuser@example.com',
    user_metadata: {
        full_name: 'Test User',
        avatar_url: 'https://example.com/avatar.png'
    }
}

const { mockFrom, mockSelect, mockUpsert } = vi.hoisted(() => {
    const mockSelect = vi.fn()
    const mockUpsert = vi.fn()
    const mockFrom = vi.fn(() => ({
        select: mockSelect,
        upsert: mockUpsert
    }))
    return { mockFrom, mockSelect, mockUpsert }
})

// Mock Supabase
vi.mock('../lib/supabase', () => ({
    supabase: {
        auth: {
            getUser: vi.fn(),
            onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }))
        },
        from: mockFrom
    }
}))

// Mock queryCoalescer to just run the query
vi.mock('../utils/supabase-coalescer', () => ({
    queryCoalescer: {
        coalesce: vi.fn((key, fn) => fn())
    }
}))

describe('useProfile', () => {
    it('should fetch profile from user_settings', async () => {
        // Mock successful fetch from user_settings
        mockSelect.mockReturnValue({
            eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                        user_id: 'test-user-id',
                        github_token: 'ghp_token123',
                        github_username: 'testuser',
                        preferences: { theme: 'dark' }
                    },
                    error: null
                })
            })
        })

        const { result } = renderHook(() => useProfile(mockUser as any))

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        // Verify it called the correct table
        expect(mockFrom).toHaveBeenCalledWith('user_settings')

        // Verify data mapping
        expect(result.current.profile).toEqual({
            id: 'test-user-id',
            username: 'testuser', // Derived from email
            full_name: 'Test User',
            avatar_url: 'https://example.com/avatar.png',
            config_type: 'token',
            config_value: 'ghp_token123',
            resolved_username: 'testuser',
            settings: { theme: 'dark' }
        })
    })

    it('should handle missing user_settings (first login)', async () => {
        // Mock empty fetch
        mockSelect.mockReturnValue({
            eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                    data: null,
                    error: null
                })
            })
        })

        const { result } = renderHook(() => useProfile(mockUser as any))

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        expect(result.current.profile).toEqual({
            id: 'test-user-id',
            username: 'testuser',
            full_name: 'Test User',
            avatar_url: 'https://example.com/avatar.png',
            config_type: null,
            config_value: null,
            resolved_username: null,
            settings: {}
        })
    })
})
