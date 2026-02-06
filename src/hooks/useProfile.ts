import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { Config, Profile } from '../types';

import { queryCoalescer } from '../utils/supabase-coalescer';

export function useProfile(user: User | null) {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchProfile = useCallback(async () => {
        if (!user) return;

        setLoading(true);
        try {
            const data = await queryCoalescer.coalesce(`profile:${user.id}`, async () => {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .maybeSingle();

                if (error) throw error;
                return data;
            });

            // Only update if content changed to prevent downstream effect avalanche
            setProfile(prev => JSON.stringify(prev) === JSON.stringify(data) ? prev : data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const updateCloudSettings = async (settings: Record<string, any>) => {
        if (!user) return;
        try {
            // Get current profile to merge settings
            const { data: currentProfile } = await supabase
                .from('profiles')
                .select('settings')
                .eq('id', user.id)
                .maybeSingle();

            const mergedSettings = {
                ...(currentProfile?.settings || {}),
                ...settings
            };

            // Check if settings actually changed
            const settingsChanged = JSON.stringify(currentProfile?.settings) !== JSON.stringify(mergedSettings);
            if (!settingsChanged) return;

            console.log('[useProfile] Settings changed, updating cloud...', mergedSettings);

            const { error } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    settings: mergedSettings,
                    updated_at: new Date().toISOString(),
                });

            if (error) throw error;

            setProfile(prev => prev ? {
                ...prev,
                settings: mergedSettings
            } : null);

        } catch (err: any) {
            console.error('Error updating cloud settings:', err.message);
            setError(err.message);
        }
    };

    const updateCloudConfig = async (config: Config) => {
        if (!user) return;
        try {
            const { error } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    config_type: config.type,
                    // 🛡️ Sentinel: Never store token in cloud!
                    config_value: config.type === 'token' ? null : config.value,
                    resolved_username: config.resolvedUsername,
                    updated_at: new Date().toISOString(),
                });

            if (error) throw error;

            setProfile(prev => prev ? {
                ...prev,
                config_type: config.type,
                config_value: config.value,
                resolved_username: config.resolvedUsername || null
            } : null);

        } catch (err: any) {
            console.error('Error updating cloud config:', err.message);
            setError(err.message);
        }
    };

    return { profile, loading, error, updateCloudConfig, updateCloudSettings, refreshProfile: fetchProfile };
}
