import { useState, useCallback, useEffect, useRef } from 'react';
import type { Repo, Config, SyncProgress } from '../types';
import { db } from '../utils/db';
import { supabase } from '../lib/supabase';
import { queryCoalescer } from '../utils/supabase-coalescer';

const MAX_PAGES = 100;

export function useGithubSync(config: Config, authToken?: string) {
    const [repos, setRepos] = useState<Repo[]>([]);
    const [loading, setLoading] = useState(false);
    const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
    const [error, setError] = useState<string | null>(null);

    // 跟踪上一次的配置，用于检测配置变化
    const lastConfigRef = useRef<Config | null>(null);
    // 同步锁与 ID，用于任务管理
    const syncLockRef = useRef(false);
    const currentSyncIdRef = useRef(0);
    // 跟踪是否已经初始化
    const initializedRef = useRef(false);

    const fetchAllStars = useCallback(async (targetConfig: Config, isIncremental: boolean = false, startPage: number = 1) => {
        if (!targetConfig.value.trim()) return;

        // 生成新任务 ID
        const syncId = ++currentSyncIdRef.current;
        syncLockRef.current = true;
        setLoading(true);
        setError(null);
        setSyncProgress({ current: 0, total: 0 });

        console.log(`[Sync] Starting task ${syncId} (Incremental: ${isIncremental}, Page: ${startPage})`);

        try {
            const headers: HeadersInit = { 'Accept': 'application/vnd.github.v3.star+json' };

            // Use provided authToken (from session) or config token
            const effectiveToken = targetConfig.type === 'token' ? targetConfig.value : authToken;
            if (effectiveToken) {
                headers['Authorization'] = `Bearer ${effectiveToken}`;
            }

            const username = targetConfig.resolvedUsername || targetConfig.value;
            // 解析最终展示的用户名 (Resolve early for Stage 1 Probe)
            let currentUsername = username;

            // --- 阶段 1: 轻量级探测 (Lightweight Probe) ---
            if (isIncremental && startPage === 1) {
                // 探测前检查一次
                if (syncId !== currentSyncIdRef.current) return;

                const probeUrl = targetConfig.type === 'username'
                    ? `https://api.github.com/users/${username}/starred?per_page=1`
                    : `https://api.github.com/user/starred?per_page=1`;

                const probeRes = await fetch(probeUrl, { headers });

                // 探测后检查一次
                if (syncId !== currentSyncIdRef.current) return;

                if (probeRes.ok) {
                    const linkHeader = probeRes.headers.get('Link');
                    let githubTotal = 0;
                    if (linkHeader) {
                        const lastPageMatch = linkHeader.match(/page=(\d+)>; rel="last"/);
                        if (lastPageMatch) {
                            githubTotal = parseInt(lastPageMatch[1], 10);
                        } else {
                            const probeData = await probeRes.json();
                            githubTotal = probeData.length;
                        }
                    } else {
                        const probeData = await probeRes.json();
                        githubTotal = probeData.length;
                    }

                    const existingRepos: Repo[] = await db.get('gh_stars_data') || [];

                    // Verify if Supabase also has data for this github_user
                    // Coalesce this query as it's identical to what useRepoStats might be doing
                    const { data: { user: currentUser } } = await supabase.auth.getUser();
                    const sbCount = await queryCoalescer.coalesce(`count:${currentUser?.id}:${currentUsername}`, async () => {
                        const { count } = await supabase
                            .from('user_stars')
                            .select('*', { count: 'exact', head: true })
                            .eq('user_id', currentUser?.id)
                            .eq('github_user', currentUsername);
                        return count || 0;
                    });

                    if (githubTotal > 0 && githubTotal === existingRepos.length && (sbCount || 0) > 0) {
                        console.log(`[Sync] Task ${syncId} Probe matched: ${githubTotal} (Local & Supabase). Skipping.`);
                        localStorage.setItem('gh_stars_last_sync_time', Date.now().toString());
                        localStorage.setItem('gh_stars_total_count', githubTotal.toString());
                        return;
                    }
                }
            }

            // --- 阶段 2: 正式同步 ---
            if (syncId !== currentSyncIdRef.current) return;

            // 解析用户名 (如果之前未解析)
            if (targetConfig.type === 'token' && !currentUsername) {
                const userRes = await fetch('https://api.github.com/user', { headers });
                if (userRes.ok) {
                    const userData = await userRes.json();
                    if (userData.login) {
                        currentUsername = userData.login;
                        localStorage.setItem('gh_stars_config', JSON.stringify({
                            ...targetConfig,
                            resolvedUsername: userData.login
                        }));
                    }
                }
            }

            if (syncId !== currentSyncIdRef.current) return;

            const existingRepos: Repo[] = await db.get('gh_stars_data') || [];
            const existingIds = new Set(existingRepos.map((r: Repo) => r.id));

            let allFetchedRepos: Repo[] = [];
            const allFetchedIds: number[] = []; // Track all IDs from GitHub for cleanup
            let page = startPage;
            let hasMore = true;
            let actualStarCount = 0;
            const syncStartTime = Date.now();

            while (hasMore && page <= MAX_PAGES) {
                // 循环开始前检查 ID
                if (syncId !== currentSyncIdRef.current) {
                    console.log(`[Sync] Task ${syncId} aborted because a newer task has started.`);
                    return;
                }

                const url = targetConfig.type === 'username'
                    ? `https://api.github.com/users/${username}/starred?per_page=100&page=${page}`
                    : `https://api.github.com/user/starred?per_page=100&page=${page}`;

                let response = await fetch(url, { headers });

                // If unauthorized in username mode, retry without the token (as it might be expired)
                if (response.status === 401 && targetConfig.type === 'username' && effectiveToken) {
                    console.log('[Sync] Token expired for public request, retrying without auth...');
                    const publicHeaders = { 'Accept': 'application/vnd.github.v3.star+json' };
                    response = await fetch(url, { headers: publicHeaders });
                }

                if (!response.ok) {
                    if (response.status === 401 || response.status === 403) {
                        throw new Error(targetConfig.type === 'token' ? 'TOKEN_INVALID' : 'AUTH_REQUIRED');
                    }
                    throw new Error(`SYNC_FAILED_${response.status}`);
                }

                if (page === 1) {
                    const linkHeader = response.headers.get('Link');
                    if (linkHeader) {
                        const lastPageMatch = linkHeader.match(/page=(\d+)>; rel="last"/);
                        if (lastPageMatch) {
                            actualStarCount = parseInt(lastPageMatch[1], 10) * 100;
                        }
                    }
                    if (!actualStarCount) {
                        actualStarCount = parseInt(localStorage.getItem('gh_stars_total_count') || '0');
                    }
                }

                const data = await response.json();

                // 数据获取后再次检查 ID，防止写入过期数据
                if (syncId !== currentSyncIdRef.current) return;

                if (data.length === 0) {
                    hasMore = false;
                } else {
                    if (page === 1 && !actualStarCount) actualStarCount = data.length;

                    const existingMap = new Map(existingRepos.map((r: Repo) => [r.id, r]));
                    const idsToCheck = data.map((r: any) => r.repo.id).filter((id: number) => {
                        const existing = existingMap.get(id);
                        return !existing?.description_cn || !existing?.readme_summary;
                    });

                    const supabaseTranslationMap = new Map<number, string>();
                    const supabaseReadmeMap = new Map<number, string>();
                    if (idsToCheck.length > 0) {
                        const { data: sbData } = await supabase.from('repos').select('id, description_cn, readme_summary').in('id', idsToCheck);
                        sbData?.forEach((t: any) => {
                            if (t.description_cn) supabaseTranslationMap.set(t.id, t.description_cn);
                            if (t.readme_summary) supabaseReadmeMap.set(t.id, t.readme_summary);
                        });
                    }

                    const minifiedData = data.map((r: any) => {
                        const existing = existingMap.get(r.repo.id);
                        const descCn = existing?.description_cn || supabaseTranslationMap.get(r.repo.id);
                        const readmeSummary = existing?.readme_summary || supabaseReadmeMap.get(r.repo.id);

                        // Collect ID for cleanup
                        allFetchedIds.push(r.repo.id);

                        return {
                            id: r.repo.id,
                            name: r.repo.name,
                            full_name: r.repo.full_name,
                            html_url: r.repo.html_url,
                            stargazers_count: r.repo.stargazers_count,
                            updated_at: r.repo.pushed_at || r.repo.updated_at,
                            topics: r.repo.topics || [],
                            language: r.repo.language,
                            description: descCn || r.repo.description,
                            description_cn: descCn,
                            readme_summary: readmeSummary,
                            starred_at: r.starred_at,
                            owner: { avatar_url: r.repo.owner.avatar_url, login: r.repo.owner.login }
                        };
                    });

                    // Multi-user: Write to both repos (shared) and user_stars (user-specific)
                    (async () => {
                        try {
                            const { data: { user } } = await supabase.auth.getUser();
                            if (!user) {
                                console.warn('[Sync] No authenticated user, skipping Supabase sync');
                                return;
                            }

                            // 1. Upsert repos (shared data)
                            const { error: reposError } = await supabase.from('repos').upsert(
                                minifiedData.map((r: Repo) => ({
                                    id: r.id,
                                    name: r.name,
                                    full_name: r.full_name,
                                    html_url: r.html_url,
                                    stargazers_count: r.stargazers_count,
                                    updated_at: r.updated_at,
                                    topics: r.topics,
                                    language: r.language,
                                    description: data.find((d: any) => d.repo.id === r.id)?.repo.description,
                                    description_cn: r.description_cn,
                                    readme_summary: r.readme_summary,
                                    owner: r.owner,
                                })),
                                { onConflict: 'id' }
                            );
                            if (reposError) console.error('[Sync] Repos upsert failed:', reposError);

                            // 2. Upsert user_stars (user-specific relationships)
                            const { error: starsError } = await supabase.from('user_stars').upsert(
                                minifiedData.map((r: Repo) => ({
                                    user_id: user.id,
                                    repo_id: r.id,
                                    github_user: currentUsername, // Add github_user dimension
                                    starred_at: r.starred_at,
                                })),
                                { onConflict: 'user_id,repo_id,github_user' }
                            );
                            if (starsError) console.error('[Sync] User stars upsert failed:', starsError);
                        } catch (err) {
                            console.error('[Sync] Supabase sync error:', err);
                        }
                    })();

                    const newItems = isIncremental
                        ? minifiedData.filter((item: Repo) => !existingIds.has(item.id))
                        : minifiedData;

                    allFetchedRepos = [...allFetchedRepos, ...newItems];

                    const localTotalNow = allFetchedRepos.length + existingRepos.length;
                    if ((isIncremental && localTotalNow >= actualStarCount && actualStarCount > 0) || data.length < 100) {
                        hasMore = false;
                    }

                    // 写入数据库前最终检查 ID
                    if (syncId !== currentSyncIdRef.current) return;

                    // Calculate currentMerged for DB and progress update
                    const currentMerged = isIncremental
                        ? [...allFetchedRepos, ...existingRepos.filter(r => !allFetchedRepos.some(nr => nr.id === r.id))]
                        : allFetchedRepos;

                    await db.set('gh_stars_data', currentMerged);
                    if (page % 2 === 0 || !hasMore) {
                        setRepos(prev => {
                            const updated = isIncremental
                                ? [...allFetchedRepos, ...prev.filter(r => !allFetchedRepos.some(nr => nr.id === r.id))]
                                : allFetchedRepos;
                            return updated;
                        });
                    }

                    const progress = Math.min(100, (currentMerged.length / (actualStarCount || currentMerged.length)) * 100);
                    setSyncProgress({
                        current: Math.round(progress === 100 && hasMore ? 99 : progress),
                        total: actualStarCount || currentMerged.length
                    });

                    localStorage.setItem('gh_stars_sync_state', JSON.stringify({
                        username: currentUsername,
                        configType: targetConfig.type,
                        configValue: targetConfig.value,
                        startTime: syncStartTime,
                        lastUpdateTime: Date.now(),
                        currentPage: page,
                        syncedCount: currentMerged.length,
                        expectedTotal: actualStarCount,
                        isIncremental,
                        status: 'in_progress'
                    }));

                    console.log(`[Sync] Task ${syncId} Page ${page}: Saved ${currentMerged.length} repos`);
                    page++;
                }
            }

            if (syncId !== currentSyncIdRef.current) return;

            // --- 阶段 3: 数据清理 (Cleanup Ghost Stars) ---
            // Only cleanup if we fetched the full list (not incremental or reached total)
            if (allFetchedIds.length > 0 && (!isIncremental || allFetchedIds.length >= actualStarCount)) {
                try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        console.log(`[Sync] Task ${syncId} Cleaning up old stars for ${currentUsername}. Current total fetched: ${allFetchedIds.length}`);
                        const { error: cleanupError } = await supabase.rpc('cleanup_user_stars', {
                            p_user_id: user.id,
                            p_github_user: currentUsername,
                            p_repo_ids: allFetchedIds
                        });

                        if (cleanupError) console.error('[Sync] Cleanup failed:', cleanupError);
                        else console.log(`[Sync] Task ${syncId} Cleanup successful for ${currentUsername}.`);
                    }
                } catch (cleanupErr) {
                    console.error('[Sync] Cleanup error:', cleanupErr);
                }
            }

            const finalRepos = (await db.get('gh_stars_data')) || [];
            setRepos(finalRepos);
            localStorage.setItem('gh_stars_last_sync_time', Date.now().toString());
            localStorage.setItem('gh_stars_total_count', finalRepos.length.toString());

        } catch (err: any) {
            if (syncId === currentSyncIdRef.current) {
                setError(err.message);
            }
        } finally {
            if (syncId === currentSyncIdRef.current) {
                setLoading(false);
                setSyncProgress(null);
                localStorage.removeItem('gh_stars_sync_state');
                syncLockRef.current = false;
            }
        }
    }, [authToken]); // Removed 'repos' dependency - fetchAllStars is now stable



    // 统一的初始化和配置变化处理逻辑
    useEffect(() => {
        const handleSync = async () => {
            // 如果没有配置值，不执行任何操作
            if (!config.value) {
                initializedRef.current = true;
                return;
            }

            try {
                // 检测配置是否变化
                const configChanged = lastConfigRef.current &&
                    (lastConfigRef.current.type !== config.type || lastConfigRef.current.value !== config.value);

                if (!initializedRef.current) {
                    // --- 三级缓存初始化逻辑 ---

                    // 1. 优先检查 IndexedDB (已持久化到本地的数据)
                    const localData: Repo[] = await db.get('gh_stars_data') || [];
                    if (localData.length > 0) {
                        console.log(`[Sync] Layer 1: Loaded ${localData.length} repos from IndexedDB`);
                        setRepos(localData);

                        // 后台执行一次轻量级探测，确认是否有新 Star
                        fetchAllStars(config, true);
                    } else {
                        // 2. 本地为空，尝试从 Supabase 恢复 (针对新设备/首登)
                        console.log('[Sync] Layer 2: Checking Supabase for existing cloud data...');
                        const { data: { user } } = await supabase.auth.getUser();
                        if (user) {
                            const { data: cloudItems, error: cloudError } = await supabase
                                .from('user_stars')
                                .select(`
                                    repo_id,
                                    repos!inner(*)
                                `)
                                .eq('user_id', user.id)
                                .eq('github_user', config.resolvedUsername || config.value);

                            if (!cloudError && cloudItems && cloudItems.length > 0) {
                                const restoredRepos = cloudItems.map((item: any) => ({
                                    ...item.repos,
                                    starred_at: item.starred_at
                                }));
                                console.log(`[Sync] Layer 2: Restored ${restoredRepos.length} repos from Supabase`);
                                await db.set('gh_stars_data', restoredRepos);
                                setRepos(restoredRepos);

                                // 恢复后执行增量同步补全最新 Star
                                fetchAllStars(config, true);
                            } else {
                                // 3. 全链路为空，回退到 GitHub 全量同步 (针对全新用户)
                                console.log('[Sync] Layer 3: No data found in IDB/Supabase. Starting full GitHub sync...');
                                fetchAllStars(config, false);
                            }
                        } else {
                            // 未登录用户回退到 GitHub
                            fetchAllStars(config, false);
                        }
                    }
                    initializedRef.current = true;
                } else if (configChanged) {
                    // 配置变化(切换账号)
                    setRepos([]);
                    localStorage.removeItem('gh_stars_sync_state');
                    await db.set('gh_stars_data', []);
                    console.log('Config changed, clearing local DB and starting sync...');
                    fetchAllStars(config, false);
                }

                lastConfigRef.current = { ...config };
            } catch (e) {
                console.error('Error loading cached data:', e);
                if (!initializedRef.current) {
                    fetchAllStars(config, false);
                    initializedRef.current = true;
                }
            }
        };

        handleSync();
    }, [config.type, config.value, fetchAllStars, authToken]);

    return { repos, loading, syncProgress, error, setError, fetchAllStars };
}
