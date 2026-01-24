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
        languageStats?: { name: string; value: number }[];
        topicStats?: { name: string; value: number }[];
        trendStats?: { month: string; count: number }[];
    };
    config: Config | null;
    isTranslating: boolean;
}

class StarDataService {
    private state: StarDataState = {
        repos: [],
        loading: false,
        error: null,
        syncProgress: null,
        stats: { total: 0, translated: 0, githubTotal: 0 },
        config: null,
        isTranslating: false
    };

    private listeners: Set<Listener> = new Set();
    private worker: Worker | null = null;
    private initialized = false;
    private pendingReadmeRequests = new Map<number, (summary: string | null) => void>();
    private pendingStatsRequests = new Map<number, (stats: any) => void>();

    constructor() {
        this.initWorker();
        this.loadStatsFromStorage();
    }

    private initWorker() {
        if (typeof Worker !== 'undefined') {
            this.worker = new Worker(
                new URL('../workers/app.worker.ts', import.meta.url),
                { type: 'module' }
            );

            this.worker.onmessage = async (e) => {
                const { type, ...payload } = e.data;
                switch (type) {
                    case 'SYNC_STARTED':
                        this.updateState({ loading: true, error: null, syncProgress: { current: 0, total: 0 } });
                        break;
                    case 'SYNC_TOTAL':
                        this.updateState({ stats: { ...this.state.stats, githubTotal: payload.total } });
                        break;
                    case 'SYNC_PROGRESS':
                        this.updateState({ syncProgress: { current: payload.current, total: payload.total } });
                        break;
                    case 'SYNC_COMPLETED':
                        await this.refreshFromLocal();
                        this.updateState({ loading: false, syncProgress: null });
                        break;
                    case 'SYNC_ERROR':
                        this.updateState({ error: payload.message, loading: false, syncProgress: null });
                        break;
                    case 'STATUS_CHANGED':
                        this.updateState({ isTranslating: payload.isTranslating });
                        break;
                    case 'DATA_CHANGED':
                        await this.refreshFromLocal();
                        break;
                    case 'CONFIG_UPDATED':
                        if (this.state.config) {
                            const newConfig = { ...this.state.config, resolvedUsername: payload.resolvedUsername };
                            this.updateState({ config: newConfig });
                            localStorage.setItem('gh_stars_config', JSON.stringify(newConfig));
                        }
                        break;
                    case 'README_FETCHED':
                        const { requestId, summary } = payload;
                        if (requestId && this.pendingReadmeRequests.has(requestId)) {
                            this.pendingReadmeRequests.get(requestId)!(summary);
                            this.pendingReadmeRequests.delete(requestId);
                        }
                        break;
                    case 'CLOUD_SYNC_COMPLETED':
                        await this.refreshFromLocal();
                        break;
                    case 'STATS_CALCULATED':
                        if (payload.requestId && this.pendingStatsRequests.has(payload.requestId)) {
                            this.pendingStatsRequests.get(payload.requestId)!(payload.stats);
                            this.pendingStatsRequests.delete(payload.requestId);
                        } else {
                            const { languageStats, topicStats, trendStats } = payload.stats;
                            this.updateState({
                                stats: {
                                    ...this.state.stats,
                                    languageStats,
                                    topicStats,
                                    trendStats
                                }
                            });
                        }
                        break;
                }
            };
        }
    }

    private loadStatsFromStorage() {
        try {
            const total = parseInt(localStorage.getItem('gh_stars_total_count') || '0', 10);
            this.state.stats.githubTotal = total;
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
        this.updateBasicStats();
        this.listeners.forEach(l => l({ ...this.state }));
    }

    private async updateBasicStats() {
        const { total, translated } = await db.getStats();
        this.state.stats.total = total;
        this.state.stats.translated = translated;
        this.listeners.forEach(l => l({ ...this.state }));
    }

    public async calculateStats(): Promise<any> {
        return new Promise((resolve) => {
            if (!this.worker) {
                resolve({});
                return;
            }

            const requestId = Date.now() + Math.random();
            this.pendingStatsRequests.set(requestId, resolve);
            this.worker.postMessage({ type: 'CALCULATE_STATS', payload: { requestId } });

            setTimeout(() => {
                if (this.pendingStatsRequests.has(requestId)) {
                    this.pendingStatsRequests.delete(requestId);
                    resolve({});
                }
            }, 10000);
        });
    }

    public async initialize(config: Config) {
        if (!config.value) return;

        if (this.state.config && (this.state.config.type !== config.type || this.state.config.value !== config.value)) {
            this.state.repos = [];
            this.state.error = null;
            this.initialized = false;
            await db.clearAllData();
        }

        this.updateState({ config });
        this.worker?.postMessage({ type: 'INIT', payload: { config } });

        if (this.initialized) return;
        this.initialized = true;
        this.updateState({ loading: true });

        try {
            // Layer 1: IndexedDB
            const localData = await db.getAllRepos();
            if (localData.length > 0) {
                this.updateState({ repos: localData, loading: false });
                this.sync(config);
                return;
            }

            // Layer 2: Supabase (Restore)
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
                        sync_status: 'synced' as const
                    }));
                    await db.upsertRepos(restoredRepos);
                    this.updateState({ repos: restoredRepos, loading: false });
                    this.sync(config);
                    return;
                }
            }

            // Layer 3: Worker Sync
            this.sync(config);

        } catch (e: any) {
            this.updateState({ error: e.message, loading: false });
        }
    }

    public sync(config: Config, _incremental?: boolean, _startPage?: number) {
        this.worker?.postMessage({ type: 'SYNC', payload: { config } });
    }

    public async fetchAndSummarizeReadme(repo: Repo): Promise<string | null> {
        return new Promise((resolve) => {
            if (!this.worker) {
                resolve(null);
                return;
            }

            const requestId = Date.now() + Math.random();
            this.pendingReadmeRequests.set(requestId, resolve);
            this.worker.postMessage({ type: 'FETCH_README', payload: { repo, requestId } });

            // Timeout safety to prevent memory leaks
            setTimeout(() => {
                if (this.pendingReadmeRequests.has(requestId)) {
                    this.pendingReadmeRequests.delete(requestId);
                    resolve(null);
                }
            }, 60000);
        });
    }

    public triggerBackgroundCloudSync() {
        this.worker?.postMessage({ type: 'TRIGGER_CLOUD_SYNC' });
    }

    public triggerTranslation() {
        this.worker?.postMessage({ type: 'TRIGGER_TRANSLATE' });
    }

    private updateState(updates: Partial<StarDataState>) {
        this.state = { ...this.state, ...updates };
        this.notify();
    }

    public async refreshFromLocal() {
        const localData = await db.getAllRepos();
        // Fetch stats in parallel if possible, but we wait to update state atomically
        // to prevent race conditions where repos are large but stats are missing.
        const fullStats = await this.calculateStats();
        this.updateState({
            repos: localData,
            stats: {
                ...this.state.stats,
                languageStats: fullStats.languageStats,
                topicStats: fullStats.topicStats,
                trendStats: fullStats.trendStats
            }
        });
    }

    public getState() {
        return this.state;
    }

    // Shared with AutoTranslator for legacy reasons or UI bridge
    public getWorker() {
        return this.worker;
    }
}

export const starService = new StarDataService();
