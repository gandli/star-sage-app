import React from 'react';
import { Moon, Sun, ShieldCheck, User, RefreshCw, Search, X, ChevronLeft, ChevronRight, SortDesc, SortAsc, Clock, Calendar, Star, Type, PanelLeft, Languages } from 'lucide-react';

import type { Config } from '../types';
import type { Profile } from '../hooks/useProfile';
import { useTranslationStatus } from '../hooks/useTranslationStatus';
import { useRepoStats } from '../hooks/useRepoStats';


interface HeaderProps {
    activeView: 'overview' | 'list';
    selectedLanguage: string | null;
    theme: 'light' | 'dark';
    setTheme: (theme: 'light' | 'dark') => void;
    config: Config;
    loading: boolean;
    onRefresh: () => void;

    searchQuery: string;
    setSearchQuery: (query: string) => void;
    onSearch?: () => void;
    profile: Profile | null;
    currentPage: number;
    totalPages: number;
    setCurrentPage: (page: number | ((p: number) => number)) => void;

    sortOrder: 'starred_at' | 'updated_at' | 'stargazers_count' | 'name';
    setSortOrder: (order: 'starred_at' | 'updated_at' | 'stargazers_count' | 'name') => void;
    sortDirection: 'asc' | 'desc';
    setSortDirection: (dir: 'asc' | 'desc') => void;
    onOpenMenu?: () => void;
}

