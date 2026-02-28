import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProfile } from './useProfile';
import { supabase } from '../lib/supabase';

// Mock Supabase
vi.mock('../lib/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
                }))
            })),
            upsert: vi.fn(() => Promise.resolve({ error: null }))
        }))
    },
    queryCoalescer: {
        coalesce: vi.fn((key, fn) => fn())
    }
}));

// Mock queryCoalescer
vi.mock('../utils/supabase-coalescer', () => ({
    queryCoalescer: {
        coalesce: vi.fn((key, fn) => fn())
    }
}));

describe('useProfile Security', () => {
    const mockUser = { id: 'test-user-id' } as any;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should NOT store token in plaintext in database', async () => {
        const { result } = renderHook(() => useProfile(mockUser));

        const sensitiveConfig = {
            type: 'token' as const,
            value: 'ghp_SECRET_TOKEN_12345',
            resolvedUsername: 'testuser'
        };

        await act(async () => {
            await result.current.updateCloudConfig(sensitiveConfig);
        });

        // Get the results of calls to supabase.from()
        const fromResults = vi.mocked(supabase.from).mock.results;
        // We expect at least one call (initial fetch) and one update call.
        // We need the one where upsert was called.

        let upsertCallPayload = null;
        let found = false;

        for (const res of fromResults) {
            if (res.type === 'return' && res.value.upsert.mock.calls.length > 0) {
                upsertCallPayload = res.value.upsert.mock.calls[0][0];
                found = true;
                break;
            }
        }

        expect(found).toBe(true);
        expect(upsertCallPayload).not.toBeNull();

        expect(upsertCallPayload).toEqual(expect.objectContaining({
            id: 'test-user-id',
            config_type: 'token',
            // This is what we expect AFTER the fix:
            config_value: null
        }));

        // Ensure the token is definitely NOT in the payload
        expect(upsertCallPayload.config_value).not.toBe('ghp_SECRET_TOKEN_12345');
    });

    it('should store username config values normally', async () => {
        const { result } = renderHook(() => useProfile(mockUser));

        const publicConfig = {
            type: 'username' as const,
            value: 'public-user',
            resolvedUsername: 'public-user'
        };

        await act(async () => {
            await result.current.updateCloudConfig(publicConfig);
        });

        const fromResults = vi.mocked(supabase.from).mock.results;

        let upsertCallPayload = null;
        let found = false;

        for (const res of fromResults) {
            if (res.type === 'return' && res.value.upsert.mock.calls.length > 0) {
                upsertCallPayload = res.value.upsert.mock.calls[0][0];
                found = true;
                break;
            }
        }

        expect(found).toBe(true);

        expect(upsertCallPayload).toEqual(expect.objectContaining({
            id: 'test-user-id',
            config_type: 'username',
            config_value: 'public-user'
        }));
    });
});
