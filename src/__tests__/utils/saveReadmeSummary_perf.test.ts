import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '../db';
import { supabase } from '../../lib/supabase';

describe('saveReadmeSummary Performance', () => {
    beforeEach(async () => {
        // Clear DB and mocks
        await db.clearAllData();
        vi.clearAllMocks();
    });

    it('should trigger Supabase update for each call (N+1 issue)', async () => {
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
            sync_status: 'synced' as const
        }));

        // Populate local DB
        await db.upsertRepos(repos);

        // Spy on supabase.from
        const updateSpy = vi.spyOn(supabase, 'from');

        // Simulate loop calling saveReadmeSummary
        for (const repo of repos) {
            await db.saveReadmeSummary(repo.id, `Summary for ${repo.id}`);
        }

        // Verify supabase.from was called N times
        expect(updateSpy).toHaveBeenCalledTimes(repoCount);
    });

    it('should NOT trigger Supabase update when skipCloudSync is true', async () => {
        const repoCount = 5;
        const repos = Array.from({ length: repoCount }, (_, i) => ({
            id: i + 100, // different IDs
            name: `repo-${i}`,
            full_name: `user/repo-${i}`,
            html_url: `http://github.com/user/repo-${i}`,
            stargazers_count: 10,
            owner: { login: 'user', avatar_url: '' },
            description: 'desc',
            updated_at: '2021-01-01',
            language: 'TS',
            topics: [],
            sync_status: 'synced' as const
        }));

        await db.upsertRepos(repos);

        const updateSpy = vi.spyOn(supabase, 'from');

        // Call with skipCloudSync = true
        for (const repo of repos) {
            await db.saveReadmeSummary(repo.id, `Summary for ${repo.id}`, true);
        }

        // Verify supabase.from was NOT called
        expect(updateSpy).not.toHaveBeenCalled();
    });
});
