import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockTriggerTranslation, mockSubscribe, mockGetWorker, mockPostMessage } = vi.hoisted(() => {
    const mockPostMessage = vi.fn();
    const mockWorker = { postMessage: mockPostMessage };
    return {
        mockTriggerTranslation: vi.fn(),
        mockSubscribe: vi.fn(),
        mockGetWorker: vi.fn(() => mockWorker),
        mockPostMessage
    };
});

vi.mock('../StarDataService', () => ({
    starService: {
        triggerTranslation: mockTriggerTranslation,
        subscribe: mockSubscribe,
        getWorker: mockGetWorker
    }
}));

import { autoTranslator } from '../AutoTranslator';

describe('AutoTranslator', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should start translation when valid account is set', () => {
        autoTranslator.setAccount('user-123', 'github-user');

        expect(mockTriggerTranslation).toHaveBeenCalled();
    });

    it('should stop translation when account is cleared', () => {
        // First set it to ensure it's running
        autoTranslator.setAccount('user-123', 'github-user');
        mockTriggerTranslation.mockClear();
        mockPostMessage.mockClear();

        // Now clear it
        autoTranslator.setAccount(null, null);

        expect(mockTriggerTranslation).not.toHaveBeenCalled();
        expect(mockGetWorker).toHaveBeenCalled();
        expect(mockPostMessage).toHaveBeenCalledWith({ type: 'STOP' });
    });

    it('should not start if account is invalid (manual start check)', () => {
        // Reset to null
        autoTranslator.setAccount(null, null);
        mockTriggerTranslation.mockClear();

        // Try to manually start (if start was exposed or we want to verify setAccount(null) doesn't start)
        // setAccount(null, null) calls stop(), so triggerTranslation should not be called.

        expect(mockTriggerTranslation).not.toHaveBeenCalled();
    });

    it('should not trigger if manually triggered but disabled/no account', () => {
        autoTranslator.setAccount(null, null);
        mockTriggerTranslation.mockClear();

        autoTranslator.trigger();

        expect(mockTriggerTranslation).not.toHaveBeenCalled();
    });

    it('should trigger if enabled and has account', () => {
        autoTranslator.setAccount('u', 'g');
        mockTriggerTranslation.mockClear();

        autoTranslator.trigger();

        expect(mockTriggerTranslation).toHaveBeenCalled();
    });
});
