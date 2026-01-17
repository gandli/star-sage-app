import { useState, useCallback, useEffect } from 'react';
import type { Repo, Config, SyncProgress } from '../types';
import { db } from '../utils/db';

const MAX_PAGES = 100;

export function useGithubSync(config: Config) {
    const [repos, setRepos] = useState<Repo[]>([]);
    const [loading, setLoading] = useState(false);
    const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchAllStars = useCallback(async (targetConfig: Config) => {
        if (!targetConfig.value.trim()) return;
        setLoading(true);
        setSyncProgress({ current: 0, total: 0 });
        setError(null);
        try {
            const headers: HeadersInit = { 'Accept': 'application/vnd.github.v3.star+json' };
            let username = targetConfig.value;

            if (targetConfig.type === 'token') {
                headers['Authorization'] = `Bearer ${targetConfig.value}`;

                const userRes = await fetch('https://api.github.com/user', { headers });
                if (userRes.ok) {
                    const userData = await userRes.json();
                    if (userData.login) {
                        username = userData.login;
                        localStorage.setItem('gh_stars_config', JSON.stringify({
                            type: 'token',
                            value: targetConfig.value,
                            resolvedUsername: userData.login
                        }));
                    }
                }
            }

            let allFetchedRepos: Repo[] = [];
            let page = 1;
            let hasMore = true;

            const savedConfig = localStorage.getItem('gh_stars_config');
            const parsedConfig = savedConfig ? JSON.parse(savedConfig) : null;
            if (!parsedConfig || parsedConfig.value !== targetConfig.value || parsedConfig.type !== targetConfig.type) {
                setRepos([]);
            }

            while (hasMore && page <= MAX_PAGES) {
                const url = targetConfig.type === 'username'
                    ? `https://api.github.com/users/${username}/starred?per_page=100&page=${page}`
                    : `https://api.github.com/user/starred?per_page=100&page=${page}`;

                const response = await fetch(url, { headers });
                if (!response.ok) {
                    if (response.status === 401 || response.status === 403) {
                        throw new Error(targetConfig.type === 'token' ? 'TOKEN_INVALID' : 'AUTH_REQUIRED');
                    }
                    throw new Error(`SYNC_FAILED_${response.status}`);
                }

                const data = await response.json();
                if (data.length === 0) {
                    if (page === 1) throw new Error(targetConfig.type === 'username' ? 'NO_PUBLIC_DATA' : 'NO_DATA');
                    hasMore = false;
                } else {
                    const minifiedData = data.map((r: any) => ({
                        id: r.repo.id,
                        name: r.repo.name,
                        full_name: r.repo.full_name,
                        html_url: r.repo.html_url,
                        stargazers_count: r.repo.stargazers_count,
                        updated_at: r.repo.pushed_at || r.repo.updated_at,
                        topics: r.repo.topics || [],
                        language: r.repo.language,
                        description: r.repo.description,
                        starred_at: r.starred_at,
                        owner: { avatar_url: r.repo.owner.avatar_url, login: r.repo.owner.login }
                    }));

                    allFetchedRepos = [...allFetchedRepos, ...minifiedData];
                    if (page % 2 === 0 || data.length < 100) {
                        setRepos([...allFetchedRepos]);
                    }

                    setSyncProgress({ current: page, total: allFetchedRepos.length });
                    if (data.length < 100) hasMore = false;
                    page++;
                }
            }
            setRepos([...allFetchedRepos]);
            await db.set('gh_stars_data', allFetchedRepos);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
            setSyncProgress(null);
        }
    }, []);

    useEffect(() => {
        const loadCachedData = async () => {
            try {
                const cached = await db.get('gh_stars_data');
                if (cached) setRepos(cached);
                else if (config.value) fetchAllStars(config);
            } catch (e) {
                if (config.value) fetchAllStars(config);
            }
        };
        loadCachedData();
    }, []);

    return { repos, loading, syncProgress, error, setError, fetchAllStars };
}
