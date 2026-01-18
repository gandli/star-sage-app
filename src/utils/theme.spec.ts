import { describe, it, expect } from 'vitest'
import { cn, getLanguageColor, THEME_VARS, CHART_PALETTE } from './theme'

describe('theme utils', () => {
    describe('cn', () => {
        it('should merge class names', () => {
            // Act
            const result = cn('foo', 'bar')

            // Assert
            expect(result).toBe('foo bar')
        })

        it('should handle conditional classes', () => {
            // Act
            const result = cn('foo', false && 'bar', 'baz')

            // Assert
            expect(result).toBe('foo baz')
        })

        it('should merge Tailwind classes correctly', () => {
            // Act
            const result = cn('px-2 py-1', 'px-4')

            // Assert
            expect(result).toBe('py-1 px-4')
        })
    })

    describe('getLanguageColor', () => {
        it('should return correct color for JavaScript', () => {
            // Act
            const result = getLanguageColor('JavaScript')

            // Assert
            expect(result).toBe('#f7df1e')
        })

        it('should return correct color for TypeScript', () => {
            // Act
            const result = getLanguageColor('TypeScript')

            // Assert
            expect(result).toBe('#3178c6')
        })

        it('should be case insensitive', () => {
            // Act
            const result1 = getLanguageColor('PYTHON')
            const result2 = getLanguageColor('python')

            // Assert
            expect(result1).toBe('#3776ab')
            expect(result2).toBe('#3776ab')
        })

        it('should return default color for unknown language', () => {
            // Act
            const result = getLanguageColor('UnknownLang')

            // Assert
            expect(result).toBe('#8b949e')
        })

        it('should handle empty string', () => {
            // Act
            const result = getLanguageColor('')

            // Assert
            expect(result).toBe('#8b949e')
        })
    })

    describe('THEME_VARS', () => {
        it('should have all required theme variables', () => {
            // Assert
            expect(THEME_VARS).toHaveProperty('bg')
            expect(THEME_VARS).toHaveProperty('sidebar')
            expect(THEME_VARS).toHaveProperty('textPrimary')
            expect(THEME_VARS).toHaveProperty('border')
        })

        it('should use CSS variables', () => {
            // Assert
            expect(THEME_VARS.bg).toContain('var(')
            expect(THEME_VARS.textPrimary).toContain('var(')
        })
    })

    describe('CHART_PALETTE', () => {
        it('should have 6 colors', () => {
            // Assert
            expect(CHART_PALETTE).toHaveLength(6)
        })

        it('should contain valid hex colors', () => {
            // Assert
            CHART_PALETTE.forEach(color => {
                expect(color).toMatch(/^#[0-9a-f]{6}$/i)
            })
        })
    })
})
