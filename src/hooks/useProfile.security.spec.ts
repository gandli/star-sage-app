import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useProfile } from './useProfile'

// Use vi.hoisted to create the mock object that can be referenced in vi.mock
const mocks = vi.hoisted(() => ({
    supabase: {
        auth: {
            getUser: vi.fn()
        },
        from: vi.fn()
    }
}));

vi.mock('../lib/supabase', () => ({
    supabase: mocks.supabase
}))

// Mock queryCoalescer
vi.mock('../utils/supabase-coalescer', () => ({
    queryCoalescer: {
        coalesce: vi.fn((key, callback) => callback())
    }
}))

describe('useProfile Security', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.supabase.from.mockReturnValue({
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
                })
            }),
            upsert: vi.fn().mockResolvedValue({ error: null })
        });
    });

    it('should NOT upload token to cloud when updating config', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const user = { id: 'user-123' } as any;
        const { result } = renderHook(() => useProfile(user));

        const upsertSpy = vi.fn().mockResolvedValue({ error: null });
        mocks.supabase.from.mockReturnValue({
            upsert: upsertSpy
        });

        await act(async () => {
            await result.current.updateCloudConfig({
                type: 'token',
                value: 'ghp_SECRET_TOKEN',
                resolvedUsername: 'testuser'
            });
        });

        expect(upsertSpy).toHaveBeenCalledTimes(1);
        const callArgs = upsertSpy.mock.calls[0][0];

        // 🛡️ Sentinel: Expect redaction
        expect(callArgs.config_value).toBeNull();
        expect(callArgs.config_type).toBe('token');
        expect(callArgs.resolved_username).toBe('testuser');
    });

    it('should upload username to cloud when updating config', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const user = { id: 'user-123' } as any;
        const { result } = renderHook(() => useProfile(user));

        const upsertSpy = vi.fn().mockResolvedValue({ error: null });
        mocks.supabase.from.mockReturnValue({
            upsert: upsertSpy
        });

        await act(async () => {
            await result.current.updateCloudConfig({
                type: 'username',
                value: 'publicuser',
                resolvedUsername: 'publicuser'
            });
        });

        expect(upsertSpy).toHaveBeenCalledTimes(1);
        const callArgs = upsertSpy.mock.calls[0][0];
        expect(callArgs.config_value).toBe('publicuser');
        expect(callArgs.config_type).toBe('username');
    });
});
