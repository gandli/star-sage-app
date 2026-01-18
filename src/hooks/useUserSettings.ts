import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface UserSettings {
    id?: string;
    user_id?: string;
    github_token: string | null;
    github_username: string | null;
    preferences: Record<string, any>;
    created_at?: string;
    updated_at?: string;
}

export function useUserSettings() {
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load settings from Supabase
    const loadSettings = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                setSettings(null);
                setLoading(false);
                return;
            }

            const { data, error: fetchError } = await supabase
                .from('user_settings')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (fetchError) {
                // If no settings exist, create default
                if (fetchError.code === 'PGRST116') {
                    const defaultSettings: UserSettings = {
                        github_token: null,
                        github_username: null,
                        preferences: {},
                    };

                    const { data: newData, error: insertError } = await supabase
                        .from('user_settings')
                        .insert({
                            user_id: user.id,
                            ...defaultSettings,
                        })
                        .select()
                        .single();

                    if (insertError) throw insertError;
                    setSettings(newData);
                } else {
                    throw fetchError;
                }
            } else {
                setSettings(data);
            }

            setError(null);
        } catch (err: any) {
            console.error('[useUserSettings] Error loading settings:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Save settings to Supabase
    const saveSettings = async (updates: Partial<UserSettings>) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No authenticated user');

            const { data, error: updateError } = await supabase
                .from('user_settings')
                .update(updates)
                .eq('user_id', user.id)
                .select()
                .single();

            if (updateError) throw updateError;

            setSettings(data);
            return { success: true, data };
        } catch (err: any) {
            console.error('[useUserSettings] Error saving settings:', err);
            setError(err.message);
            return { success: false, error: err.message };
        }
    };

    // Update specific preference
    const updatePreference = async (key: string, value: any) => {
        if (!settings) return { success: false, error: 'No settings loaded' };

        const newPreferences = {
            ...settings.preferences,
            [key]: value,
        };

        return saveSettings({ preferences: newPreferences });
    };

    useEffect(() => {
        loadSettings();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            loadSettings();
        });

        return () => subscription.unsubscribe();
    }, []);

    return {
        settings,
        loading,
        error,
        saveSettings,
        updatePreference,
        reload: loadSettings,
    };
}
