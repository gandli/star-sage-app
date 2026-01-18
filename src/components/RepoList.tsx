// Final cleanup: removed all translation logic. ReferenceError in browser is likely due to stale cache.
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ExternalLink, Loader2 } from 'lucide-react';
import { cn } from '../utils/theme';
import { db } from '../utils/db';
import { translateText } from '../utils/translate';
import { LanguageIcon } from './LanguageIcon';
import type { Repo } from '../types';


interface RepoCardProps {
    repo: Repo;
    index: number;
    token?: string;
}

const RepoCard: React.FC<RepoCardProps> = ({ repo, index, token }) => {
    // 优先使用 repo.readme_summary，如果没有则动态获取
    const [readmeDesc, setReadmeDesc] = React.useState<string | null>(repo.readme_summary || null);
    const [fetchingReadme, setFetchingReadme] = React.useState(false);
    const [translating, setTranslating] = React.useState(false);
    // Initialize with description_cn if available, otherwise null
    const [translatedDesc, setTranslatedDesc] = React.useState<string | null>(repo.description_cn || null);
    const [isTranslated, setIsTranslated] = React.useState(!!repo.description_cn);

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
        const lines = markdown
            .replace(/<!--[\s\S]*?-->/g, '') // Remove HTML comments first
            .replace(/^#+.*$/gm, '') // Remove headers
            .replace(/!\[.*\]\(.*\)/g, '') // Remove images
            .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links but keep text
            .replace(/`{3}[\s\S]*?`{3}/g, '') // Remove code blocks
            .replace(/`(.+?)`/g, '$1') // Remove inline code
            .replace(/^\s*[-*+]\s+/gm, '') // Remove list bullets
            .replace(/<[^>]*>?/gm, '') // Remove HTML tags
            .replace(/&[a-z]+;/g, '') // Remove HTML entities
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        // Filter out common badge lines or short non-sentence lines
        const meaningfulLines = lines.filter(line => {
            // Skip lines that look like CI status, badges, or are too short to be descriptive
            if (line.includes('[!') || line.includes('build') || line.includes('license') || line.length < 10) return false;
            // Skip lines that are just symbols
            if (/^[#\s\-*+=!]+$/.test(line)) return false;
            return true;
        });

        // Join the first few meaningful lines
        return meaningfulLines.slice(0, 3).join(' ').substring(0, 300);
    };

    const cardRef = React.useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = React.useState(false);

    // Viewport Detection
    React.useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.1 }
        );

        if (cardRef.current) observer.observe(cardRef.current);
        return () => observer.disconnect();
    }, []);

    React.useEffect(() => {
        // Only fetch if description is actually missing or too short
        const hasNoDesc = !repo.description || repo.description.length < 5;
        const hasNoSummary = !repo.readme_summary && !readmeDesc;

        if (!hasNoDesc && !hasNoSummary) {
            if (repo.readme_summary && !readmeDesc) {
                setReadmeDesc(repo.readme_summary);
            }
            return;
        }

        if (!isVisible || !hasNoDesc) return;

        const getReadmeSummary = async () => {
            try {
                setFetchingReadme(true);
                const headers: HeadersInit = { 'Accept': 'application/vnd.github.v3+json' };
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
                const response = await fetch(`https://api.github.com/repos/${repo.full_name}/readme`, {
                    headers
                });

                if (response.ok) {
                    const data = await response.json();

                    // Correcting Base64 to UTF-8
                    const binaryString = atob(data.content.replace(/\s/g, ''));
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    const content = new TextDecoder('utf-8').decode(bytes);

                    const summary = cleanMarkdown(content);

                    if (summary) {
                        const finalSummary = summary + (summary.length >= 300 ? '...' : '');
                        setReadmeDesc(finalSummary);
                        await db.saveReadmeSummary(repo.id, finalSummary);
                    }
                }
            } catch (e) {
                console.error('Failed to fetch README:', e);
            } finally {
                setFetchingReadme(false);
            }
        };

        getReadmeSummary();
    }, [repo.id, repo.description, repo.readme_summary, repo.full_name, isVisible, token]);

    // --- Auto Translate Logic ---
    React.useEffect(() => {
        // If we already have a translation (from prop or previous fetch), don't do anything
        if (isTranslated || translatedDesc) return;
        if (!isVisible || translating) return;

        const currentDesc = repo.description || readmeDesc;
        // Don't translate if we are still fetching readme or if no description to translate
        if (!currentDesc || fetchingReadme) return;

        // Simple check to avoid translating if it looks like Chinese
        const isChinese = /[\u4e00-\u9fa5]/.test(currentDesc);
        if (isChinese) return;

        // Small delay to prevent initial load congestion
        const timer = setTimeout(() => {
            handleTranslate();
        }, 300 + (index % 5) * 100);

        return () => clearTimeout(timer);
    }, [isVisible, repo.description, readmeDesc, fetchingReadme, isTranslated, translating, translatedDesc, index]);

    const handleTranslate = async (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        if (isTranslated || translatedDesc) return;

        const textToTranslate = repo.description || readmeDesc;
        if (!textToTranslate) return;

        setTranslating(true);
        try {
            // Double check DB
            const cached = await db.getTranslation(repo.id);

            if (cached) {
                setTranslatedDesc(cached);
                setIsTranslated(true);
            } else {
                const results = await translateText(textToTranslate, 'zh');
                if (results && results.length > 0) {
                    const translated = results[0];
                    setTranslatedDesc(translated);
                    setIsTranslated(true);
                    await db.saveTranslation(repo.id, translated);
                }
            }
        } catch (error) {
            console.error('Translation failed:', error);
        } finally {
            setTranslating(false);
        }
    };


    const currentDesc = repo.description || readmeDesc;
    const isSourceChinese = currentDesc ? /[\u4e00-\u9fa5]/.test(currentDesc) : false;
    const isShowingChinese = !!translatedDesc || isSourceChinese;
    const displayDesc = translatedDesc || currentDesc || 'No project manifest found.';

    return (
        <motion.div
            ref={cardRef}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
                delay: (index % 12) * 0.05,
                type: "spring",
                stiffness: 100,
                damping: 15
            }}
            className="group relative flex flex-col p-5 rounded-[2rem] premium-glass transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-500/10 content-visibility-auto overflow-hidden border-[var(--border-glass)] bg-[var(--bg-glass)] h-[300px]"
        >
            {/* Subtle glow effect on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative z-10 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="relative group/avatar">
                            <img src={repo.owner.avatar_url} alt={`${repo.owner.login} avatar`} className="w-8 h-8 rounded-2xl ring-2 ring-black/5 dark:ring-white/10 group-hover/avatar:scale-110 transition-transform duration-300" />
                            {/* Status Dot: Green if translated/chinese, blue if syncing, gray otherwise */}
                            <div className={cn(
                                "absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-black transition-all duration-500 shadow-sm",
                                isShowingChinese ? "bg-green-500 shadow-green-500/20" :
                                    (fetchingReadme || translating) ? "bg-blue-500 animate-pulse shadow-blue-500/20" :
                                        "bg-zinc-300 dark:bg-zinc-700"
                            )} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 group-hover:opacity-100 transition-opacity duration-300">{repo.owner?.login || 'Unknown'}</span>
                            <span className="text-[9px] font-bold opacity-20">{formatUpdateDate(repo.updated_at)}</span>
                        </div>
                    </div>
                </div>

                <a
                    href={repo.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block group-hover:translate-x-1 transition-transform duration-300 mb-2"
                >
                    <h3 className="font-black text-xl line-clamp-1 group-hover:text-blue-500 transition-colors duration-300 uppercase tracking-tighter">
                        {repo.name}
                    </h3>
                </a>

                <div className="flex flex-col mb-3 flex-grow">
                    <p className={cn(
                        "text-xs font-medium opacity-60 leading-relaxed transition-all duration-500 group-hover:opacity-90 line-clamp-4 h-[75px]",
                        isShowingChinese && "opacity-90 dark:opacity-80 font-normal"
                    )}>
                        {fetchingReadme ? (
                            <span className="flex items-center gap-2 italic">
                                <Loader2 size={12} className="animate-spin" /> Deep searching...
                            </span>
                        ) : (
                            displayDesc
                        )}
                    </p>
                </div>

                {/* Topics section */}
                {repo.topics && repo.topics.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3 h-[26px] overflow-hidden">
                        {repo.topics.slice(0, 4).map(topic => (
                            <span
                                key={topic}
                                className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-blue-500/5 text-blue-500/60 border border-blue-500/10 group-hover:bg-blue-500/10 group-hover:text-blue-500 transition-all duration-300"
                            >
                                {topic}
                            </span>
                        ))}
                    </div>
                )}

                <div className="mt-auto pt-4 border-t border-[var(--border-main)] flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {repo.language && (
                            <div className="flex items-center gap-2 group/lang">
                                <LanguageIcon name={repo.language} size={12} />
                                <span className="text-[9px] font-black uppercase tracking-widest opacity-60 group-hover/lang:opacity-100 transition-opacity">{repo.language}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-1.5 group/stats">
                            <Star size={11} className="text-yellow-500 fill-yellow-500 group-hover/stats:scale-125 transition-transform" />
                            <span className="text-[10px] font-black tabular-nums opacity-60 group-hover/stats:opacity-100 transition-opacity">{(repo.stargazers_count || 0).toLocaleString()}</span>
                        </div>
                    </div>

                    <a
                        href={repo.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="opacity-20 hover:opacity-100 hover:text-blue-500 transition-all duration-300 hover:scale-110"
                    >
                        <ExternalLink size={14} />
                    </a>
                </div>
            </div>
        </motion.div>
    );
};

interface RepoListProps {
    repos: Repo[];
    token?: string;
}

const RepoList: React.FC<RepoListProps> = ({
    repos,
    token
}) => {
    return (
        <div className="max-w-7xl mx-auto pb-12 pt-2">

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                <AnimatePresence mode="popLayout">
                    {repos.map((repo, idx) => (
                        <RepoCard key={repo.id} repo={repo} index={idx} token={token} />
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
