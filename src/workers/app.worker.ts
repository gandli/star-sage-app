import { db } from '../utils/db';
import { translateBatch, containsChinese } from '../utils/translate';
import { cleanMarkdown } from '../utils/markdown';
import { supabase } from '../lib/supabase';
import type { Repo, Config } from '../types';

// Worker state
let isEnabled = false;
let isProcessingTranslation = false;
let isSyncingGitHub = false;
let isSyncingCloud = false;
let currentConfig: Config | null = null;
let currentSyncId = 0;

const processingRepoIds = new Set<number>();
const failedRepoIds = new Set<number>();

// --- Helpers ---

const notify = (type: string, payload?: any) => {
    self.postMessage({ type, ...payload });
};

const setTranslating = (value: boolean) => {
    isProcessingTranslation = value;
    notify('STATUS_CHANGED', { isTranslating: value });
};

// --- Logic: GitHub Sync ---

async function runGitHubSync(config: Config, startPage: number = 1) {
    if (isSyncingGitHub) return;
    isSyncingGitHub = true;
    const syncId = ++currentSyncId;

    notify('SYNC_STARTED');

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
                notify('CONFIG_UPDATED', { resolvedUsername: username });
            }
        }

        const configId = `${config.type}_${config.value}`;
        const checkpoint = await db.getSyncCheckpoint(configId);
        let page = checkpoint || startPage;

        // Get total count
        const totalUrl = config.type === 'username'
            ? `https://api.github.com/users/${username}/starred?per_page=1`
            : `https://api.github.com/user/starred?per_page=1`;

        const totalRes = await fetch(totalUrl, { headers });
        if (!totalRes.ok) throw new Error(`GitHub API Error: ${totalRes.status}`);

        let remoteTotal = 0;
        const linkHeader = totalRes.headers.get('Link');
        if (linkHeader) {
            const match = linkHeader.match(/page=(\d+)>; rel="last"/);
            if (match) remoteTotal = parseInt(match[1], 10);
        } else {
            const data = await totalRes.json();
            remoteTotal = Array.isArray(data) ? data.length : 0;
        }

        notify('SYNC_TOTAL', { total: remoteTotal });

        let processedCount = 0;
        const totalPages = Math.ceil(remoteTotal / 100);
        const CONCURRENCY = 5;

        // If totalPages is 0, we can skip
        if (totalPages === 0) {
             await db.setSyncCheckpoint(configId, null);
        }

        for (let i = page; i <= totalPages && i <= 100; i += CONCURRENCY) {
            if (syncId !== currentSyncId) return;

            const batchPages: number[] = [];
            for (let j = 0; j < CONCURRENCY && (i + j) <= totalPages && (i + j) <= 100; j++) {
                batchPages.push(i + j);
            }

            const promises = batchPages.map(async (p) => {
                const url = config.type === 'username'
                    ? `https://api.github.com/users/${username}/starred?per_page=100&page=${p}`
                    : `https://api.github.com/user/starred?per_page=100&page=${p}`;

                const res = await fetch(url, { headers });
                if (!res.ok) throw new Error(`GitHub API Error: ${res.status}`);
                return res.json();
            });

            const results = await Promise.all(promises);

            for (const data of results) {
                if (!Array.isArray(data) || data.length === 0) continue;

                const processed = data.map((item: any) => ({
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
                    sync_status: 'pending'
                } as Repo));

                await db.upsertRepos(processed);
                processedCount += processed.length;
            }

            notify('SYNC_PROGRESS', { current: processedCount, total: remoteTotal });

            // Checkpoint management
            const lastProcessedPage = i + batchPages.length - 1;
            if (lastProcessedPage >= totalPages || lastProcessedPage >= 100) {
                await db.setSyncCheckpoint(configId, null);
            } else {
                await db.setSyncCheckpoint(configId, lastProcessedPage + 1);
            }
        }

        notify('SYNC_COMPLETED');
        // Trigger translation after sync
        triggerTranslation();
    } catch (e: any) {
        console.error('[AppWorker] Sync failed:', e);
        notify('SYNC_ERROR', { message: e.message });
    } finally {
        isSyncingGitHub = false;
    }
}

