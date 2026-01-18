import { useState, useEffect, useCallback } from 'react';
import type { Repo, Config, SyncProgress } from '../types';
import { starService } from '../services/StarDataService';

export function useGithubSync(config: Config) {
    const [repos, setRepos] = useState<Repo[]>([]);
    const [loading, setLoading] = useState(false);
    const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Subscribe to service state
    useEffect(() => {
        const unsubscribe = starService.subscribe((state) => {
            setRepos(state.repos);
            setLoading(state.loading);
            setSyncProgress(state.syncProgress);
            setError(state.error);
        });
        return unsubscribe;
    }, []);

    // Initialize logic
    useEffect(() => {
        if (config.value) {
            starService.initialize(config);
        }
    }, [config.type, config.value, config.resolvedUsername]);

    const fetchAllStars = useCallback((_config: Config, isIncremental: boolean = false, startPage: number = 1) => {
        // Trigger manual sync via service
        // Ignoring config arg here as service tracks current config, 
        // but robustly strictly we should use the passed config if it matches current.
        starService.sync(config, isIncremental, startPage);
    }, [config]);

    return { repos, loading, syncProgress, error, setError, fetchAllStars };
}
