import { useState, useEffect, useCallback } from 'react';
import type { Repo, Config, SyncProgress } from '../types';
import { starService } from '../services/StarDataService';

export function useGithubSync(config: Config) {
    const [repos, setRepos] = useState<Repo[]>([]);
    const [loading, setLoading] = useState(false);
    const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [languageStats, setLanguageStats] = useState<{ name: string; value: number }[]>([]);

    // Subscribe to service state
    useEffect(() => {
        const unsubscribe = starService.subscribe((state) => {
            setRepos(state.repos);
            setLoading(state.loading);
            setSyncProgress(state.syncProgress);
            setError(state.error);
            setLanguageStats(state.stats.languageStats || []);
        });
        return unsubscribe;
    }, []);

    // Initialize logic
    useEffect(() => {
        if (config.value) {
            starService.initialize(config);
        }
    }, [config]);

    const fetchAllStars = useCallback((passedConfig: Config, isIncremental: boolean = false, startPage: number = 1) => {
        // Trigger manual sync via service
        // If passed config matches current hook config (by type and value), use passed one as it might be fresher (e.g. resolvedUsername)
        if (passedConfig.type === config.type && passedConfig.value === config.value) {
            starService.sync(passedConfig, isIncremental, startPage);
        } else {
            // Fallback to hook's config if mismatch
            starService.sync(config, isIncremental, startPage);
        }
    }, [config]);

    return { repos, loading, syncProgress, error, setError, fetchAllStars, languageStats };
}
