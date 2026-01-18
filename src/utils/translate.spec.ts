import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { translateText } from './translate'

// Type declarations for test environment
declare global {
    var fetch: any
}

// Mock fetch API
global.fetch = vi.fn()

// Save original env
const originalEnv = { ...import.meta.env }

describe('translateText', () => {
    beforeEach(() => {
        // Setup environment
        import.meta.env.VITE_TRANSLATION_API_URL = 'https://api.example.com/translate'
        vi.clearAllMocks()
    })

    afterEach(() => {
        // Restore environment
        Object.assign(import.meta.env, originalEnv)
    })

    describe('Successful Translation', () => {
        it('should translate single text successfully', async () => {
            // Arrange
            const mockResponse = {
                translations: ['翻译结果'],
                source_lang: 'en',
                target_lang: 'zh',
            }
                ; (global.fetch as any).mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockResponse,
                })

            // Act
            const result = await translateText('Hello world', 'zh')

            // Assert
            expect(result).toEqual(['翻译结果'])
            expect(global.fetch).toHaveBeenCalledTimes(1)
            expect(global.fetch).toHaveBeenCalledWith(
                'https://api.example.com/translate',
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                })
            )
        })

        it('should translate multiple texts successfully', async () => {
            // Arrange
            const mockResponse = {
                translations: ['你好', '世界'],
            }
                ; (global.fetch as any).mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockResponse,
                })

            // Act
            const result = await translateText(['Hello', 'World'], 'zh')

            // Assert
            expect(result).toEqual(['你好', '世界'])
        })

        it('should use default target language zh', async () => {
            // Arrange
            ; (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ translations: ['结果'] }),
            })

            // Act
            await translateText('test')

            // Assert
            const callBody = JSON.parse((global.fetch as any).mock.calls[0][1].body)
            expect(callBody.target_lang).toBe('zh')
        })
    })

    describe('Error Handling', () => {
        it('should throw error on HTTP errors', async () => {
            // Arrange
            ; (global.fetch as any).mockResolvedValueOnce({
                ok: false,
                status: 400,
                text: async () => 'Bad Request',
            })

            // Act & Assert
            await expect(translateText('test', 'zh', 0)).rejects.toThrow(
                'Translation request failed (400)'
            )
            expect(global.fetch).toHaveBeenCalledTimes(1)
        })

        it('should handle invalid response format gracefully', async () => {
            // Arrange
            ; (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ invalid: 'format' }),
            })

            // Act
            const result = await translateText('test')

            // Assert
            expect(result).toEqual([])
        })

        it('should handle null translations in response', async () => {
            // Arrange
            ; (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ translations: null }),
            })

            // Act
            const result = await translateText('test')

            // Assert
            expect(result).toEqual([])
        })
    })

    describe('Edge Cases', () => {
        it('should handle empty string input', async () => {
            // Arrange
            ; (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ translations: [''] }),
            })

            // Act
            const result = await translateText('')

            // Assert
            expect(result).toEqual([''])
        })

        it('should handle empty array input', async () => {
            // Arrange
            ; (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ translations: [] }),
            })

            // Act
            const result = await translateText([])

            // Assert
            expect(result).toEqual([])
        })
    })
})
