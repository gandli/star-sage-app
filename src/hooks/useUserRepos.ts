import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Repo } from '../types';

export function useUserRepos() {
    const [repos, setRepos] = useState<Repo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchUserRepos = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                setRepos([]);
                setLoading(false);
                return;
            }

            // Fetch user's starred repos via JOIN
            const { data, error: fetchError } = await supabase
                .from('user_stars')
                .select(`
                    starred_at,
                    repos (
                        id,
                        name,
                        full_name,
                        html_url,
                        stargazers_count,
                        updated_at,
                        topics,
                        language,
                        description,
                        description_cn,
                        readme_summary,
                        owner
                    )
                `)
                .eq('user_id', user.id)
                .order('starred_at', { ascending: false })
                .range(0, 9999); // Fetch up to 10000 repos

            if (fetchError) throw fetchError;

            // Transform the data to match Repo type
            const transformedRepos: Repo[] = (data || []).map((item: any) => ({
                ...item.repos,
                starred_at: item.starred_at,
            }));

            setRepos(transformedRepos);
            setError(null);
        } catch (err: any) {
            console.error('[useUserRepos] Error fetching repos:', err);
            setError(err.message);
            setRepos([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUserRepos();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            fetchUserRepos();
        });

        return () => subscription.unsubscribe();
    }, []);

    return {
        repos,
        loading,
        error,
        refetch: fetchUserRepos,
    };
}
