import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { queryCoalescer } from '../utils/supabase-coalescer';
import { db } from '../utils/db';

export interface RepoStats {
    totalRepos: number; // Supabase count
    translatedRepos: number; // Supabase count of repos with description_cn
    translationPercentage: number;
    githubCount: number; // GitHub actual count from sync probe
    localCount: number; // IndexedDB count
    loading: boolean;
    error: string | null;
}

export function useRepoStats(githubUser: string | null, refreshInterval: number = 30000) { // Default refresh every 30s
    const [stats, setStats] = useState<RepoStats>(() => {
        // Try to recover from localStorage for instant display
        const saved = localStorage.getItem(`gh_stats_summary:${githubUser}`);
        const githubTotal = parseInt(localStorage.getItem('gh_stars_total_count') || '0', 10);

        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                return {
                    ...parsed,
                    githubCount: githubTotal,
                    localCount: parsed.localCount || 0,
                    loading: false,
                    error: null
                };
            } catch (e) { /* ignore */ }
        }
        return {
            totalRepos: 0,
            translatedRepos: 0,
            translationPercentage: 0,
            githubCount: githubTotal,
            localCount: 0,
            loading: true,
            error: null,
        };
    });

    const fetchStats = useCallback(async () => {
        if (!githubUser) return;

        try {
            const data = await queryCoalescer.coalesce(`stats:${githubUser}`, async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return null;

                // 1. Get total from Supabase
                const { count: total, error: totalError } = await supabase
                    .from('user_stars')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id)
                    .eq('github_user', githubUser);

                if (totalError) throw totalError;

                // 2. Get translated count
                const { count: translated, error: translatedError } = await supabase
                    .from('user_stars')
                    .select('repos!inner(description_cn)', { count: 'exact', head: true })
                    .eq('user_id', user.id)
                    .eq('github_user', githubUser)
                    .not('repos.description_cn', 'is', null);

                if (translatedError) throw translatedError;

                // 3. Get total from IndexedDB
                const localRepos = await db.get('gh_stars_data') || [];
                const localCount = localRepos.length;

                // 4. Get total from GitHub (cached in localStorage by useGithubSync)
                const githubCount = parseInt(localStorage.getItem('gh_stars_total_count') || '0', 10);

                const totalCount = total || 0;
                const translatedCount = translated || 0;

                let translationPercentage = 0;
                if (totalCount > 0) {
                    translationPercentage = Math.floor((translatedCount / totalCount) * 100);
                    if (translationPercentage === 100 && translatedCount < totalCount) {
                        translationPercentage = 99;
                    }
                }

                const result = {
                    totalRepos: totalCount,
                    translatedRepos: translatedCount,
                    translationPercentage,
                    githubCount,
                    localCount
                };

                // Save to localStorage for next time's instant load
                localStorage.setItem(`gh_stats_summary:${githubUser}`, JSON.stringify(result));

                return result;
            });

            if (data) {
                setStats({
                    ...data,
                    loading: false,
                    error: null,
                });
            }
        } catch (err: any) {
            console.error('[useRepoStats] Error fetching stats:', err);
            setStats(prev => ({ ...prev, loading: false, error: err.message }));
        }
    }, [githubUser]);

    useEffect(() => {
        fetchStats();

        if (refreshInterval > 0) {
            const timer = setInterval(fetchStats, refreshInterval);
            return () => clearInterval(timer);
        }
    }, [refreshInterval, githubUser, fetchStats]);

    return { ...stats, refetch: fetchStats };
}
