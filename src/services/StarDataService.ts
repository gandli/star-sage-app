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
    private isSyncingToCloud = false;

    constructor() {
        this.loadStatsFromStorage();
        // Periodically check for unsynced data
        setInterval(() => this.triggerBackgroundCloudSync(), 30000);
    }

    private loadStatsFromStorage() {
        try {
            const total = parseInt(localStorage.getItem('gh_stars_total_count') || '0', 10);
            this.state.stats.githubTotal = total;
            this.state.stats.total = this.state.repos.length;
        } catch (e) {
            console.error('Failed to load stats from storage', e);
        }
    }

    public subscribe(listener: Listener): () => void {
        this.listeners.add(listener);
        listener(this.state);
        return () => this.listeners.delete(listener);
    }

    private notify() {
        this.calculateStats();
        this.listeners.forEach(l => l({ ...this.state }));
    }

    private calculateStats() {
        const repos = this.state.repos;
        const total = repos.length;
        const translated = repos.filter((r: Repo) => r.description_cn !== null && r.description_cn !== undefined).length;

        this.state.stats.total = total;
        this.state.stats.translated = translated;

        const ghTotal = parseInt(localStorage.getItem('gh_stars_total_count') || '0', 10);
        this.state.stats.githubTotal = Math.max(ghTotal, total);
    }

    // --- Core Action: Initialize ---
    public async initialize(config: Config) {
        if (!config.value) return;

        if (this.state.config && (this.state.config.type !== config.type || this.state.config.value !== config.value)) {
            console.log('[StarDataService] Config changed. Resetting.');
            this.state.repos = [];
            this.state.error = null;
            this.initialized = false;
            await db.clearAllData();
            localStorage.removeItem('gh_stars_sync_state');
        }

        this.updateState({ config });

        if (this.initialized) return;
        this.initialized = true;
        this.updateState({ loading: true });

        try {
            // Layer 1: IndexedDB (Fast)
            const localData = await db.getAllRepos();
            if (localData.length > 0) {
                console.log(`[StarDataService] Layer 1: Loaded ${localData.length} repos from IndexedDB`);
                this.updateState({ repos: localData, loading: false });
                this.sync(config, true); // Background incremental sync
                return;
            }

            // Layer 2: Supabase (Restore)
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
                    const restoredRepos = cloudItems.map((item: any) => ({
                        ...(item.repos as Repo),
                        starred_at: item.starred_at || (item.repos as Repo).starred_at,
                        sync_status: 'synced' as const // Cloud items are already synced
                    }));
                    console.log(`[StarDataService] Layer 2: Restored ${restoredRepos.length} repos from Supabase`);
                    await db.upsertRepos(restoredRepos);
                    this.updateState({ repos: restoredRepos, loading: false });
                    this.sync(config, true);
                    return;
                }
            }

            // Layer 3: Full GitHub Sync
            console.log('[StarDataService] Layer 3: Full GitHub Sync...');
            this.sync(config, false);

        } catch (e: any) {
            console.error('[StarDataService] Init failed:', e);
            this.updateState({ error: e.message, loading: false });
        }
    }

    // --- Core Action: Sync ---
    public async sync(config: Config, _isIncremental: boolean = false, startPage: number = 1) {
        if (!config.value.trim()) return;

        const syncId = ++this.currentSyncId;
        this.updateState({ loading: true, error: null, syncProgress: { current: 0, total: 0 } });

        try {
            const headers: HeadersInit = { 'Accept': 'application/vnd.github.v3.star+json' };
            if (config.type === 'token') {
                headers['Authorization'] = `Bearer ${config.value}`;
            }

            let username = config.resolvedUsername || config.value;
            // Resolve username if needed
            if (config.type === 'token' && !config.resolvedUsername) {
                const userRes = await fetch('https://api.github.com/user', { headers });
                if (userRes.ok) {
                    const uData = await userRes.json();
                    username = uData.login;
                    if (this.state.config) {
                        const newConfig = { ...this.state.config, resolvedUsername: username };
                        this.updateState({ config: newConfig });
                        localStorage.setItem('gh_stars_config', JSON.stringify(newConfig));
                    }
                }
            }

            // --- Stage 1: Main Sync Loop ---
            // Check for checkpoint to support breakpoint resume
            const configId = `${config.type}_${config.value}`;
            const checkpoint = await db.getSyncCheckpoint(configId);

            let page = checkpoint || startPage;
            if (checkpoint) {
                console.log(`[StarDataService] Resuming sync from page ${checkpoint}`);
            }

            let hasMore = true;
            let totalStars = this.state.stats.githubTotal || 0;

            while (hasMore && page <= 100) {
                if (syncId !== this.currentSyncId) return;

                const url = config.type === 'username'
                    ? `https://api.github.com/users/${username}/starred?per_page=100&page=${page}`
                    : `https://api.github.com/user/starred?per_page=100&page=${page}`;

                const res = await fetch(url, { headers });
                if (!res.ok) throw new Error(`GitHub API Error: ${res.status}`);

                if (page === 1) {
                    const linkHeader = res.headers.get('Link');
                    if (linkHeader) {
                        const match = linkHeader.match(/page=(\d+)>; rel="last"/);
                        if (match) totalStars = parseInt(match[1], 10) * 100;
                    }
                }

                const data = await res.json();
                if (data.length === 0) {
                    hasMore = false;
                    break;
                }

                // --- Immediate Local Write ---
                const processed = await this.preprocessBatch(data);
                await db.upsertRepos(processed);

                // Update State from DB (to stay consistent)
                const currentRepos = await db.getAllRepos();
                const isLastBatch = data.length < 100;

                this.updateState({
                    repos: currentRepos,
                    syncProgress: { current: currentRepos.length, total: totalStars || currentRepos.length },
                    // If this is the last batch, set loading to false immediately
                    ...(isLastBatch && { loading: false })
                });

                if (isLastBatch) {
                    hasMore = false;
                    await db.setSyncCheckpoint(configId, null); // Clear checkpoint on full success
                } else {
                    page++;
                    await db.setSyncCheckpoint(configId, page); // Save progress
                }

                // Trigger cloud sync in background
                this.triggerBackgroundCloudSync();
            }

            if (syncId === this.currentSyncId) {
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

    private async preprocessBatch(data: any[]): Promise<Repo[]> {
        return data.map((item: any) => ({
            id: item.repo.id,
            name: item.repo.name,
            full_name: item.repo.full_name,
            html_url: item.repo.html_url,
            stargazers_count: item.repo.stargazers_count,
            updated_at: item.repo.pushed_at || item.repo.updated_at,
            description: item.repo.description,
            language: item.repo.language,
            topics: item.repo.topics || [],
            owner: { login: item.repo.owner.login, avatar_url: item.repo.owner.avatar_url },
            starred_at: item.starred_at,
            sync_status: 'pending' // Mark for cloud sync
        } as Repo));
    }

    // --- Background Cloud Sync ---
    public async triggerBackgroundCloudSync() {
        if (this.isSyncingToCloud || !this.state.config) return;
        this.isSyncingToCloud = true;

        try {
            const allRepos = await db.getAllRepos();
            const pending = allRepos.filter(r => r.sync_status === 'pending');
            if (pending.length === 0) {
                this.isSyncingToCloud = false;
                return;
            }

            console.log(`[StarDataService] Background Sync: Pushing ${pending.length} repos to cloud...`);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                this.isSyncingToCloud = false;
                return;
            }

            const username = this.state.config.resolvedUsername || this.state.config.value;

            // 1. Repos Table
            const { error: reposError } = await supabase.from('repos').upsert(pending.map(r => ({
                id: r.id,
                name: r.name,
                full_name: r.full_name,
                html_url: r.html_url,
                stargazers_count: r.stargazers_count,
                updated_at: r.updated_at,
                topics: r.topics,
                language: r.language,
                description: r.description,
                description_cn: r.description_cn,
                owner: r.owner,
                readme_summary: r.readme_summary
            })), { onConflict: 'id' });

            if (reposError) throw reposError;

            // 2. User Stars Table
            const { error: starsError } = await supabase.from('user_stars').upsert(pending.map(r => ({
                user_id: user.id,
                repo_id: r.id,
                github_user: username,
                starred_at: r.starred_at
            })), { onConflict: 'user_id,repo_id,github_user' });

            if (starsError) throw starsError;

            // 3. Mark as Synced in Local
            const synced = pending.map(r => ({ ...r, sync_status: 'synced' as const }));
            await db.upsertRepos(synced);

            console.log(`[StarDataService] Background Sync: Done.`);
        } catch (e) {
            console.error('[StarDataService] Background Sync failed:', e);
        } finally {
            this.isSyncingToCloud = false;
        }
    }

    public async updateRepoTranslation(id: number, text: string) {
        // Use db utility which handles sync_status: 'pending' automatically in my new version
        await db.saveTranslation(id, text);

        // Refresh local state
        const repo = await db.getRepo(id);
        if (repo) {
            const newRepos = this.state.repos.map(r => r.id === id ? repo : r);
            this.updateState({ repos: newRepos });
            this.triggerBackgroundCloudSync();
        }
    }

    public async updateRepoTranslationsBatch(updates: Array<{ id: number; text: string }>) {
        // Batch save to database
        await db.saveBatchTranslations(updates.map(u => ({ repoId: u.id, translation: u.text })));

        // Refresh local state with all updated repos
        const updatedRepoIds = new Set(updates.map(u => u.id));
        const updatedRepos = await Promise.all(
            updates.map(u => db.getRepo(u.id))
        );

        const newRepos = this.state.repos.map(r => {
            if (updatedRepoIds.has(r.id)) {
                const updated = updatedRepos.find(ur => ur?.id === r.id);
                return updated || r;
            }
            return r;
        });

        this.updateState({ repos: newRepos });
        this.triggerBackgroundCloudSync();
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