const Header: React.FC<HeaderProps> = ({
    activeView,
    selectedLanguage,
    theme,
    setTheme,
    config,
    loading,
    onRefresh,
    searchQuery,
    setSearchQuery,
    onSearch,
    profile,
    currentPage,
    totalPages,
    setCurrentPage,
    sortOrder,
    setSortOrder,
    sortDirection,
    setSortDirection,
    onOpenMenu
}) => {

    const [hasUnfinishedSync, setHasUnfinishedSync] = React.useState(false);
    const isTranslating = useTranslationStatus();
    const [isSearchFocused, setIsSearchFocused] = React.useState(false);


    React.useEffect(() => {
        const checkSyncState = () => {
            const savedState = localStorage.getItem('gh_stars_sync_state');
            if (savedState) {
                try {
                    const syncState = JSON.parse(savedState);
                    const configMatches = syncState.configType === config.type && syncState.configValue === config.value;
                    const isExpired = Date.now() - syncState.lastUpdateTime > 60 * 60 * 1000;
                    setHasUnfinishedSync(configMatches && !isExpired && syncState.status === 'in_progress');
                } catch (e) {
                    setHasUnfinishedSync(false);
                }
            } else {
                setHasUnfinishedSync(false);
            }
        };

        checkSyncState();
        if (loading) {
            const timer = setTimeout(checkSyncState, 2000);
            return () => clearTimeout(timer);
        }
    }, [config.type, config.value, loading]);

    const sortOptions = [
        { value: 'starred_at', label: 'Starred At', icon: <Clock size={12} /> },
        { value: 'updated_at', label: 'Updated', icon: <Calendar size={12} /> },
        { value: 'stargazers_count', label: 'Popularity', icon: <Star size={12} /> },
        { value: 'name', label: 'Title', icon: <Type size={12} /> },
    ] as const;

    return (
        <header
            className="h-[76px] px-3 md:px-8 flex items-center justify-between backdrop-blur-3xl z-30 transition-all duration-500 border-b border-[var(--border-main)] sticky top-0 bg-[var(--bg-header)]"
        >
            {/* Left Section - Hidden when search is focused on mobile */}
            <div className={`flex items-center gap-2 md:gap-4 font-black transition-all duration-300 ${isSearchFocused ? 'opacity-0 w-0 overflow-hidden md:opacity-100 md:w-auto' : 'opacity-100'}`}>
                {/* Mobile Menu Toggle */}
                <button
                    onClick={onOpenMenu}
                    className="h-10 w-10 flex items-center justify-center rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 md:hidden hover:bg-black/10 transition-all active:scale-90"
                >
                    <PanelLeft size={18} className="text-blue-500" />
                </button>

                <div className="flex flex-col justify-center">
                    <h2 className="text-sm md:text-lg font-black tracking-tighter uppercase leading-none truncate max-w-[80px] xs:max-w-[120px] md:max-w-[240px]">
                        {activeView === 'overview' ? 'Overview' : (selectedLanguage ? `${selectedLanguage}` : 'All repos')}
                    </h2>
                    <span className="hidden xs:flex text-[9px] md:text-[10px] opacity-30 font-bold uppercase tracking-widest mt-0.5 items-center gap-2">
                        <span className="hidden sm:inline">{activeView === 'overview' ? 'Dashboard' : 'Repository List'}</span>
                        {hasUnfinishedSync && loading && (
                            <span className="text-blue-500 animate-pulse lowercase font-normal italic tracking-normal opacity-100">
                                (Resuming...)
                            </span>
                        )}
                    </span>
                </div>
            </div>

            {/* Search Box - Expands to full width on focus (mobile) */}
            <div className={`flex items-center gap-1.5 md:gap-3 transition-all duration-300 ${isSearchFocused ? 'flex-1 md:flex-initial' : 'flex-shrink-0'}`}>
                <div className={`relative flex items-center h-10 gap-2 pl-3 pr-1.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 transition-all duration-300 ${isSearchFocused ? 'w-full md:w-auto ring-2 ring-blue-500/50 border-blue-500/30' : ''} ${isSearchFocused ? 'md:w-64 lg:w-80' : 'w-24 xs:w-32 sm:w-40 md:w-56 lg:w-64'}`}>
                    <Search size={16} className="flex-shrink-0 opacity-40 text-blue-500 transition-colors" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setIsSearchFocused(false)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && searchQuery.trim() && onSearch) {
                                onSearch();
                            }
                        }}
                        placeholder="Search..."
                        className="flex-1 bg-transparent border-none outline-none text-sm font-['DM_Sans'] placeholder:opacity-50 min-w-0"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            onMouseDown={(e) => e.preventDefault()}
                            className="flex-shrink-0 p-1.5 rounded-lg opacity-50 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition-all flex justify-center items-center"
                            aria-label="Clear search"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                {activeView === 'list' && !isSearchFocused && (
                    <>
                        {/* Sort Selector - Hidden on mobile/tablet */}
                        <div className="hidden lg:flex h-10 items-center gap-1 px-1 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                            <div className="relative flex items-center h-full">
                                <select
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(e.target.value as any)}
                                    className="h-full bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-wider pl-2 pr-6 cursor-pointer appearance-none"
                                >
                                    {sortOptions.map(opt => (
                                        <option key={opt.value} value={opt.value} className="bg-[var(--bg-main)] text-[var(--text-primary)]">
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                                <ChevronRight size={10} className="absolute right-2 rotate-90 opacity-40 pointer-events-none" />
                            </div>
                            <div className="w-px h-3 bg-black/10 dark:bg-white/10" />
                            <button
                                onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                                className="h-8 w-8 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-all"
                                title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
                            >
                                {sortDirection === 'asc' ? <SortAsc size={14} className="text-blue-500" /> : <SortDesc size={14} className="text-blue-500" />}
                            </button>
                        </div>

                        {/* Pagination - Hidden on mobile, only show on larger screens */}
                        <div className="hidden sm:flex items-center h-10 gap-1 px-1 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="h-8 w-8 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-10 rounded-lg transition-all active:scale-90 cursor-pointer"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <div className="flex h-full items-center px-1 text-[9px] md:text-[10px] font-black tabular-nums opacity-60">
                                {currentPage} <span className="opacity-20 mx-1">/</span> {totalPages || 1}
                            </div>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="h-8 w-8 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-10 rounded-lg transition-all active:scale-90 cursor-pointer"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </>
                )}

                {/* Refresh Button - Smart Sync State */}
                {(() => {
                    const { totalRepos, githubCount, localCount } = useRepoStats(config.resolvedUsername || config.value);
                    const isFullySynced = githubCount > 0 && totalRepos === githubCount && localCount === githubCount;

                    return (
                        <button
                            onClick={onRefresh}
                            disabled={loading}
                            className={`h-10 w-10 flex items-center justify-center rounded-xl text-white shadow-lg transition-all hover:scale-105 active:scale-95 ${isSearchFocused ? 'hidden md:flex' : 'flex'
                                } ${loading ? 'bg-blue-500 shadow-blue-500/20 cursor-wait' :
                                    isTranslating ? 'bg-purple-500 shadow-purple-500/20 animate-pulse' :
                                        isFullySynced ? 'bg-blue-600 shadow-blue-500/20 border border-white/10' :
                                            'bg-blue-500 shadow-blue-500/20'
                                }`}
                            title={
                                loading ? 'Syncing...' :
                                    isTranslating ? 'Translating descriptions...' :
                                        isFullySynced ? 'Latest stars synced (Click to Force Sync)' :
                                            'Sync Stars with GitHub'
                            }
                        >
                            {loading ? (
                                <RefreshCw size={18} className="animate-spin" />
                            ) : isTranslating ? (
                                <Languages size={18} />
                            ) : (
                                <RefreshCw size={18} />
                            )}
                        </button>
                    );
                })()}


                {/* Profile - Hidden when search focused */}
                <div className={`hidden sm:flex items-center h-10 gap-2 md:gap-2.5 px-3 md:px-4 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 group transition-all ${isSearchFocused ? 'md:hidden lg:flex' : ''}`}>
                    {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt={`${profile.username || 'User'} profile`} className="w-5 h-5 rounded-full border border-white/20" />
                    ) : (
                        config.type === 'token' ? <ShieldCheck size={14} className="text-blue-500" /> : <User size={14} className="text-blue-500 opacity-70" />
                    )}
                    <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest max-w-[120px] truncate opacity-60 group-hover:opacity-100 transition-opacity">
                        {profile?.full_name || profile?.username || config.resolvedUsername || config.value || 'Analytic'}
                    </span>
                </div>

                {/* Theme Toggle - Hidden when search focused */}
                <button
                    onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                    className={`hidden sm:flex h-10 w-10 items-center justify-center rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all active:scale-90 ${isSearchFocused ? 'md:hidden lg:flex' : ''}`}
                >
                    {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                </button>
            </div>
        </header>
    );
};

export default Header;
