import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { User } from '@supabase/supabase-js';
import { useProfile } from './useProfile';

// Mock Supabase
const mockUpsert = vi.fn(() => Promise.resolve({ error: null }));
const mockSelect = vi.fn(() => ({
    eq: vi.fn(() => ({
        maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
    }))
}));

vi.mock('../lib/supabase', () => ({
    supabase: {
        auth: {
            getUser: vi.fn()
        },
        from: vi.fn(() => ({
            select: mockSelect,
            upsert: mockUpsert
        }))
    }
}));

// Mock queryCoalescer
vi.mock('../utils/supabase-coalescer', () => ({
    queryCoalescer: {
        coalesce: vi.fn((key, fn) => fn())
    }
}));

describe('useProfile Security', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should NOT upload token to cloud storage', async () => {
        const mockUser = { id: 'test-user-id' } as User;
        const { result } = renderHook(() => useProfile(mockUser));

        const sensitiveConfig = {
            type: 'token' as const,
            value: 'ghp_SECRET_TOKEN_123',
            resolvedUsername: 'test-user'
        };

        await act(async () => {
            await result.current.updateCloudConfig(sensitiveConfig);
        });

        expect(mockUpsert).toHaveBeenCalled();
        const calledArg = mockUpsert.mock.calls[0][0];

        // This assertion verifies the FIX. Before fix, it would be 'ghp_SECRET_TOKEN_123'
        expect(calledArg.config_value).toBeNull();
    });

    it('should upload username config correctly', async () => {
        const mockUser = { id: 'test-user-id' } as User;
        const { result } = renderHook(() => useProfile(mockUser));

        const publicConfig = {
            type: 'username' as const,
            value: 'public-user',
            resolvedUsername: 'public-user'
        };

        await act(async () => {
            await result.current.updateCloudConfig(publicConfig);
        });

        expect(mockUpsert).toHaveBeenCalled();
        const calledArg = mockUpsert.mock.calls[0][0];

        expect(calledArg.config_value).toBe('public-user');
    });
});
