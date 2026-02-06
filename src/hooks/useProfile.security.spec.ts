import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useProfile } from './useProfile';

// Mock Supabase
const upsertMock = vi.fn(() => Promise.resolve({ error: null }));
const selectMock = vi.fn(() => ({
    eq: vi.fn(() => ({
        maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
    }))
}));

vi.mock('../lib/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: selectMock,
            upsert: upsertMock
        }))
    }
}));

describe('useProfile Security', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should NOT store token in plaintext in the cloud', async () => {
        const user = { id: 'user-123' } as any;
        const { result } = renderHook(() => useProfile(user));

        const tokenConfig = {
            type: 'token' as const,
            value: 'ghp_SECRET_TOKEN',
            resolvedUsername: 'testuser'
        };

        await result.current.updateCloudConfig(tokenConfig);

        const upsertCalls = upsertMock.mock.calls;
        expect(upsertCalls.length).toBeGreaterThan(0);

        const payload = upsertCalls[0][0];

        // Assert secure behavior: value should be null for tokens
        expect(payload).toEqual(expect.objectContaining({
            config_type: 'token',
            config_value: null,
            resolved_username: 'testuser'
        }));
    });

    it('should store username in the cloud', async () => {
        const user = { id: 'user-123' } as any;
        const { result } = renderHook(() => useProfile(user));

        const usernameConfig = {
            type: 'username' as const,
            value: 'testuser',
        };

        await result.current.updateCloudConfig(usernameConfig);

        const upsertCalls = upsertMock.mock.calls;
        expect(upsertCalls.length).toBeGreaterThan(0);

        const payload = upsertCalls[0][0];

        // Assert normal behavior: value should be stored for username
        expect(payload).toEqual(expect.objectContaining({
            config_type: 'username',
            config_value: 'testuser'
        }));
    });
});
