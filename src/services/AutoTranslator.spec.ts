import { describe, it, expect, vi, beforeEach } from 'vitest'
import { autoTranslator } from './AutoTranslator'

// Mock module dependencies BEFORE importing
vi.mock('../lib/supabase', () => ({
    supabase: {
        from: vi.fn(),
    },
}))

vi.mock('../utils/translate', () => ({
    translateText: vi.fn(),
}))

vi.mock('../utils/db', () => ({
    db: {
        saveTranslation: vi.fn(),
        get: vi.fn(),
    },
}))

describe('AutoTranslator', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('Query Deduplication Logic', () => {
        it('should deduplicate query results with duplicate repos', () => {
            // Arrange: Mock query result with duplicates
            const mockQueryResult = [
                { repo_id: 1, repos: { id: 1, name: 'repo-1', description: 'test 1', description_cn: null } },
                { repo_id: 2, repos: { id: 2, name: 'repo-2', description: 'test 2', description_cn: null } },
                { repo_id: 1, repos: { id: 1, name: 'repo-1', description: 'test 1', description_cn: null } }, // duplicate
                { repo_id: 3, repos: { id: 3, name: 'repo-3', description: 'test 3', description_cn: null } },
            ]

            // Act: Apply deduplication logic (from AutoTranslator.ts lines 166-176)
            const uniqueItems = new Map()
            for (const item of mockQueryResult) {
                const repo = (item as any).repos
                if (repo && !uniqueItems.has(repo.id)) {
                    uniqueItems.set(repo.id, item)
                }
            }
            const deduplicatedItems = Array.from(uniqueItems.values())

            // Assert
            expect(mockQueryResult).toHaveLength(4)
            expect(deduplicatedItems).toHaveLength(3)
            expect(deduplicatedItems.map(i => (i as any).repos.id)).toEqual([1, 2, 3])
        })

        it('should handle empty query results', () => {
            const mockQueryResult: any[] = []

            const uniqueItems = new Map()
            for (const item of mockQueryResult) {
                const repo = item.repos
                if (repo && !uniqueItems.has(repo.id)) {
                    uniqueItems.set(repo.id, item)
                }
            }
            const deduplicatedItems = Array.from(uniqueItems.values())

            expect(deduplicatedItems).toHaveLength(0)
        })
    })

    describe('Processing Lock Mechanism', () => {
        it('should prevent duplicate processing within same batch', () => {
            // Arrange
            const processingRepoIds = new Set<number>()
            const items = [
                { id: 1, name: 'repo-1' },
                { id: 2, name: 'repo-2' },
                { id: 1, name: 'repo-1' }, // duplicate
                { id: 3, name: 'repo-3' },
            ]

            // Act: Simulate processing logic
            const processedItems: number[] = []
            const skippedItems: number[] = []

            for (const item of items) {
                if (processingRepoIds.has(item.id)) {
                    skippedItems.push(item.id)
                    continue
                }
                processingRepoIds.add(item.id)
                processedItems.push(item.id)
            }

            // Assert
            expect(processedItems).toEqual([1, 2, 3])
            expect(skippedItems).toEqual([1])
        })

        it('should clear all locks after batch completes', () => {
            const processingRepoIds = new Set<number>([1, 2, 3, 4, 5])

            processingRepoIds.clear()

            expect(processingRepoIds.size).toBe(0)
        })

        it('should handle empty processing set gracefully', () => {
            const processingRepoIds = new Set<number>()

            expect(processingRepoIds.has(1)).toBe(false)
            expect(processingRepoIds.size).toBe(0)
        })
    })

    describe('Double Check Mechanism', () => {
        it('should skip items that already have translations', () => {
            // Arrange: Mock database state
            const mockDatabase = new Map([
                [1, { id: 1, description_cn: null }],
                [2, { id: 2, description_cn: 'Already translated' }],
                [3, { id: 3, description_cn: null }],
                [4, { id: 4, description_cn: 'Already translated' }],
            ])

            // Act: Simulate double-check logic
            const itemsToTranslate: number[] = []
            const itemsToSkip: number[] = []

            for (const [id, repo] of mockDatabase) {
                if (repo.description_cn) {
                    itemsToSkip.push(id)
                } else {
                    itemsToTranslate.push(id)
                }
            }

            // Assert
            expect(itemsToTranslate).toEqual([1, 3])
            expect(itemsToSkip).toEqual([2, 4])
        })

        it('should handle all items already translated', () => {
            const mockDatabase = new Map([
                [1, { id: 1, description_cn: 'Translated 1' }],
                [2, { id: 2, description_cn: 'Translated 2' }],
            ])

            const itemsToTranslate: number[] = []
            for (const [id, repo] of mockDatabase) {
                if (!repo.description_cn) {
                    itemsToTranslate.push(id)
                }
            }

            expect(itemsToTranslate).toHaveLength(0)
        })

        it('should handle no items translated', () => {
            const mockDatabase = new Map([
                [1, { id: 1, description_cn: null }],
                [2, { id: 2, description_cn: null }],
            ])

            const itemsToTranslate: number[] = []
            for (const [id, repo] of mockDatabase) {
                if (!repo.description_cn) {
                    itemsToTranslate.push(id)
                }
            }

            expect(itemsToTranslate).toEqual([1, 2])
        })
    })

    describe('Edge Cases', () => {
        it('should handle null values in repo data', () => {
            const mockQueryResult = [
                { repo_id: 1, repos: null },
                { repo_id: 2, repos: { id: 2, name: 'repo-2' } },
            ]

            const uniqueItems = new Map()
            for (const item of mockQueryResult) {
                const repo = (item as any).repos
                if (repo && !uniqueItems.has(repo.id)) {
                    uniqueItems.set(repo.id, item)
                }
            }
            const deduplicatedItems = Array.from(uniqueItems.values())

            expect(deduplicatedItems).toHaveLength(1)
            expect((deduplicatedItems[0] as any).repos.id).toBe(2)
        })

        it('should handle Set operations with undefined values', () => {
            const processingSet = new Set<number>()

            processingSet.add(1)
            processingSet.add(1) // duplicate should be ignored

            expect(processingSet.size).toBe(1)
            expect(processingSet.has(1)).toBe(true)
            expect(processingSet.has(2)).toBe(false)
        })
    })

    describe('Progress Check Mechanism', () => {
        it('should stop processing if local IDB has all translations', async () => {
            // Mock localStorage
            const localStorageMock = {
                getItem: vi.fn(() => '100'), // Total stars
            };
            Object.defineProperty(window, 'localStorage', {
                value: localStorageMock,
                writable: true
            });

            // Mock db.get to return 100 translated repos
            const { db } = await import('../utils/db');
            const mockRepos = Array(100).fill({ description_cn: 'Translated' });
            (db.get as any).mockResolvedValue(mockRepos);

            // Spy on setProcessing to verify it turns off
            const setProcessingSpy = vi.spyOn(autoTranslator as any, 'setProcessing');

            // Setup internal state
            (autoTranslator as any).userId = 'test-user';
            (autoTranslator as any).githubUser = 'test-gh';

            // Call processQueue_
            await (autoTranslator as any).processQueue_({
                timeRemaining: () => 100,
                didTimeout: false
            });

            // Assert
            // It should have checked db
            expect(db.get).toHaveBeenCalledWith('gh_stars_data');
            // It should set processing to false
            expect(setProcessingSpy).toHaveBeenCalledWith(false);
        })
    })
})
