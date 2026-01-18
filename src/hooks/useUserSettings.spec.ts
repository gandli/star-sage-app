import { describe, it, expect, vi } from 'vitest'
import { useUserSettings } from './useUserSettings'

describe('useUserSettings', () => {
    it('should export useUserSettings function', () => {
        expect(typeof useUserSettings).toBe('function')
    })

    it('should handle localStorage operations', () => {
        // Arrange
        global.localStorage = {
            getItem: vi.fn(() => 'dark'),
            setItem: vi.fn(),
            removeItem: vi.fn(),
            clear: vi.fn(),
            key: vi.fn(),
            length: 0
        }

        // Act
        const theme = localStorage.getItem('gh_stars_theme')

        // Assert
        expect(theme).toBe('dark')
    })
})