// --- Logic: README Summarization ---

async function fetchAndSummarizeReadme(repo: Repo): Promise<string | null> {
    try {
        const githubToken = currentConfig?.type === 'token' ? currentConfig.value : null;
        const headers: HeadersInit = { 'Accept': 'application/vnd.github.v3+json' };
        if (githubToken) {
            headers['Authorization'] = `Bearer ${githubToken}`;
        }

        const response = await fetch(`https://api.github.com/repos/${repo.full_name}/readme`, {
            headers
        });

        if (response.ok) {
            const data = await response.json();
            const binaryString = atob(data.content.replace(/\s/g, ''));
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const content = new TextDecoder('utf-8').decode(bytes);

            const summary = cleanMarkdown(content);
            if (summary) {
                const finalSummary = summary + (summary.length >= 300 ? '...' : '');
                await db.saveReadmeSummary(repo.id, finalSummary);
                return finalSummary;
            }
        }
    } catch (e) {
        console.error('[AppWorker] Failed to fetch README:', e);
    }
    return null;
}


// --- Logic: Translation ---

async function runTranslation() {
    if (isProcessingTranslation || !isEnabled) return;

    const untranslated = await db.getUntranslatedRepos(30);
    if (untranslated.length === 0) return;

    setTranslating(true);
    try {
        const reposToProcess: Repo[] = [];
        const textsToTranslate: string[] = [];
        const directUpdates: Array<{ id: number; text: string }> = [];

        // Identify repos needing readme fetch
        const reposNeedingReadme = untranslated.filter(repo => {
            if (processingRepoIds.has(repo.id) || failedRepoIds.has(repo.id)) return false;
            const sourceText = repo.description;
            return (!sourceText || sourceText.trim().length <= 2) && !repo.readme_summary;
        });

        // Mark as processing immediately to prevent race conditions
        const preProcessedIds = new Set<number>();
        reposNeedingReadme.forEach(r => {
            processingRepoIds.add(r.id);
            preProcessedIds.add(r.id);
        });

        // Batch fetch readmes
        const CONCURRENCY = 5;
        for (let i = 0; i < reposNeedingReadme.length; i += CONCURRENCY) {
            const batch = reposNeedingReadme.slice(i, i + CONCURRENCY);
            await Promise.all(batch.map(async (repo) => {
                const summary = await fetchAndSummarizeReadme(repo);
                if (summary) {
                    repo.readme_summary = summary;
                }
            }));
        }

        for (const repo of untranslated) {
            if (!preProcessedIds.has(repo.id)) {
                if (processingRepoIds.has(repo.id) || failedRepoIds.has(repo.id)) continue;
                processingRepoIds.add(repo.id);
            }

            let sourceText = repo.description;
            if (!sourceText || sourceText.trim().length <= 2) {
                if (repo.readme_summary) {
                    sourceText = repo.readme_summary;
                } else {
                    // Mark as empty to avoid infinite loop (fetch failed or returned null)
                    await db.saveBatchTranslations([{ repoId: repo.id, translation: '' }]);
                    processingRepoIds.delete(repo.id);
                    continue;
                }
            }

            if (containsChinese(sourceText)) {
                directUpdates.push({ id: repo.id, text: sourceText });
            } else {
                reposToProcess.push(repo);
                textsToTranslate.push(sourceText);
            }
        }

        if (directUpdates.length > 0) {
            await db.saveBatchTranslations(directUpdates.map(u => ({ repoId: u.id, translation: u.text })));
            directUpdates.forEach(u => processingRepoIds.delete(u.id));
        }

        if (textsToTranslate.length > 0) {
            // Layer 2: Cloud Cache
            const cloudCache = await db.getTranslationsFromSupabaseBatch(reposToProcess.map(r => r.id));
            const stillNeedsApi: Repo[] = [];
            const cacheUpdates: Array<{ id: number; text: string }> = [];

            for (const repo of reposToProcess) {
                const cached = cloudCache.get(repo.id);
                if (cached) {
                    cacheUpdates.push({ id: repo.id, text: cached });
                } else {
                    stillNeedsApi.push(repo);
                }
            }

            if (cacheUpdates.length > 0) {
                await db.saveBatchTranslations(cacheUpdates.map(u => ({ repoId: u.id, translation: u.text })));
                cacheUpdates.forEach(u => processingRepoIds.delete(u.id));
            }

            // Layer 3: API
            if (stillNeedsApi.length > 0) {
                const apiTexts = stillNeedsApi.map(r => r.description || r.readme_summary || '');
                const results = await translateBatch(apiTexts, 'zh');
                const apiUpdates: Array<{ repoId: number; translation: string }> = [];

                for (let i = 0; i < stillNeedsApi.length; i++) {
                    const repo = stillNeedsApi[i];
                    if (results[i]) {
                        apiUpdates.push({ repoId: repo.id, translation: results[i] });
                    } else {
                        failedRepoIds.add(repo.id);
                    }
                }

                if (apiUpdates.length > 0) {
                    await db.saveBatchTranslations(apiUpdates);
                }
                stillNeedsApi.forEach(r => processingRepoIds.delete(r.id));
            }
        }

        notify('DATA_CHANGED');
    } catch (e) {
        console.error('[AppWorker] Translation error:', e);
    } finally {
        setTranslating(false);
    }
}

