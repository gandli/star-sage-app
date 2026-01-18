import { useState, useEffect } from 'react';
import { starService } from '../services/StarDataService';

export interface RepoStats {
    totalRepos: number;
    translatedRepos: number;
    translationPercentage: number;
    githubCount: number;
    localCount: number;
    loading: boolean;
    error: string | null;
}

export function useRepoStats(githubUser: string | null) {
    const [stats, setStats] = useState<RepoStats>({
        totalRepos: 0,
        translatedRepos: 0,
        translationPercentage: 0,
        githubCount: 0,
        localCount: 0,
        loading: true,
        error: null,
    });

    useEffect(() => {
        const updateStats = (dataState: any) => {
            const { stats: s } = dataState;

            // Calculate percentage based on Service's unified stats
            let pct = 0;
            const effectiveTotal = s.githubTotal || s.total;
            if (effectiveTotal > 0) {
                pct = Math.floor((s.translated / effectiveTotal) * 100);
            }
            if (s.translated >= effectiveTotal && effectiveTotal > 0) pct = 100;

            setStats({
                totalRepos: s.total,
                translatedRepos: s.translated,
                translationPercentage: Math.min(100, Math.max(0, pct)),
                githubCount: s.githubTotal,
                localCount: s.total, // In service model, repos in mem == local
                loading: dataState.loading,
                error: dataState.error
            });
        };

        // Initial fetch
        updateStats(starService.getState());

        const unsubscribe = starService.subscribe(updateStats);
        return unsubscribe;
    }, [githubUser]);

    return { ...stats, refetch: () => starService.sync(starService.getState().config || { type: 'username', value: githubUser || '' } as any, true) };
}
