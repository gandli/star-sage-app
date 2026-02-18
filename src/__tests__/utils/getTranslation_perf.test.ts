import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '../db';
import { supabase } from '../../lib/supabase';

describe('getTranslation Performance', () => {
    beforeEach(async () => {
        // Clear DB and mocks
        await db.clearAllData();
        vi.clearAllMocks();
    });

    it('should batch concurrent Supabase requests (solve N+1 issue)', async () => {
        const repoCount = 5;
        const repos = Array.from({ length: repoCount }, (_, i) => ({
            id: i + 1,
            name: `repo-${i}`,
            full_name: `user/repo-${i}`,
            html_url: `http://github.com/user/repo-${i}`,
            stargazers_count: 10,
            owner: { login: 'user', avatar_url: '' },
            description: 'desc',
            updated_at: '2021-01-01',
            language: 'TS',
            topics: [],
            sync_status: 'synced' as const,
            description_cn: null // No translation initially
        }));

        // Populate local DB
        await db.upsertRepos(repos);

        // Mock Supabase to handle both single and batch requests
        const selectSpy = vi.fn();
        const eqSpy = vi.fn();
        const singleSpy = vi.fn();
        const inSpy = vi.fn();
        const notSpy = vi.fn();

        vi.spyOn(supabase, 'from').mockReturnValue({
            select: selectSpy.mockReturnValue({
                // Single lookup (old path - should not be called)
                eq: eqSpy.mockImplementation((col, val) => ({
                    single: singleSpy.mockResolvedValue({
                        data: { description_cn: `Translated ${val}` },
                        error: null
                    })
                })),
                // Batch lookup (new path)
                in: inSpy.mockReturnValue({
                   not: notSpy.mockImplementation(async () => {
                       const mockData = repos.map(r => ({
                           id: r.id,
                           description_cn: `Batch Translated ${r.id}`
                       }));
                       return {
                           data: mockData,
                           error: null
                       };
                   })
                })
            })
        } as any);

        // Simulate concurrent calls to getTranslation
        const results = await Promise.all(repos.map(repo => db.getTranslation(repo.id)));

        // Verify results
        results.forEach((res, i) => {
            expect(res).toBe(`Batch Translated ${i + 1}`);
        });

        // Verify optimization
        expect(inSpy).toHaveBeenCalledTimes(1);
        expect(singleSpy).toHaveBeenCalledTimes(0);
        expect(supabase.from).toHaveBeenCalledTimes(1);
    });

    it('should return null gracefully on Supabase error', async () => {
        const repoId = 999;

        // Mock Supabase to fail
        vi.spyOn(supabase, 'from').mockReturnValue({
            select: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({
                   not: vi.fn().mockRejectedValue(new Error('Supabase error'))
                })
            })
        } as any);

        const result = await db.getTranslation(repoId);
        expect(result).toBeNull();
    });
});