// --- Logic: Cloud Sync ---

async function runCloudSync() {
    if (isSyncingCloud || !currentConfig) return;
    isSyncingCloud = true;

    try {
        const pending = await db.getPendingRepos();
        if (pending.length === 0) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const username = currentConfig.resolvedUsername || currentConfig.value;

        // Upsert repos
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

        // Upsert user_stars
        const { error: starsError } = await supabase.from('user_stars').upsert(pending.map(r => ({
            user_id: user.id,
            repo_id: r.id,
            github_user: username,
            starred_at: r.starred_at
        })), { onConflict: 'user_id,repo_id,github_user' });

        if (starsError) throw starsError;

        // Mark as synced locally
        const synced = pending.map(r => ({ ...r, sync_status: 'synced' as const }));
        await db.upsertRepos(synced);

        notify('CLOUD_SYNC_COMPLETED');
    } catch (e) {
        console.error('[AppWorker] Cloud sync failed:', e);
    } finally {
        isSyncingCloud = false;
    }
}

// --- Polling and Message Handling ---

let pollTimer: any = null;

const startPolling = () => {
    if (pollTimer) return;
    pollTimer = setInterval(() => {
        if (isEnabled) {
            runTranslation();
            runCloudSync();
        }
    }, 5000);
};

const triggerTranslation = () => {
    if (isEnabled) runTranslation();
};

self.onmessage = (e) => {
    const { type, payload } = e.data;

    switch (type) {
        case 'INIT':
            isEnabled = true;
            currentConfig = payload.config;
            startPolling();
            break;
        case 'SYNC':
            if (payload.config) currentConfig = payload.config;
            if (currentConfig) runGitHubSync(currentConfig);
            break;
        case 'TRIGGER_TRANSLATE':
            triggerTranslation();
            break;
        case 'TRIGGER_CLOUD_SYNC':
            runCloudSync();
            break;
        case 'CALCULATE_STATS':
            Promise.all([
                db.getLanguageStats(),
                db.getTopicStats(),
                db.getTrendStats()
            ]).then(([languageStats, topicStats, trendStats]) => {
                notify('STATS_CALCULATED', {
                    stats: { languageStats, topicStats, trendStats },
                    requestId: payload?.requestId
                });
            });
            break;
        case 'FETCH_README':
            if (payload.repo) {
                fetchAndSummarizeReadme(payload.repo).then((summary) => {
                    if (payload.requestId) {
                        notify('README_FETCHED', { requestId: payload.requestId, repoId: payload.repo.id, summary });
                    }
                    notify('DATA_CHANGED');
                });
            }
            break;
        case 'STOP':
            isEnabled = false;
            if (pollTimer) {
                clearInterval(pollTimer);
                pollTimer = null;
            }
            break;
    }
};
