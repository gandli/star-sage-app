import { useRef, useEffect } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { Config, Profile } from '../types';

interface AppState {
    theme: 'light' | 'dark';
    setTheme: (t: 'light' | 'dark') => void;
    activeView: 'overview' | 'list';
    setActiveView: (v: 'overview' | 'list') => void;
    sortOrder: 'starred_at' | 'updated_at' | 'stargazers_count' | 'name';
    setSortOrder: (o: 'starred_at' | 'updated_at' | 'stargazers_count' | 'name') => void;
    sortDirection: 'asc' | 'desc';
    setSortDirection: (d: 'asc' | 'desc') => void;
    selectedLanguage: string | null;
    setSelectedLanguage: (l: string | null) => void;
}

interface UseSettingsSyncProps {
    user: User | null;
    session: Session | null;
    profile: Profile | null;
    profileLoading: boolean;
    config: Config;
    setConfig: (c: Config) => void;
    updateCloudSettings: (settings: any) => Promise<void>;
    appState: AppState;
}

export function useSettingsSync({
    user,
    session,
    profile,
    profileLoading,
    config,
    setConfig,
    updateCloudSettings,
    appState
}: UseSettingsSyncProps) {
    const initialSettingsSynced = useRef(false);

    // Sync Cloud config & settings to Local
    useEffect(() => {
        if (profileLoading) return;

        // Config sync
        if (profile?.config_type && profile?.config_value) {
            const cloudConfig: Config = {
                type: profile.config_type as 'username' | 'token',
                value: profile.config_value,
                resolvedUsername: profile.resolved_username || undefined
            };
            if (!session?.provider_token && JSON.stringify(config) !== JSON.stringify(cloudConfig)) {
                setConfig(cloudConfig);
                localStorage.setItem('gh_stars_config', JSON.stringify(cloudConfig));
            }
        }

        // Settings sync
        if (profile?.settings && !initialSettingsSynced.current) {
            const s = profile.settings;
            const params = new URLSearchParams(window.location.search);

            if (s.theme && s.theme !== appState.theme) appState.setTheme(s.theme);

            if (!params.get('view') && s.activeView && s.activeView !== appState.activeView) {
                appState.setActiveView(s.activeView);
            }

            if (s.sortOrder && s.sortOrder !== appState.sortOrder) {
                appState.setSortOrder(s.sortOrder);
            }

            if (s.sortDirection && s.sortDirection !== appState.sortDirection) {
                appState.setSortDirection(s.sortDirection);
            }

            if (!params.get('lang') && s.selectedLanguage && s.selectedLanguage !== appState.selectedLanguage) {
                appState.setSelectedLanguage(s.selectedLanguage);
            }

            initialSettingsSynced.current = true;
        }
    }, [profile, profileLoading, session, config]);

    // Sync Local config & settings to Cloud
    useEffect(() => {
        if (!user) return;
        const timer = setTimeout(() => {
            const currentSettings = {
                theme: appState.theme,
                activeView: appState.activeView,
                sortOrder: appState.sortOrder,
                sortDirection: appState.sortDirection,
                selectedLanguage: appState.selectedLanguage
            };

            const settingsChanged = !profile?.settings ||
                Object.keys(currentSettings).some(key =>
                    currentSettings[key as keyof typeof currentSettings] !== profile.settings?.[key]
                );

            if (settingsChanged) {
                updateCloudSettings(currentSettings);
            }
        }, 3000);
        return () => clearTimeout(timer);
    }, [
        user,
        profile?.settings,
        updateCloudSettings,
        appState.theme,
        appState.activeView,
        appState.sortOrder,
        appState.sortDirection,
        appState.selectedLanguage
    ]);
}
