import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useTranslationStatus } from './useTranslationStatus'

// Mock AutoTranslator
const mockSubscribe = vi.fn()
vi.mock('../services/AutoTranslator', () => ({
    autoTranslator: {
        subscribe: mockSubscribe
    }
}))

describe('useTranslationStatus', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should export useTranslationStatus function', () => {
        expect(typeof useTranslationStatus).toBe('function')
    })

    it('should subscribe to autoTranslator', () => {
        mockSubscribe.mockReturnValue(() => { })
        const mockCallback = vi.fn()
        const unsubscribe = mockSubscribe(mockCallback)
        expect(typeof unsubscribe).toBe('function')
    })

    it('should provide unsubscribe function', () => {
        const mockUnsubscribe = vi.fn()
        mockSubscribe.mockReturnValue(mockUnsubscribe)
        const unsubscribe = mockSubscribe(() => { })
        unsubscribe()
        expect(mockUnsubscribe).toHaveBeenCalled()
    })
})
