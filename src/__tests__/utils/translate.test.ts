import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { translateText } from './translate';
import { supabase } from '../lib/supabase';

// Mock Fetch
global.fetch = vi.fn();

describe('translateText Performance', () => {
    beforeEach(() => {
        vi.stubEnv('VITE_TRANSLATION_API_URL', 'http://mock-api.com/translate');
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('should NOT be blocked by cache write', async () => {
        const text = 'Hello world ' + Math.random(); // Unique text to bypass memory cache
        const target = 'zh';
        const translatedText = '你好世界';

        // Mock Fetch Response
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ translations: [translatedText] }),
        });

        // Mock Supabase select (cache miss)
        const selectMock = vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(), // Added for batching support
            single: vi.fn().mockResolvedValue({ data: null }),
            then: (resolve: any) => resolve({ data: [] }), // Added for batching await support
        });

        // Mock Supabase upsert with delay
        const delayMs = 100;
        const upsertMock = vi.fn().mockImplementation(async () => {
            await new Promise(resolve => setTimeout(resolve, delayMs));
            return { error: null };
        });

        // Override the mock implementation for this test
        // We assume supabase.from is a mock function as per vitest.setup.ts
        if (vi.isMockFunction(supabase.from)) {
             supabase.from.mockImplementation((table: string) => {
                if (table === 'translations') {
                    return {
                        select: selectMock,
                        upsert: upsertMock,
                    } as any;
                }
                return {} as any;
            });
        } else {
            // Fallback if it's not a mock function (shouldn't happen with correct setup)
            vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
                if (table === 'translations') {
                    return {
                        select: selectMock,
                        upsert: upsertMock,
                    } as any;
                }
                return {} as any;
            });
        }

        const start = performance.now();
        const result = await translateText(text, target);
        const end = performance.now();
        const duration = end - start;

        expect(result).toEqual([translatedText]);

        // Expect duration to be significantly less than the delay (non-blocking)
        expect(duration).toBeLessThan(delayMs);
        console.log(`Duration: ${duration}ms`);

        // Wait for the background process to complete (optional, just to verify it runs)
        await new Promise(resolve => setTimeout(resolve, delayMs + 50));
        expect(upsertMock).toHaveBeenCalled();
    });
});
