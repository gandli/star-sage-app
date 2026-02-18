import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppConfig } from './useAppConfig';
import type { Config } from '../types';

describe('useAppConfig', () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
        vi.clearAllMocks();
    });

    it('should initialize with default config if storage is empty', () => {
        const { result } = renderHook(() => useAppConfig(null));
        expect(result.current.config).toEqual({
            type: 'username',
            value: '',
            autoTranslate: true
        });
    });

    it('should load config from localStorage (username type)', () => {
        const config: Config = {
            type: 'username',
            value: 'jules',
            autoTranslate: false
        };
        localStorage.setItem('gh_stars_config', JSON.stringify(config));

        const { result } = renderHook(() => useAppConfig(null));
        // Note: The hook currently forces autoTranslate to true on init
        expect(result.current.config).toEqual({ ...config, autoTranslate: true });
    });

    it('should save token to sessionStorage and sanitized config to localStorage', () => {
        const { result } = renderHook(() => useAppConfig(null));

        const newConfig: Config = {
            type: 'token',
            value: 'ghp_secret123',
            resolvedUsername: 'jules'
        };

        act(() => {
            result.current.saveConfig(newConfig);
        });

        // Current state should reflect full config
        expect(result.current.config).toEqual(newConfig);

        // sessionStorage should have the token
        expect(sessionStorage.setItem).toHaveBeenCalledWith('gh_stars_token', 'ghp_secret123');
        expect(sessionStorage.getItem('gh_stars_token')).toBe('ghp_secret123');

        // localStorage should have sanitized config
        const savedLS = JSON.parse(localStorage.getItem('gh_stars_config') || '{}');
        expect(savedLS.type).toBe('token');
        expect(savedLS.value).toBe(''); // Sanitized!
        expect(savedLS.resolvedUsername).toBe('jules');
    });

    it('should load token from sessionStorage if present', () => {
        const safeConfig: Config = {
            type: 'token',
            value: '',
            resolvedUsername: 'jules'
        };
        localStorage.setItem('gh_stars_config', JSON.stringify(safeConfig));
        sessionStorage.setItem('gh_stars_token', 'ghp_secret123');

        const { result } = renderHook(() => useAppConfig(null));

        expect(result.current.config.type).toBe('token');
        expect(result.current.config.value).toBe('ghp_secret123');
        expect(result.current.config.resolvedUsername).toBe('jules');
    });

    it('should migrate legacy localStorage token to sessionStorage', () => {
        // Setup legacy state: token in localStorage, nothing in sessionStorage
        const legacyConfig: Config = {
            type: 'token',
            value: 'ghp_legacy_token',
            resolvedUsername: 'jules'
        };
        localStorage.setItem('gh_stars_config', JSON.stringify(legacyConfig));

        const { result } = renderHook(() => useAppConfig(null));

        // Should load correctly
        expect(result.current.config.value).toBe('ghp_legacy_token');

        // Should have migrated to sessionStorage
        expect(sessionStorage.setItem).toHaveBeenCalledWith('gh_stars_token', 'ghp_legacy_token');
    });

    it('should use provider_token from session and save securely', () => {
        const session: any = {
            provider_token: 'ghp_oauth_token',
            user: {
                user_metadata: {
                    user_name: 'jules_oauth'
                }
            }
        };

        const { result } = renderHook(() => useAppConfig(session));

        // Config should update
        expect(result.current.config.type).toBe('token');
        expect(result.current.config.value).toBe('ghp_oauth_token');
        expect(result.current.config.resolvedUsername).toBe('jules_oauth');

        // Should be saved securely
        expect(sessionStorage.setItem).toHaveBeenCalledWith('gh_stars_token', 'ghp_oauth_token');

        const savedLS = JSON.parse(localStorage.getItem('gh_stars_config') || '{}');
        expect(savedLS.value).toBe('');
    });
});
