import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { translationBatcher } from '../utils/translationBatcher';
import * as translateUtils from '../utils/translate';
import { db } from '../utils/db';

// Mock dependencies
vi.mock('../utils/translate', () => ({
    translateBatch: vi.fn(),
}));

vi.mock('../utils/db', () => ({
    db: {
        saveBatchTranslations: vi.fn(),
    },
}));

describe('TranslationBatcher', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should batch multiple requests into a single call', async () => {
        const translateBatchMock = vi.mocked(translateUtils.translateBatch);
        // Provide mock implementation
        translateBatchMock.mockImplementation(async (texts) => {
            return texts.map(t => `Translated: ${t}`);
        });

        const p1 = translationBatcher.enqueue(1, 'Hello');
        const p2 = translationBatcher.enqueue(2, 'World');
        const p3 = translationBatcher.enqueue(3, 'Foo');

        // Initially no call should be made
        expect(translateBatchMock).not.toHaveBeenCalled();

        // Advance timers to trigger flush
        vi.advanceTimersByTime(200);

        // Wait for promises to resolve
        const results = await Promise.all([p1, p2, p3]);

        // Verify single call
        expect(translateBatchMock).toHaveBeenCalledTimes(1);
        expect(translateBatchMock).toHaveBeenCalledWith(['Hello', 'World', 'Foo']);

        // Verify results
        expect(results).toEqual(['Translated: Hello', 'Translated: World', 'Translated: Foo']);

        // Verify DB save
        expect(db.saveBatchTranslations).toHaveBeenCalledTimes(1);
        expect(db.saveBatchTranslations).toHaveBeenCalledWith([
            { repoId: 1, translation: 'Translated: Hello' },
            { repoId: 2, translation: 'Translated: World' },
            { repoId: 3, translation: 'Translated: Foo' },
        ]);
    });

    it('should deduplicate requests for the same repo ID', async () => {
        const translateBatchMock = vi.mocked(translateUtils.translateBatch);
        translateBatchMock.mockImplementation(async (texts) => {
             return texts.map(t => `Translated: ${t}`);
        });

        const p1 = translationBatcher.enqueue(1, 'Hello');
        const p2 = translationBatcher.enqueue(1, 'Hello'); // Duplicate ID

        vi.advanceTimersByTime(200);

        const results = await Promise.all([p1, p2]);

        expect(translateBatchMock).toHaveBeenCalledTimes(1);
        // Should only have one text in the call
        expect(translateBatchMock).toHaveBeenCalledWith(['Hello']);

        expect(results).toEqual(['Translated: Hello', 'Translated: Hello']);
    });
});
