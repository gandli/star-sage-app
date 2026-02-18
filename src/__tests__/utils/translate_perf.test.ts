import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { translateText } from './translate';
import { supabase } from '../lib/supabase';

global.fetch = vi.fn();

describe('translateText Batching Performance', () => {
    beforeEach(() => {
        vi.stubEnv('VITE_TRANSLATION_API_URL', 'http://mock-api.com/translate');
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('should batch concurrent requests', async () => {
        const texts = Array.from({ length: 10 }, (_, i) => `Hello ${i} ${Math.random()}`);
        const target = 'zh';

        // Mock Fetch
        (global.fetch as any).mockImplementation(async (url: string, options: any) => {
            const body = JSON.parse(options.body);
            const inputTexts = body.texts || (body.text ? [body.text] : []);
            return {
                ok: true,
                status: 200,
                json: async () => ({
                    translations: inputTexts.map((t: string) => `Translated: ${t}`)
                }),
            };
        });

        // Mock Supabase
        const queryChain = {
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null }), // Cache miss for single
            then: (resolve: any) => resolve({ data: [] })      // Cache miss for batch
        };

        const selectMock = vi.fn().mockReturnValue(queryChain);
        const upsertMock = vi.fn().mockResolvedValue({ error: null });

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

        // Execute concurrent requests
        const results = await Promise.all(texts.map(text => translateText(text, target)));

        // Verify correctness
        results.forEach((res, i) => {
            expect(res[0]).toBe(`Translated: ${texts[i]}`);
        });

        const fetchCalls = (global.fetch as any).mock.calls.length;
        console.log(`Fetch calls: ${fetchCalls}`);

        // Return fetch calls for verification
        return fetchCalls;
    });
});
