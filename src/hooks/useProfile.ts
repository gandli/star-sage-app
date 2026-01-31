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
                    .from('user_settings')
                    .select('*')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (error) throw error;
                return data;
            });

            // Map user_settings and user metadata to Profile interface
            const mappedProfile: Profile = {
                id: user.id,
                username: user.user_metadata?.user_name || user.user_metadata?.preferred_username || user.email?.split('@')[0] || null,
                full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
                avatar_url: user.user_metadata?.avatar_url || null,

                config_type: data?.github_token ? 'token' : (data?.github_username ? 'username' : null),
                config_value: data?.github_token || data?.github_username || null,
                resolved_username: data?.github_token ? data?.github_username : null,
                settings: data?.preferences || {}
            };

            // Only update if content changed
            setProfile(prev => JSON.stringify(prev) === JSON.stringify(mappedProfile) ? prev : mappedProfile);
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
            // Get current preferences to merge
            const { data: currentSettings } = await supabase
                .from('user_settings')
                .select('preferences')
                .eq('user_id', user.id)
                .maybeSingle();

            const mergedSettings = {
                ...(currentSettings?.preferences || {}),
                ...settings
            };

            // Check if settings actually changed
            const settingsChanged = JSON.stringify(currentSettings?.preferences) !== JSON.stringify(mergedSettings);
            if (!settingsChanged) return;

            console.log('[useProfile] Settings changed, updating cloud...', mergedSettings);

            const { error } = await supabase
                .from('user_settings')
                .upsert({
                    user_id: user.id,
                    preferences: mergedSettings,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'user_id' });

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
            const payload: any = {
                user_id: user.id,
                updated_at: new Date().toISOString(),
            };

            if (config.type === 'token') {
                payload.github_token = config.value;
                payload.github_username = config.resolvedUsername;
            } else {
                payload.github_token = null;
                payload.github_username = config.value;
            }

            const { error } = await supabase
                .from('user_settings')
                .upsert(payload, { onConflict: 'user_id' });

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
