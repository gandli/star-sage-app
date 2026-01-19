import { useState, useEffect } from 'react';
import type { Config } from '../types';
import type { Session } from '@supabase/supabase-js';

export function useAppConfig(session: Session | null) {
    const [sessionMethodsCheck, setSessionMethodsCheck] = useState(false);
    const [config, setConfig] = useState<Config>(() => {
        const saved = localStorage.getItem('gh_stars_config');
        const base = saved ? JSON.parse(saved) : { type: 'username', value: '' };
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
                localStorage.setItem('gh_stars_config', JSON.stringify(newConfig));
            }
        } else if (session && !config.value && !sessionMethodsCheck) {
            setSessionMethodsCheck(true);
        }
    }, [session, config.value, sessionMethodsCheck]);

    const saveConfig = (newConfig: Config) => {
        localStorage.setItem('gh_stars_config', JSON.stringify(newConfig));
        setConfig(newConfig);
    };

    return { config, setConfig, saveConfig };
}
