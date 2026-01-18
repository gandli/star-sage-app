import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Loader2 } from 'lucide-react';
import { cn } from '../utils/theme';
import { db } from '../utils/db';
import { translateText } from '../utils/translate';
import { LanguageIcon } from './LanguageIcon';
import { LoadingSkeleton } from './LoadingSkeleton';
import type { Repo } from '../types';


const ZReadLogo: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn("transform transition-transform duration-700 group-hover:rotate-180", className)}>
        <path d="M4.96156 1.6001H2.24156C1.8881 1.6001 1.60156 1.88664 1.60156 2.2401V4.9601C1.60156 5.31356 1.8881 5.6001 2.24156 5.6001H4.96156C5.31502 5.6001 5.60156 5.31356 5.60156 4.9601V2.2401C5.60156 1.88664 5.31502 1.6001 4.96156 1.6001Z" fill="currentColor" />
        <path d="M4.96156 10.3999H2.24156C1.8881 10.3999 1.60156 10.6864 1.60156 11.0399V13.7599C1.60156 14.1134 1.8881 14.3999 2.24156 14.3999H4.96156C5.31502 14.3999 5.60156 14.1134 5.60156 13.7599V11.0399C5.60156 10.6864 5.31502 10.3999 4.96156 10.3999Z" fill="currentColor" />
        <path d="M13.7584 1.6001H11.0384C10.685 1.6001 10.3984 1.88664 10.3984 2.2401V4.9601C10.3984 5.31356 10.685 5.6001 11.0384 5.6001H13.7584C14.1119 5.6001 14.3984 5.31356 14.3984 4.9601V2.2401C14.3984 1.88664 14.1119 1.6001 13.7584 1.6001Z" fill="currentColor" />
        <path d="M4 12L12 4L4 12Z" fill="currentColor" />
        <path d="M4 12L12 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
);

