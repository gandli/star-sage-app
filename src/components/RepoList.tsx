import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ExternalLink, ChevronLeft, ChevronRight, Loader2, Languages } from 'lucide-react';
import { cn, getLanguageColor } from '../utils/theme';
import { db } from '../utils/db';
import { LanguageIcon } from './LanguageIcon';
import type { Repo } from '../types';

interface RepoCardProps {
    repo: Repo;
    index: number;
}

const RepoCard: React.FC<RepoCardProps> = ({ repo, index }) => {
    const [readmeDesc, setReadmeDesc] = React.useState<string | null>(null);
    const [translatedDesc, setTranslatedDesc] = React.useState<string | null>(null);
    const [fetchingReadme, setFetchingReadme] = React.useState(false);
    const [isTranslating, setIsTranslating] = React.useState(false);

    // Format date to relative time or readable string
    const formatUpdateDate = (dateString: string) => {
        if (!dateString) return 'Update required';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Update required';

        const now = new Date();
        const diffInt = now.getTime() - date.getTime();
        const days = Math.floor(diffInt / (1000 * 60 * 60 * 24));

        if (days === 0) return 'Last commit today';
        if (days === 1) return 'Last commit yesterday';
        if (days < 30) return `Last commit ${days} days ago`;

        return `Last commit on ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    };

    const cleanMarkdown = (markdown: string) => {
        return markdown
            .replace(/^#+.*$/gm, '') // 移除标题
            .replace(/!\[.*\]\(.*\)/g, '') // 移除图片
            .replace(/\[(.*?)\]\(.*?\)/g, '$1') // 移除链接但保留文字
            .replace(/`{3}[\s\S]*?`{3}/g, '') // 移除代码块
            .replace(/`(.+?)`/g, '$1') // 移除行内代码
            .replace(/[*-] /g, '') // 移除列表符号
            .replace(/<!--[\s\S]*?-->/g, '') // 移除 HTML 注释
            .replace(/<[^>]*>?/gm, '') // 移除 HTML 标签
            .split('\n')
            .map(p => p.trim())
            .filter(p => p.length > 10)[0] || ''; // 获取第一个有意义的长段落
    };

    React.useEffect(() => {
        if (repo.description) return;

        const getReadmeSummary = async () => {
            const cacheKey = `readme_summary_${repo.id}`;
            try {
                // 1. 尝试从缓存获取
                const cached = await db.get(cacheKey);
                if (cached) {
                    setReadmeDesc(cached);
                    return;
                }

                // 2. 只有在没有缓存且没有描述时才发起请求
                setFetchingReadme(true);
                const response = await fetch(`https://api.github.com/repos/${repo.full_name}/readme`, {
                    headers: { 'Accept': 'application/vnd.github.v3+json' }
                });

                if (response.ok) {
                    const data = await response.json();
                    const content = atob(data.content.replace(/\n/g, ''));
                    const summary = cleanMarkdown(content).substring(0, 160);

                    if (summary) {
                        setReadmeDesc(summary + '...');
                        await db.set(cacheKey, summary + '...');
                    }
                }
            } catch (e) {
                console.error('Failed to fetch README:', e);
            } finally {
                setFetchingReadme(false);
            }
        };

        getReadmeSummary();
    }, [repo.id, repo.description, repo.full_name]);

    // Handle translation
    React.useEffect(() => {
        const textToTranslate = repo.description || readmeDesc;
        if (!textToTranslate) return;

        // Simple check if already looks like Chinese
        if (/[\u4e00-\u9fa5]/.test(textToTranslate)) {
            setTranslatedDesc(textToTranslate);
            return;
        }

        const translateText = async () => {
            const cacheKey = `trans_${repo.id}_${textToTranslate.length}`;
            try {
                const cached = await db.get(cacheKey);
                if (cached) {
                    setTranslatedDesc(cached);
                    return;
                }

                setIsTranslating(true);
                const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(textToTranslate)}&langpair=en|zh-CN`);
                const data = await res.json();

                if (data.responseData?.translatedText) {
                    const translated = data.responseData.translatedText;
                    setTranslatedDesc(translated);
                    await db.set(cacheKey, translated);
                }
            } catch (e) {
                console.error('Translation failed:', e);
            } finally {
                setIsTranslating(false);
            }
        };

        const timer = setTimeout(translateText, 500); // Debounce
        return () => clearTimeout(timer);
    }, [repo.id, repo.description, readmeDesc]);

    const hasTopics = repo.topics && repo.topics.length > 0;
    const currentDesc = translatedDesc || repo.description || readmeDesc;
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
                delay: (index % 12) * 0.05,
                type: "spring",
                stiffness: 100,
                damping: 15
            }}
            className="group relative flex flex-col p-8 rounded-[2.5rem] premium-glass transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-500/10 content-visibility-auto overflow-hidden border-[var(--border-glass)] bg-[var(--bg-glass)]"
        >
            {/* Subtle glow effect on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative z-10 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="relative group/avatar">
                            <img src={repo.owner.avatar_url} alt={`${repo.owner.login} avatar`} className="w-8 h-8 rounded-2xl ring-2 ring-black/5 dark:ring-white/10 group-hover/avatar:scale-110 transition-transform duration-300" />
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-black bg-green-500 shadow-sm" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 group-hover:opacity-100 transition-opacity duration-300">{repo.owner?.login || 'Unknown'}</span>
                            <span className="text-[9px] font-bold opacity-20">{formatUpdateDate(repo.updated_at)}</span>
                        </div>
                    </div>
                    <a
                        href={repo.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 flex items-center justify-center rounded-2xl bg-black/5 dark:bg-white/5 opacity-40 group-hover:opacity-100 group-hover:bg-blue-500 group-hover:text-white group-hover:rotate-12 group-hover:scale-110 transition-all duration-300"
                        title="Open in GitHub"
                    >
                        <ExternalLink size={16} />
                    </a>
                </div>

                <h3 className="font-black text-xl mb-4 line-clamp-1 group-hover:text-blue-500 transition-colors duration-300 uppercase tracking-tighter">
                    {repo.name}
                </h3>

                <div className="flex flex-col mb-6">
                    <p className={cn(
                        "text-xs font-medium opacity-40 leading-relaxed transition-all duration-500 group-hover:opacity-70",
                        hasTopics ? "line-clamp-3" : "line-clamp-6"
                    )}>
                        {fetchingReadme ? (
                            <span className="flex items-center gap-2 italic">
                                <Loader2 size={12} className="animate-spin" /> Deep searching README...
                            </span>
                        ) : (
                            currentDesc || 'No project manifest found.'
                        )}
                    </p>
                    {isTranslating && !translatedDesc && (
                        <div className="mt-2 flex items-center gap-1.5 opacity-20 text-[9px] font-bold italic animate-pulse">
                            <Languages size={10} /> Optimizing language localization...
                        </div>
                    )}
                </div>

                {/* Topics section */}
                {repo.topics && repo.topics.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-8">
                        {repo.topics.slice(0, 4).map(topic => (
                            <span
                                key={topic}
                                className="text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg bg-blue-500/5 text-blue-500/60 border border-blue-500/10 group-hover:bg-blue-500/10 group-hover:text-blue-500 transition-all duration-300"
                            >
                                {topic}
                            </span>
                        ))}
                        {repo.topics.length > 4 && (
                            <span className="text-[9px] font-bold opacity-20 self-center">+{repo.topics.length - 4}</span>
                        )}
                    </div>
                )}

                <div className="mt-auto pt-6 border-t border-[var(--border-main)] flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        {repo.language && (
                            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 group/lang transition-colors hover:bg-black/10 dark:hover:bg-white/10">
                                <LanguageIcon name={repo.language} size={14} />
                                <span className="text-[10px] font-black uppercase tracking-widest">{repo.language}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2 group/stats">
                            <Star size={12} className="text-yellow-500 fill-yellow-500 group-hover/stats:scale-125 transition-transform" />
                            <span className="text-[11px] font-black tabular-nums opacity-60 group-hover/stats:opacity-100 transition-opacity">{(repo.stargazers_count || 0).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

interface RepoListProps {
    repos: Repo[];
    selectedLanguage: string | null;
    currentPage: number;
    totalPages: number;
    setCurrentPage: (page: number | ((p: number) => number)) => void;
}

const RepoList: React.FC<RepoListProps> = ({
    repos,
    selectedLanguage,
    currentPage,
    totalPages,
    setCurrentPage
}) => {
    return (
        <div className="max-w-7xl mx-auto pb-12">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-12">
                <div className="space-y-1">
                    <h2 className="text-4xl font-black tracking-tighter uppercase text-balance">
                        {selectedLanguage ? `${selectedLanguage} Projects` : 'All Repositories'}
                    </h2>
                    <p className="text-sm font-medium opacity-40">Sync with PAT to unlock full history and private stars.</p>
                </div>

                <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/5 dark:border-white/10 backdrop-blur-sm">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-2.5 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-20 rounded-xl transition-all active:scale-90 cursor-pointer"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <div className="px-4 text-[10px] font-black uppercase tracking-[0.2em] opacity-60 tabular-nums">
                        {currentPage} <span className="opacity-30 mx-1">/</span> {totalPages || 1}
                    </div>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2.5 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-20 rounded-xl transition-all active:scale-90 cursor-pointer"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                <AnimatePresence mode="popLayout">
                    {repos.map((repo, idx) => (
                        <RepoCard key={repo.id} repo={repo} index={idx} />
                    ))}
                </AnimatePresence>
            </div>

            {repos.length === 0 && (
                <div className="flex flex-col items-center justify-center py-32 opacity-20">
                    <Star size={64} className="mb-4" />
                    <p className="font-black uppercase tracking-widest text-sm">No Projects Found…</p>
                </div>
            )}
        </div>
    );
};

export default RepoList;
