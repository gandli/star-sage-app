import { useState, useEffect, useCallback } from 'react';
import type { Config } from '../types';
import type { Session } from '@supabase/supabase-js';

export function useAppConfig(session: Session | null) {
    const [sessionMethodsCheck, setSessionMethodsCheck] = useState(false);

    // 🛡️ Sentinel: Helper to securely save config
    const persistConfig = useCallback((newConfig: Config) => {
        if (newConfig.type === 'token') {
            // Store sensitive token in sessionStorage only (cleared on tab close)
            sessionStorage.setItem('gh_stars_token', newConfig.value);

            // Save non-sensitive part to localStorage with sanitized value
            const safeConfig = { ...newConfig, value: '' };
            localStorage.setItem('gh_stars_config', JSON.stringify(safeConfig));
        } else {
            // For username type, value is public (username), safe to store
            localStorage.setItem('gh_stars_config', JSON.stringify(newConfig));
            // Clean up any stale token
            sessionStorage.removeItem('gh_stars_token');
        }
    }, []);

    const [config, setConfig] = useState<Config>(() => {
        const saved = localStorage.getItem('gh_stars_config');
        const base = saved ? JSON.parse(saved) : { type: 'username', value: '' };

        // 🛡️ Sentinel: Recover token from sessionStorage or migrate from legacy localStorage
        if (base.type === 'token') {
            const sessionToken = sessionStorage.getItem('gh_stars_token');
            if (sessionToken) {
                base.value = sessionToken;
            } else if (base.value) {
                // Migration: Found token in LS but not SS. Move it to SS for security.
                sessionStorage.setItem('gh_stars_token', base.value);

                // Immediately sanitize localStorage to remove the leaked token
                const safeBase = { ...base, value: '' };
                localStorage.setItem('gh_stars_config', JSON.stringify(safeBase));
            }
        }

        return { ...base, autoTranslate: true };
    });

    // Auto-configure with Provider Token
    useEffect(() => {
        if (session?.provider_token) {
            if (!config.value) {
                const newConfig: Config = {
                    type: 'token',
                    value: session.provider_token,
                    resolvedUsername: session.user.user_metadata.user_name || session.user.user_metadata.name
                };
                setConfig(newConfig);
                persistConfig(newConfig);
            }
        } else if (session && !config.value && !sessionMethodsCheck) {
            setSessionMethodsCheck(true);
        }
    }, [session, config.value, sessionMethodsCheck, persistConfig]);

    const saveConfig = (newConfig: Config) => {
        persistConfig(newConfig);
        setConfig(newConfig);
    };

    return { config, setConfig, saveConfig };
}
