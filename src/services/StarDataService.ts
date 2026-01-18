import { db } from '../utils/db';
import { supabase } from '../lib/supabase';

import type { Repo, Config, SyncProgress } from '../types';

type Listener = (state: StarDataState) => void;

interface StarDataState {
    repos: Repo[];
    loading: boolean;
    error: string | null;
    syncProgress: SyncProgress | null;
    stats: {
        total: number;
        translated: number;
        githubTotal: number;
    };
    config: Config | null;
}

class StarDataService {
    private state: StarDataState = {
        repos: [],
        loading: false,
        error: null,
        syncProgress: null,
        stats: { total: 0, translated: 0, githubTotal: 0 },
        config: null
    };

    private listeners: Set<Listener> = new Set();
    private currentSyncId = 0;
    private initialized = false;

    constructor() {
        // Load initial stats from local storage if available
        this.loadStatsFromStorage();
    }

    private loadStatsFromStorage() {
        try {
            const total = parseInt(localStorage.getItem('gh_stars_total_count') || '0', 10);
            this.state.stats.githubTotal = total;
            this.state.stats.total = this.state.repos.length;
            // translated count will be updated when repos are loaded
        } catch (e) {
            console.error('Failed to load stats from storage', e);
        }
    }

    public subscribe(listener: Listener): () => void {
        this.listeners.add(listener);
        listener(this.state); // Immediate update
        return () => this.listeners.delete(listener);
    }

    private notify() {
        // Recalculate stats before notifying
        this.calculateStats();
        this.listeners.forEach(l => l({ ...this.state }));
    }

    private calculateStats() {
        const repos = this.state.repos;
        const total = repos.length;
        // Count translated (valid and not null, allowing empty string if it signifies "processed/skipped")
        const translated = repos.filter((r: Repo) => r.description_cn !== null && r.description_cn !== undefined).length;

        // Update stats
        this.state.stats.total = total;
        this.state.stats.translated = translated;

        // Sync total from storage again to be safe
        const ghTotal = parseInt(localStorage.getItem('gh_stars_total_count') || '0', 10);
        this.state.stats.githubTotal = Math.max(ghTotal, total);
    }

