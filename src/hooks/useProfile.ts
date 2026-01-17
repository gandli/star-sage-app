import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { Config } from '../types';

export interface Profile {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
    config_type: 'username' | 'token' | null;
    config_value: string | null;
    resolved_username: string | null;
}

export function useProfile(user: User | null) {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchProfile = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();

            if (error) {
                throw error;
            } else {
                setProfile(data);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const updateCloudConfig = async (config: Config) => {
        if (!user) return;
        try {
            const { error } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    config_type: config.type,
                    config_value: config.value,
                    resolved_username: config.resolvedUsername,
                    updated_at: new Date().toISOString(),
                });

            if (error) throw error;

            // Local update
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

    return { profile, loading, error, updateCloudConfig, refreshProfile: fetchProfile };
}
