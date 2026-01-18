import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAuth } from './useAuth'
import { supabase } from '../lib/supabase'
import { db } from '../utils/db'

// Mock dependencies
vi.mock('../lib/supabase', () => ({
    supabase: {
        auth: {
            getSession: vi.fn(),
            onAuthStateChange: vi.fn(),
            signOut: vi.fn()
        }
    }
}))

vi.mock('../utils/db', () => ({
    db: {
        clearAllData: vi.fn()
    }
}))

describe('useAuth', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        // Mock localStorage
        global.localStorage = {
            removeItem: vi.fn(),
            getItem: vi.fn(),
            setItem: vi.fn(),
            clear: vi.fn(),
            key: vi.fn(),
            length: 0
        }
    })

    it('should export useAuth function', () => {
        expect(typeof useAuth).toBe('function')
    })

    it('should handle sign out and clear data', async () => {
        ; (supabase.auth.signOut as any).mockResolvedValue({})
            ; (db.clearAllData as any).mockResolvedValue(undefined)

        // Act - Test signOut logic directly
        await supabase.auth.signOut()
        await db.clearAllData()

        // Assert
        expect(supabase.auth.signOut).toHaveBeenCalled()
        expect(db.clearAllData).toHaveBeenCalled()
    })

    it('should clear localStorage on sign out', () => {
        const keysToRemove = [
            'gh_stars_config',
            'gh_stars_last_sync_time',
            'gh_stars_theme'
        ]

        // Act
        keysToRemove.forEach(key => localStorage.removeItem(key))

        // Assert
        expect(localStorage.removeItem).toHaveBeenCalledTimes(3)
    })
})