const DeepWikiLogo: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
    <svg className={cn("transform transition-transform duration-700 group-hover:rotate-180 [&_path]:stroke-0", className)} width={size} height={size} xmlns="http://www.w3.org/2000/svg" viewBox="110 110 460 500">
        <path style={{ fill: "#21c19a" }} d="M418.73,332.37c9.84-5.68,22.07-5.68,31.91,0l25.49,14.71c.82.48,1.69.8,2.58,1.06.19.06.37.11.55.16.87.21,1.76.34,2.65.35.04,0,.08.02.13.02.1,0,.19-.03.29-.04.83-.02,1.64-.13,2.45-.32.14-.03.28-.05.42-.09.87-.24,1.7-.59,2.5-1.03.08-.04.17-.06.25-.1l50.97-29.43c3.65-2.11,5.9-6.01,5.9-10.22v-58.86c0-4.22-2.25-8.11-5.9-10.22l-50.97-29.43c-3.65-2.11-8.15-2.11-11.81,0l-50.97,29.43c-.08.04-.13.11-.2.16-.78.48-1.51,1.02-2.15,1.66-.1.1-.18.21-.28.31-.57.6-1.08,1.26-1.51,1.97-.07.12-.15.22-.22.34-.44.77-.77,1.6-1.03,2.47-.05.19-.1.37-.14.56-.22.89-.37,1.81-.37,2.76v29.43c0,11.36-6.11,21.95-15.95,27.63-9.84,5.68-22.06,5.68-31.91,0l-25.49-14.71c-.82-.48-1.69-.8-2.57-1.06-.19-.06-.37-.11-.56-.16-.88-.21-1.76-.34-2.65-.34-.13,0-.26.02-.4.02-.84.02-1.66.13-2.47.32-.13.03-.27.05-.4.09-.87.24-1.71.6-2.51,1.04-.08.04-.16.06-.24.1l-50.97,29.43c-3.65,2.11-5.9,6.01-5.9,10.22v58.86c0,4.22,2.25,8.11,5.9,10.22l50.97,29.43c.08.04.17.06.24.1.8.44,1.64.79,2.5,1.03.14.04.28.06.42.09.81.19,1.62.3,2.45.32.1,0,.19.04.29.04.04,0,.08-.02.13-.02.89,0,1.77-.13,2.65-.35.19-.04.37-.1.56-.16.88-.26,1.75-.59,2.58-1.06l25.49-14.71c9.84-5.68,22.06-5.68,31.91,0,9.84,5.68,15.95,16.27,15.95,27.63v29.43c0,.95.15,1.87.37,2.76.05.19.09.37.14.56.25.86.59,1.69,1.03,2.47.07.12.15.22.22.34.43.71.94,1.37,1.51,1.97.1.1.18.21.28.31.65.63,1.37,1.18,2.15,1.66.07.04.13.11.2.16l50.97,29.43c1.83,1.05,3.86,1.58,5.9,1.58s4.08-.53,5.9-1.58l50.97-29.43c3.65-2.11,5.9-6.01,5.9-10.22v-58.86c0-4.22-2.25-8.11-5.9-10.22l-50.97-29.43c-.08-.04-.16-.06-.24-.1-.8-.44-1.64-.8-2.51-1.04-.13-.04-.26-.05-.39-.09-.82-.2-1.65-.31-2.49-.33-.13,0-.25-.02-.38-.02-.89,0-1.78.13-2.66.35-.18.04-.36.1-.54.15-.88.26-1.75.59-2.58,1.07l-25.49,14.72c-9.84,5.68-22.07,5.68-31.9,0-9.84-5.68-15.95-16.27-15.95-27.63s6.11-21.95,15.95-27.63Z" />
        <path style={{ fill: "#3969ca" }} d="M141.09,317.65l50.97,29.43c1.83,1.05,3.86,1.58,5.9,1.58s4.08-.53,5.9-1.58l50.97-29.43c.08-.04.13-.11.2-.16.78-.48,1.51-1.02,2.15-1.66.1-.1.18-.21.28-.31.57-.6,1.08-1.26,1.51-1.97.07-.12.15-.22.22-.34.44-.77.77-1.6,1.03-2.47.05-.19.1-.37.14-.56.22-.89.37-1.81.37-2.76v-29.43c0-11.36,6.11-21.95,15.96-27.63s22.06-5.68,31.91,0l25.49,14.71c.82.48,1.69.8,2.57,1.06.19.06.37.11.56.16.87.21,1.76.34,2.64.35.04,0,.09.02.13.02.1,0,.19-.04.29-.04.83-.02,1.65-.13,2.45-.32.14-.03.28-.05.41-.09.87-.24,1.71-.6,2.51-1.04.08-.04.16-.06.24-.1l50.97-29.43c3.65-2.11,5.9-6.01,5.9-10.22v-58.86c0-4.22-2.25-8.11-5.9-10.22l-50.97-29.43c-3.65-2.11-8.15-2.11-11.81,0l-50.97,2.24c-.08,0-.13,0-.2,0-.78,0-1.51,0-2.15,0-.1,0-.18,0-.28,0-.57,0-1.08,0-1.51,0-.07,0-.15,0-.22,0-.44,0-.77,0-1.03,0-.05,0-.1,0-.14,0-.22,0-.37,0-.37,0v29.43c0,11.36-6.11,21.95-15.95,27.63-9.84,5.68-22.07,5.68-31.91,0l-25.49-14.71c-.82-.48-1.69-.8-2.58-1.06-.19-.06-.37-.11-.55-.16-.88-.21-1.76-.34-2.65-.35-.13,0-.26.02-.4.02-.83.02-1.66.13-2.47.32-.13.03-.27.05-.4.09-.87.24-1.71.6-2.51,1.04-.08.04-.16.06-.24.1l-50.97,29.43c-3.65,2.11-5.9,6.01-5.9,10.22v58.86c0,4.22,2.25,8.11,5.9,10.22Z" />
        <path style={{ fill: "#0294de" }} d="M396.88,484.35l-50.97-29.43c-.08-.04-.17-.06-.24-.1-.8-.44-1.64-.79-2.51-1.03-.14-.04-.27-.06-.41-.09-.81-.19-1.64-.3-2.47-.32-.13,0-.26-.02-.39-.02-.89,0-1.78.13-2.66.35-.18.04-.36.1-.54.15-.88.26-1.76.59-2.58,1.07l-25.49,14.72c-9.84,5.68-22.06,5.68-31.9,0-9.84-5.68-15.96-16.27-15.96-27.63v-29.43c0-.95-.15-1.87-.37-2.76-.05-.19-.09-.37-.14-.56-.25-.86-.59-1.69-1.03-2.47-.07-.12-.15-.22-.22-.34-.43-.71-.94-1.37-1.51-1.97-.1-.1-.18-.21-.28-.31-.65-.63-1.37-1.18-2.15-1.66-.07-.04-.13-.11-.2-.16l-50.97-29.43c-3.65-2.11-8.15-2.11-11.81,0l-50.97,29.43c-3.65,2.11-5.9,6.01-5.9,10.22v58.86c0,4.22,2.25,8.11,5.9,10.22l50.97,29.43c.08.04.17.06.25.1.8.44,1.63.79,2.5,1.03.14.04.29.06.43.09.8.19,1.61.3,2.43.32.1,0,.2.04.3.04.04,0,.09-.02.13-.02.88,0,1.77-.13,2.64-.34.19-.04.37-.1.56-.16.88-.26,1.75-.59,2.57-1.06l25.49-14.71c9.84-5.68,22.06-5.68,31.91,0,9.84,5.68,15.95,16.27,15.95,27.63v29.43c0,.95.15,1.87.37,2.76.05.19.09.37.14.56.25.86.59,1.69,1.03,2.47.07.12.15.22.22.34.43.71.94,1.37,1.51,1.97.1.1.18.21.28.31.65.63,1.37,1.18,2.15,1.66.07.04.13.11.2.16l50.97,29.43c1.83,1.05,3.86,1.58,5.9,1.58s4.08-.53,5.9-1.58l50.97-29.43c3.65-2.11,5.9-6.01,5.9-10.22v-58.86c0-4.22-2.25-8.11-5.9-10.22Z" />
    </svg>
);

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

    const handleTranslate = React.useCallback(async (e?: React.MouseEvent) => {
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
                return;
            }

            const translated = await translateText(textToTranslate);
            if (translated && translated.length > 0) {
                const result = translated[0];
                setTranslatedDesc(result);
                setIsTranslated(true);
                await db.saveTranslation(repo.id, result);
            }
        } catch (error) {
            console.error('Translation failed:', error);
        } finally {
            setTranslating(false);
        }
    }, [isTranslated, translatedDesc, repo.id, repo.description, readmeDesc]);

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
    }, [repo.id, repo.description, repo.readme_summary, repo.full_name, isVisible, token, readmeDesc]);



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
    }, [isVisible, repo.description, readmeDesc, fetchingReadme, isTranslated, translating, translatedDesc, index, handleTranslate]);


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
            whileHover={{
                scale: 1.02,
                transition: { duration: 0.3, ease: "easeOut" }
            }}
            className="group relative flex flex-col p-3.5 rounded-[1.25rem] premium-glass transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_15px_40px_-10px_rgba(0,0,0,0.2)] dark:hover:shadow-[0_15px_40px_-10px_rgba(0,0,0,0.4)] content-visibility-auto overflow-hidden border-[var(--border-glass)] bg-[var(--bg-glass)] h-[220px] min-w-[260px] max-w-[500px] w-full mx-auto"
        >
            <div className="absolute inset-0 rounded-[1.25rem] ring-1 ring-transparent transition-all duration-500" />

            <div className="relative z-10 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-3">
                        <div className="relative group/avatar">
                            <img src={repo.owner.avatar_url} alt={`${repo.owner.login} avatar`} className="w-8 h-8 rounded-2xl ring-2 ring-black/5 dark:ring-white/10 group-hover/avatar:scale-110 transition-all duration-300" />
                            {/* Enhanced Status Dot with pulse animation */}
                            <div className={cn(
                                "absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-black transition-all duration-500",
                                isShowingChinese ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" :
                                    (fetchingReadme || translating) ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)] animate-pulse" :
                                        "bg-zinc-300 dark:bg-zinc-700 shadow-sm"
                            )} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 transition-all duration-300">{repo.owner?.login || 'Unknown'}</span>
                            <span className="text-[9px] font-bold opacity-20 group-hover:opacity-40 transition-opacity duration-300">{formatUpdateDate(repo.updated_at)}</span>
                        </div>
                    </div>
                </div>

                <a
                    href={repo.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block group-hover:translate-x-1 transition-transform duration-300 mb-1"
                >
                    <h3 className="font-bold text-lg line-clamp-1 group-hover:scale-[1.02] origin-left transition-all duration-300 uppercase">
                        {repo.name}
                    </h3>
                </a>

                <div className="flex flex-col mb-1 flex-grow">
                    <p className={cn(
                        "text-xs font-medium opacity-60 leading-relaxed transition-all duration-500 group-hover:opacity-90 line-clamp-2",
                        isShowingChinese && "opacity-90 dark:opacity-80 font-normal leading-loose tracking-wide"
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
                    <div className="flex flex-wrap gap-2 mb-2 h-[26px] overflow-hidden">
                        {repo.topics.slice(0, 4).map(topic => (
                            <span
                                key={topic}
                                className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] border border-[var(--border-main)] group-hover:bg-black/10 dark:group-hover:bg-white/10 group-hover:scale-105 transition-all duration-300"
                            >
                                {topic}
                            </span>
                        ))}
                    </div>
                )}

                <div className="mt-auto pt-2.5 border-t border-[var(--border-main)] group-hover:border-blue-500/20 transition-colors duration-300 flex items-center justify-between h-9">
                    <div className="flex items-center gap-3">
                        {repo.language && (
                            <div className="flex items-center gap-1.5 group/lang">
                                <LanguageIcon name={repo.language} size={11} className="group-hover/lang:scale-110 transition-transform" />
                                <span className="text-[9px] font-black uppercase tracking-widest opacity-60 group-hover/lang:opacity-100 transition-all font-inter">{repo.language}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-1 group/stats">
                            <Star size={10} className="text-yellow-500 fill-yellow-500 group-hover/stats:scale-125 transition-all" />
                            <span className="text-[9px] font-black tabular-nums opacity-60 group-hover/stats:opacity-100 transition-all font-inter">{(repo.stargazers_count || 0).toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <a
                            href={`https://zread.ai/${repo.full_name}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center opacity-20 hover:opacity-100 transition-all duration-300 hover:scale-125 hover:drop-shadow-[0_0_6px_rgba(0,0,0,0.2)]"
                            title="Read in zread.ai"
                        >
                            <ZReadLogo size={16} />
                        </a>
                        <a
                            href={`https://deepwiki.com/${repo.full_name}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center opacity-20 hover:opacity-100 transition-all duration-300 hover:scale-125 hover:drop-shadow-[0_0_6px_rgba(0,0,0,0.2)]"
                            title="Read in DeepWiki"
                        >
                            <DeepWikiLogo size={16} />
                        </a>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

interface RepoListProps {
    repos: Repo[];
    token?: string;
    loading?: boolean;
    columns?: number;
}

const RepoList: React.FC<RepoListProps> = ({
    repos,
    token,
    loading = false,
    columns = 3
}) => {
    // Show skeleton when loading and repos are empty
    if (loading && repos.length === 0) {
        return (
            <div className="max-w-7xl mx-auto pb-12 pt-2">
                <div
                    className="grid gap-4"
                    style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
                >
                    <LoadingSkeleton count={Math.max(12, columns * 3)} />
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto pb-12 pt-2">
            <div
                className="grid gap-4"
                style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
            >
                <AnimatePresence mode="popLayout">
                    {repos.map((repo, idx) => (
                        <RepoCard key={repo.id} repo={repo} index={idx} token={token} />
                    ))}
                </AnimatePresence>
            </div>

            {repos.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center py-32 opacity-20">
                    <Star size={64} className="mb-4" />
                    <p className="font-black uppercase tracking-widest text-sm">No Projects Found…</p>
                </div>
            )}
        </div>
    );
};

export default RepoList;
