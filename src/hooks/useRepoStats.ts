import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface RepoStats {
    totalRepos: number;
    translatedRepos: number; // Count of repos with description_cn
    translationPercentage: number;
    loading: boolean;
    error: string | null;
}

import { queryCoalescer } from '../utils/supabase-coalescer';

export function useRepoStats(githubUser: string | null, refreshInterval: number = 30000) { // Default refresh every 30s
    const [stats, setStats] = useState<RepoStats>({
        totalRepos: 0,
        translatedRepos: 0,
        translationPercentage: 0,
        loading: true,
        error: null,
    });

    const fetchStats = async () => {
        if (!githubUser) return;

        setStats(prev => ({ ...prev, loading: true }));
        try {
            const data = await queryCoalescer.coalesce(`stats:${githubUser}`, async () => {
                // Get current user
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    return {
                        totalRepos: 0,
                        translatedRepos: 0,
                        translationPercentage: 0,
                    };
                }

                // Get Total Repos for this user (count of user_stars)
                const { count: total, error: totalError } = await supabase
                    .from('user_stars')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id)
                    .eq('github_user', githubUser);

                if (totalError) throw totalError;

                // Get Translated Repos (user_stars joined with repos where description_cn is not null)
                const { count: translated, error: translatedError } = await supabase
                    .from('user_stars')
                    .select('repos!inner(description_cn)', { count: 'exact', head: true })
                    .eq('user_id', user.id)
                    .eq('github_user', githubUser)
                    .not('repos.description_cn', 'is', null);

                if (translatedError) throw translatedError;

                const totalCount = total || 0;
                const translatedCount = translated || 0;

                let translationPercentage = 0;
                if (totalCount > 0) {
                    translationPercentage = Math.floor((translatedCount / totalCount) * 100);
                    if (translationPercentage === 100 && translatedCount < totalCount) {
                        translationPercentage = 99;
                    }
                }

                return {
                    totalRepos: totalCount,
                    translatedRepos: translatedCount,
                    translationPercentage,
                };
            });

            setStats({
                ...data,
                loading: false,
                error: null,
            });
        } catch (err: any) {
            console.error('[useRepoStats] Error fetching stats:', err);
            setStats(prev => ({ ...prev, loading: false, error: err.message }));
        }
    };

    useEffect(() => {
        fetchStats();

        // Optional: periodic refresh
        if (refreshInterval > 0) {
            const timer = setInterval(fetchStats, refreshInterval);
            return () => clearInterval(timer);
        }
    }, [refreshInterval, githubUser]);

    return { ...stats, refetch: fetchStats };
}
