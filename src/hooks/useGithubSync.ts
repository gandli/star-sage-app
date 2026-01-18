import { useState, useCallback, useEffect, useRef } from 'react';
import type { Repo, Config, SyncProgress, SyncState } from '../types';
import { db } from '../utils/db';
import { supabase } from '../lib/supabase';

const MAX_PAGES = 100;

export function useGithubSync(config: Config) {
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
            if (targetConfig.type === 'token') {
                headers['Authorization'] = `Bearer ${targetConfig.value}`;
            }

            const username = targetConfig.resolvedUsername || targetConfig.value;

            // --- 阶段 1: 轻量级探测 (Lightweight Probe) ---
            if (isIncremental && startPage === 1) {
                // ... (验证代码中是否需要 syncId 检查)
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
                    if (githubTotal > 0 && githubTotal === existingRepos.length) {
                        console.log(`[Sync] Task ${syncId} Probe matched: ${githubTotal}. Skipping.`);
                        localStorage.setItem('gh_stars_last_sync_time', Date.now().toString());
                        localStorage.setItem('gh_stars_total_count', githubTotal.toString());
                        return;
                    }
                }
            }

            // --- 阶段 2: 正式同步 ---
            if (syncId !== currentSyncIdRef.current) return;

            // 解析用户名
            let currentUsername = username;
            if (targetConfig.type === 'token' && !targetConfig.resolvedUsername) {
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
                    ? `https://api.github.com/users/${currentUsername}/starred?per_page=100&page=${page}`
                    : `https://api.github.com/user/starred?per_page=100&page=${page}`;

                const response = await fetch(url, { headers });
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

                    supabase.from('repos').upsert(minifiedData.map(r => ({
                        ...r,
                        description: data.find((d: any) => d.repo.id === r.id)?.repo.description
                    })), { onConflict: 'id' }).then(({ error }) => error && console.error('Supabase upsert failed:', error));

                    const newItems = isIncremental
                        ? minifiedData.filter(item => !existingIds.has(item.id))
                        : minifiedData;

                    allFetchedRepos = [...allFetchedRepos, ...newItems];

                    const localTotalNow = allFetchedRepos.length + existingRepos.length;
                    if ((isIncremental && localTotalNow >= actualStarCount && actualStarCount > 0) || data.length < 100) {
                        hasMore = false;
                    }

                    const currentMerged = isIncremental
                        ? [...allFetchedRepos, ...existingRepos.filter(r => !allFetchedRepos.some(nr => nr.id === r.id))]
                        : allFetchedRepos;

                    // 写入数据库前最终检查 ID
                    if (syncId !== currentSyncIdRef.current) return;

                    await db.set('gh_stars_data', currentMerged);
                    if (page % 2 === 0 || !hasMore) setRepos(currentMerged);

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

            const finalRepos = (await db.get('gh_stars_data')) || repos;
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
    }, [repos]);



    // 统一的初始化和配置变化处理逻辑
    useEffect(() => {
        const handleSync = async () => {
            // 如果没有配置值，不执行任何操作
            if (!config.value) {
                initializedRef.current = true;
                return;
            }

            try {
                const cached = await db.get('gh_stars_data');
                const lastSync = parseInt(localStorage.getItem('gh_stars_last_sync_time') || '0');
                const timeSinceLastSync = Date.now() - lastSync;

                // 检测配置是否变化
                const configChanged = lastConfigRef.current &&
                    (lastConfigRef.current.type !== config.type || lastConfigRef.current.value !== config.value);

                if (!initializedRef.current) {
                    // 【断点续传检测】
                    const savedState = localStorage.getItem('gh_stars_sync_state');
                    if (savedState) {
                        const syncState: SyncState = JSON.parse(savedState);
                        const configMatches = syncState.configType === config.type && syncState.configValue === config.value;
                        const isExpired = Date.now() - syncState.lastUpdateTime > 60 * 60 * 1000; // 1小时过期

                        if (configMatches && !isExpired && syncState.status === 'in_progress') {
                            console.log(`[Sync] Resuming unfinished sync from page ${syncState.currentPage + 1}...`);
                            fetchAllStars(config, syncState.isIncremental, syncState.currentPage + 1);
                            initializedRef.current = true;
                            lastConfigRef.current = { ...config };
                            return;
                        }
                    }

                    // 首次初始化
                    if (cached && cached.length > 0) {
                        // 有缓存数据，立即加载
                        setRepos(cached);

                        // 【智能同步检测】
                        const savedTotalCount = parseInt(localStorage.getItem('gh_stars_total_count') || '0');
                        const localCount = cached.length;

                        // 条件 1: 本地数量 < 总数量（有未同步的仓库）
                        const hasUnsyncedRepos = savedTotalCount > 0 && localCount < savedTotalCount;

                        // 条件 2: 超过 1 小时（定期更新）
                        const needsPeriodicSync = timeSinceLastSync > 60 * 60 * 1000;

                        if (hasUnsyncedRepos) {
                            console.log(`[Sync] Detected unsynced repos: local=${localCount}, total=${savedTotalCount}. Triggering incremental sync...`);
                            fetchAllStars(config, true);
                        } else if (needsPeriodicSync && !loading) {
                            // 如果数量已匹配，定期同步仅用于“检测”是否有新 Star
                            // 为了优化，只有在数量不匹配或确实需要强制刷新时才执行
                            // 如果用户希望完全不自动执行，也可以在这里更严格地限制
                            console.log(`[Sync] Periodic sync check (last sync: ${Math.floor(timeSinceLastSync / 1000 / 60)} minutes ago)`);
                            fetchAllStars(config, true);
                        }
                        // 否则直接使用缓存,不同步
                    } else {
                        // 没有缓存,首次全量同步
                        fetchAllStars(config, false);
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
                // 如果配置未变化且已初始化,不执行任何操作

                // 更新配置引用
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
    }, [config.type, config.value, fetchAllStars]);

    return { repos, loading, syncProgress, error, setError, fetchAllStars };
}
