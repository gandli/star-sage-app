import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProfile } from './useProfile';
import type { User } from '@supabase/supabase-js';

// Mock Supabase
const upsertSpy = vi.fn(() => Promise.resolve({ error: null }));

vi.mock('../lib/supabase', () => ({
    supabase: {
        auth: {
            getUser: vi.fn()
        },
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
                }))
            })),
            upsert: upsertSpy
        }))
    }
}));

describe('useProfile Security', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should NOT sync sensitive token to cloud profile', async () => {
        const mockUser = { id: 'user-123' } as User;
        const { result } = renderHook(() => useProfile(mockUser));

        const sensitiveConfig = {
            type: 'token' as const,
            value: 'ghp_secret_token_DO_NOT_LEAK',
            resolvedUsername: 'jules'
        };

        await act(async () => {
            await result.current.updateCloudConfig(sensitiveConfig);
        });

        expect(upsertSpy).toHaveBeenCalledWith(expect.objectContaining({
            id: 'user-123',
            config_type: 'token',
            config_value: null, // THIS IS WHAT WE WANT TO ENFORCE
            resolved_username: 'jules'
        }));
    });

    it('should sync non-sensitive username config', async () => {
        const mockUser = { id: 'user-123' } as User;
        const { result } = renderHook(() => useProfile(mockUser));

        const publicConfig = {
            type: 'username' as const,
            value: 'jules-public',
            resolvedUsername: 'jules-public'
        };

        await act(async () => {
            await result.current.updateCloudConfig(publicConfig);
        });

        expect(upsertSpy).toHaveBeenCalledWith(expect.objectContaining({
            id: 'user-123',
            config_type: 'username',
            config_value: 'jules-public', // Safe to sync
            resolved_username: 'jules-public'
        }));
    });
});