    // --- Core Action: Initialize ---
    public async initialize(config: Config) {
        if (!config.value) return;

        // Check if config changed
        if (this.state.config && (this.state.config.type !== config.type || this.state.config.value !== config.value)) {
            console.log('[StarDataService] Config changed. Resetting.');
            this.state.repos = [];
            this.state.error = null;
            this.initialized = false;
            await db.set('gh_stars_data', []);
            localStorage.removeItem('gh_stars_sync_state');
        }

        this.updateState({ config });

        if (this.initialized) return;

        this.initialized = true;
        this.updateState({ loading: true });

        try {
            // Layer 1: IndexedDB
            const localData: Repo[] = await db.get('gh_stars_data') || [];
            if (localData.length > 0) {
                console.log(`[StarDataService] Layer 1: Loaded ${localData.length} repos from IndexedDB`);
                this.updateState({ repos: localData, loading: false });
                this.sync(config, true); // Background incremental sync
                return;
            }

            // Layer 2: Supabase
            console.log('[StarDataService] Layer 2: Checking Supabase...');
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const username = config.resolvedUsername || config.value;
                const { data: cloudItems, error: cloudError } = await supabase
                    .from('user_stars')
                    .select(`repo_id, repos!inner(*)`)
                    .eq('user_id', user.id)
                    .eq('github_user', username);

                if (!cloudError && cloudItems && cloudItems.length > 0) {
                    const restoredRepos = cloudItems.map((item: { repos: any, starred_at?: string }) => ({
                        ...(item.repos as Repo),
                        starred_at: item.starred_at || (item.repos as Repo).starred_at
                    }));
                    console.log(`[StarDataService] Layer 2: Restored ${restoredRepos.length} repos from Supabase`);
                    await db.set('gh_stars_data', restoredRepos);
                    this.updateState({ repos: restoredRepos, loading: false });
                    this.sync(config, true); // Background incremental sync
                    return;
                }
            }

            // Layer 3: Full GitHub Sync
            console.log('[StarDataService] Layer 3: Full GitHub Sync...');
            this.sync(config, false); // Full sync

        } catch (e: any) {
            console.error('[StarDataService] Init failed:', e);
            this.updateState({ error: e.message, loading: false });
        }
    }

    // --- Core Action: Sync ---
    public async sync(config: Config, isIncremental: boolean = false, startPage: number = 1) {
        if (!config.value.trim()) return;

        const syncId = ++this.currentSyncId;
        this.updateState({ loading: true, error: null, syncProgress: { current: 0, total: 0 } });

        console.log(`[StarDataService] Sync started (Task ${syncId}, Incremental: ${isIncremental}, Page: ${startPage})`);

        try {
            const headers: HeadersInit = { 'Accept': 'application/vnd.github.v3.star+json' };
            if (config.type === 'token') {
                headers['Authorization'] = `Bearer ${config.value}`;
            }

            let username = config.resolvedUsername || config.value;
            // Resolve username if needed
            if (config.type === 'token' && !config.resolvedUsername) {
                try {
                    const userRes = await fetch('https://api.github.com/user', { headers });
                    if (userRes.ok) {
                        const uData = await userRes.json();
                        username = uData.login;
                        // Update local config ref if possible, or just use var
                        if (this.state.config) {
                            const newConfig = { ...this.state.config, resolvedUsername: username };
                            this.updateState({ config: newConfig });
                            localStorage.setItem('gh_stars_config', JSON.stringify(newConfig));
                        }
                    }
                } catch (e) {
                    console.warn('[StarDataService] Failed to resolve username', e);
                }
            }

            // --- Stage 1: Probe (Optimized Check) ---
            if (isIncremental && startPage === 1) {
                if (syncId !== this.currentSyncId) return;

                const probeUrl = config.type === 'username'
                    ? `https://api.github.com/users/${username}/starred?per_page=1`
                    : `https://api.github.com/user/starred?per_page=1`;

                try {
                    const probeRes = await fetch(probeUrl, { headers });
                    if (probeRes.ok) {
                        let githubTotal = 0;
                        const linkHeader = probeRes.headers.get('Link');
                        if (linkHeader) {
                            const lastPageMatch = linkHeader.match(/page=(\d+)>; rel="last"/);
                            if (lastPageMatch) githubTotal = parseInt(lastPageMatch[1], 10);
                        }
                        if (!githubTotal) {
                            const d = await probeRes.json();
                            githubTotal = d.length;
                        }

                        const existingRepos = await db.get('gh_stars_data') || [];

                        // Check Supabase count too
                        const { data: { user } } = await supabase.auth.getUser();
                        let sbCount = 0;
                        if (user) {
                            const { count } = await supabase
                                .from('user_stars')
                                .select('*', { count: 'exact', head: true })
                                .eq('user_id', user.id)
                                .eq('github_user', username);
                            sbCount = count || 0;
                        }

                        if (githubTotal > 0 && githubTotal === existingRepos.length && sbCount > 0) {
                            console.log(`[StarDataService] Probe matched: ${githubTotal}. Sync skipped.`);
                            this.updateState({ loading: false });
                            // Update stats anyway
                            this.state.stats.githubTotal = githubTotal;
                            this.calculateStats();
                            return;
                        }
                        // Update total expectation
                        this.state.stats.githubTotal = githubTotal;
                        localStorage.setItem('gh_stars_total_count', githubTotal.toString());
                    }
                } catch (e) {
                    console.warn('[StarDataService] Probe failed, continuing normal sync', e);
                }
            }

            // --- Stage 2: Main Sync Loop ---
            let page = startPage;
            let hasMore = true;
            let allFetched: Repo[] = [];
            const allFetchedIds: number[] = [];

            // Load current existing data to memory
            const existingRepos = this.state.repos.length > 0 ? this.state.repos : (await db.get('gh_stars_data') || []);
            const existingIds = new Set(existingRepos.map((r: Repo) => r.id));
            let totalStars = this.state.stats.githubTotal || existingRepos.length;

            while (hasMore && page <= 100) {
                if (syncId !== this.currentSyncId) return;

                const url = config.type === 'username'
                    ? `https://api.github.com/users/${username}/starred?per_page=100&page=${page}`
                    : `https://api.github.com/user/starred?per_page=100&page=${page}`;

                let res = await fetch(url, { headers });

                // Retry for 401 on public
                if (res.status === 401 && config.type === 'username') {
                    const publicHeaders = { 'Accept': 'application/vnd.github.v3.star+json' };
                    res = await fetch(url, { headers: publicHeaders });
                }

                if (!res.ok) throw new Error(`GitHub API Error: ${res.status}`);

                // Extract Total from Link if first page
                if (page === 1) {
                    const linkHeader = res.headers.get('Link');
                    if (linkHeader) {
                        const match = linkHeader.match(/page=(\d+)>; rel="last"/);
                        if (match) totalStars = parseInt(match[1], 10) * 100; // rough est
                    }
                }

                const data = await res.json();
                if (data.length === 0) {
                    hasMore = false;
                    break;
                }

                // Process Batch
                const processed = await this.processBatch(data, existingRepos, username);

                const newItems = isIncremental
                    ? processed.filter((r: Repo) => !existingIds.has(r.id))
                    : processed;

                allFetched = [...allFetched, ...newItems];

                // Check Supabase for missing translations for NEW items
                if (newItems.length > 0) {
                    const missingDescIds = newItems.filter((r: Repo) => !r.description_cn && r.description).map((r: Repo) => r.id);
                    if (missingDescIds.length > 0) {
                        const { data: sbData } = await supabase.from('repos').select('id, description_cn').in('id', missingDescIds);
                        if (sbData) {
                            const sbMap = new Map(sbData.map(s => [s.id, s.description_cn]));
                            allFetched = allFetched.map((r: Repo) => sbMap.has(r.id) && sbMap.get(r.id) ? { ...r, description_cn: sbMap.get(r.id) } : r);
                        }
                    }
                }

                // Merge and Save
                const currentMerged = isIncremental
                    ? [...allFetched, ...existingRepos.filter((r: Repo) => !allFetched.some((nr: Repo) => nr.id === r.id))]
                    : allFetched;

                await db.set('gh_stars_data', currentMerged);
                this.updateState({ repos: currentMerged });

                // Add fetched IDs for cleanup consideration
                processed.forEach((p: Repo) => allFetchedIds.push(p.id));

                this.updateState({
                    syncProgress: { current: currentMerged.length, total: totalStars || currentMerged.length }
                });

                if (data.length < 100) hasMore = false;
                page++;
            }

            if (syncId === this.currentSyncId) {
                // cleanup
                if (allFetchedIds.length > 0 && (!isIncremental || allFetchedIds.length >= totalStars)) {
                    // Logic for cleanup (removing stars that were unstarred)
                    // ... (Simplifying mostly safe to skip complex cleanup for v1 service, or assume full resync handles it)
                }

                localStorage.setItem('gh_stars_total_count', this.state.repos.length.toString());
                this.updateState({ loading: false, syncProgress: null });
                console.log(`[StarDataService] Sync complete. Total: ${this.state.repos.length}`);
            }

        } catch (e: any) {
            if (syncId === this.currentSyncId) {
                console.error('[StarDataService] Sync failed:', e);
                this.updateState({ error: e.message, loading: false, syncProgress: null });
            }
        }
    }

    private async processBatch(data: unknown[], existingRepos: Repo[], username: string): Promise<Repo[]> {
        const existingMap = new Map(existingRepos.map((r: Repo) => [r.id, r]));

        const minifiedData: Repo[] = data.map((item: unknown) => {
            const r = item as { repo: any, starred_at: string };
            const existing = existingMap.get(r.repo.id);
            // If existing has local translation, prefer it
            // If existing is null, check backend later

            return {
                id: r.repo.id,
                name: r.repo.name,
                full_name: r.repo.full_name,
                html_url: r.repo.html_url,
                stargazers_count: r.repo.stargazers_count,
                updated_at: r.repo.pushed_at || r.repo.updated_at,
                // If existing has CN description, keep it. Else null.
                description_cn: existing?.description_cn,
                description: r.repo.description,
                language: r.repo.language,
                topics: r.repo.topics || [],
                owner: { login: r.repo.owner.login, avatar_url: r.repo.owner.avatar_url },
                starred_at: r.starred_at,
                readme_summary: existing?.readme_summary
            } as Repo;
        });

        // Async Background Upsert
        this.upsertToSupabase(minifiedData, username, data);

        return minifiedData;
    }

    private async upsertToSupabase(repos: Repo[], username: string, originalData: unknown[]) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Repos (Shared)
            await supabase.from('repos').upsert(repos.map((r: Repo) => {
                const original = originalData.find((d: any) => (d as any).repo.id === r.id) as any;
                return {
                    id: r.id,
                    name: r.name,
                    full_name: r.full_name,
                    html_url: r.html_url,
                    stargazers_count: r.stargazers_count,
                    updated_at: r.updated_at,
                    topics: r.topics,
                    language: r.language,
                    description: original?.repo.description, // Original
                    description_cn: r.description_cn, // Keep if we have it
                    owner: r.owner
                };
            }), { onConflict: 'id' });

            // 2. User Stars
            await supabase.from('user_stars').upsert(repos.map((r: Repo) => ({
                user_id: user.id,
                repo_id: r.id,
                github_user: username,
                starred_at: r.starred_at
            })), { onConflict: 'user_id,repo_id,github_user' });

        } catch (e) {
            console.error('[StarDataService] Upsert failed', e);
        }
    }

    // For AutoTranslator
    public async updateRepoTranslation(id: number, text: string) {
        // Update Local State
        const repos = this.state.repos.map((r: Repo) => r.id === id ? { ...r, description_cn: text } : r);
        this.updateState({ repos });

        // Persist Local
        await db.set('gh_stars_data', repos);

        // Persist Cloud (Optimistic)
        // ... AutoTranslator handles this? Or we handle it here?
        // Ideally Service handles it.
        try {
            await supabase.from('repos').update({ description_cn: text }).eq('id', id);
        } catch (e: any) { console.error('Failed to update translation in cloud', e); }
    }

    private updateState(updates: Partial<StarDataState>) {
        this.state = { ...this.state, ...updates };
        this.notify();
    }

    public getState() {
        return this.state;
    }
}

export const starService = new StarDataService();
