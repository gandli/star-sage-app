import { describe, it, expect, vi, beforeEach } from 'vitest';
import { starService } from '../StarDataService';
import { db } from '../../utils/db';
import { Config } from '../../types';

describe('StarDataService Breakpoint Resume', () => {
    const mockConfig: Config = { type: 'username', value: 'testuser' };
    const configId = 'username_testuser';

    beforeEach(async () => {
        vi.clearAllMocks();
        await db.clearAllData();
        // Reset service state if needed, assuming it's a singleton
    });

    it('should start sync from page 1 when no checkpoint exists', async () => {
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
            ok: true,
            json: () => Promise.resolve([]),
            headers: new Headers()
        } as Response);

        await starService.sync(mockConfig);

        expect(fetchSpy).toHaveBeenCalledWith(
            expect.stringContaining('page=1'),
            expect.any(Object)
        );
    });

    it('should resume sync from checkpoint page', async () => {
        // Set a checkpoint for page 5
        await db.setSyncCheckpoint(configId, 5);

        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
            ok: true,
            json: () => Promise.resolve([]),
            headers: new Headers()
        } as Response);

        await starService.sync(mockConfig);

        expect(fetchSpy).toHaveBeenCalledWith(
            expect.stringContaining('page=5'),
            expect.any(Object)
        );
    });

    it('should clear checkpoint upon successful full sync', async () => {
        await db.setSyncCheckpoint(configId, 3);

        vi.spyOn(global, 'fetch').mockResolvedValue({
            ok: true,
            json: () => Promise.resolve([{
                repo: {
                    id: 1,
                    name: 'test',
                    full_name: 'test/test',
                    owner: { login: 'user', avatar_url: '' },
                    stargazers_count: 0,
                    html_url: ''
                },
                starred_at: new Date().toISOString()
            }]), // Less than 100 items means end
            headers: new Headers()
        } as Response);

        await starService.sync(mockConfig);

        const checkpoint = await db.getSyncCheckpoint(configId);
        expect(checkpoint).toBeNull();
    });
});
