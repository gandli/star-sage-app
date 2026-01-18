import { describe, it, expect, vi, beforeEach } from 'vitest'
import { db } from './db'

// Mock Supabase
vi.mock('../lib/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            update: vi.fn(() => ({
                eq: vi.fn(() => ({
                    then: vi.fn((cb) => {
                        cb({ error: null })
                        return Promise.resolve()
                    })
                }))
            })),
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    single: vi.fn(() => Promise.resolve({ data: null, error: null }))
                }))
            }))
        }))
    }
}))

describe('db', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('saveTranslation', () => {
        it('should save translation to local store', async () => {
            // Arrange
            const repoId = 123
            const translation = '测试翻译'
            const existingRepos = [
                { id: 123, name: 'test-repo', description: 'original' },
                { id: 456, name: 'other-repo' }
            ]

            vi.spyOn(db, 'get').mockResolvedValue(existingRepos)
            vi.spyOn(db, 'set').mockResolvedValue(undefined)

            // Act
            await db.saveTranslation(repoId, translation)

            // Assert
            expect(db.set).toHaveBeenCalledWith(
                'gh_stars_data',
                expect.arrayContaining([
                    expect.objectContaining({
                        id: 123,
                        description: translation,
                        description_cn: translation
                    })
                ])
            )
        })

        it('should handle empty repos list', async () => {
            // Arrange
            vi.spyOn(db, 'get').mockResolvedValue([])
            vi.spyOn(db, 'set').mockResolvedValue(undefined)

            // Act
            await db.saveTranslation(999, 'translation')

            // Assert - should not crash
            expect(db.get).toHaveBeenCalled()
        })

        it('should handle null repos data', async () => {
            // Arrange
            vi.spyOn(db, 'get').mockResolvedValue(null)
            vi.spyOn(db, 'set').mockResolvedValue(undefined)

            // Act
            await db.saveTranslation(123, 'test')

            // Assert - should handle gracefully
            expect(db.get).toHaveBeenCalled()
        })
    })

    describe('getTranslation', () => {
        it('should return translation from local store', async () => {
            // Arrange
            const repos = [
                { id: 123, description_cn: '本地翻译' }
            ]

            vi.spyOn(db, 'internalGet').mockResolvedValue(repos)

            // Act
            const result = await db.getTranslation(123)

            // Assert
            expect(result).toBe('本地翻译')
        })

        it('should return null when translation not found', async () => {
            // Arrange
            vi.spyOn(db, 'internalGet').mockResolvedValue([])

            // Act
            const result = await db.getTranslation(999)

            // Assert
            expect(result).toBeNull()
        })

        it('should handle undefined repos data', async () => {
            // Arrange
            vi.spyOn(db, 'internalGet').mockResolvedValue(undefined)

            // Act
            const result = await db.getTranslation(123)

            // Assert
            expect(result).toBeNull()
        })
    })

    describe('saveReadmeSummary', () => {
        it('should save README summary to local store', async () => {
            // Arrange
            const repoId = 123
            const summary = 'README summary'
            const existingRepos = [
                { id: 123, name: 'test-repo' }
            ]

            vi.spyOn(db, 'get').mockResolvedValue(existingRepos)
            vi.spyOn(db, 'set').mockResolvedValue(undefined)

            // Act
            await db.saveReadmeSummary(repoId, summary)

            // Assert
            expect(db.set).toHaveBeenCalledWith(
                'gh_stars_data',
                expect.arrayContaining([
                    expect.objectContaining({
                        id: 123,
                        readme_summary: summary
                    })
                ])
            )
        })

        it('should handle repo not found', async () => {
            // Arrange
            vi.spyOn(db, 'get').mockResolvedValue([{ id: 999 }])
            vi.spyOn(db, 'set').mockResolvedValue(undefined)

            // Act
            await db.saveReadmeSummary(123, 'summary')

            // Assert - should not crash
            expect(db.get).toHaveBeenCalled()
        })
    })

    describe('Edge Cases', () => {
        it('should handle errors in saveTranslation gracefully', async () => {
            // Arrange
            vi.spyOn(db, 'get').mockRejectedValue(new Error('DB error'))

            // Act & Assert - should not throw
            await expect(db.saveTranslation(123, 'test')).resolves.toBeUndefined()
        })

        it('should handle errors in getTranslation gracefully', async () => {
            // Arrange
            vi.spyOn(db, 'internalGet').mockRejectedValue(new Error('DB error'))

            // Act
            const result = await db.getTranslation(123)

            // Assert - should return null on error
            expect(result).toBeNull()
        })
    })
})
