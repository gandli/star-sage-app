import React from 'react';
import { LayoutDashboard, List as ListIcon, Moon, Sun, ShieldCheck, User, RefreshCw, Search, X, ChevronLeft, ChevronRight } from 'lucide-react';

import type { Config } from '../types';
import type { Profile } from '../hooks/useProfile';

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
    setCurrentPage
}) => {

    const [hasUnfinishedSync, setHasUnfinishedSync] = React.useState(false);

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
        // 初始检查后，如果正在 loading，过一会儿再查一次（因为同步开始后会更新 localStorage）
        if (loading) {
            const timer = setTimeout(checkSyncState, 2000);
            return () => clearTimeout(timer);
        }
    }, [config.type, config.value, loading]);

    return (
        <header
            className="h-[76px] px-8 flex items-center justify-between backdrop-blur-3xl z-30 transition-all duration-500 border-b border-[var(--border-main)] sticky top-0 bg-[var(--bg-header)]"
        >
            <div className="flex items-center gap-4 font-black">
                <div className="p-1.5 rounded-lg bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10">
                    {activeView === 'overview' ? <LayoutDashboard size={14} /> : <ListIcon size={14} />}
                </div>
                <div className="flex flex-col">
                    <h2 className="text-lg font-black tracking-tighter uppercase leading-none truncate max-w-[240px]">
                        {activeView === 'overview' ? 'Overview' : (selectedLanguage ? `${selectedLanguage} Projects` : 'All Repositories')}
                    </h2>
                    <span className="text-[10px] opacity-30 font-bold uppercase tracking-widest mt-0.5 flex items-center gap-2">
                        {activeView === 'overview' ? 'Dashboard' : 'Repository List'}
                        {hasUnfinishedSync && loading && (
                            <span className="text-blue-500 animate-pulse lowercase font-normal italic tracking-normal opacity-100">
                                (Resuming...)
                            </span>
                        )}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
                {/* Search Box */}
                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && searchQuery.trim() && onSearch) {
                                onSearch();
                            }
                        }}
                        placeholder="Search repos..."
                        className="pl-10 pr-10 py-2 w-64 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-['Fira_Sans']"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-100 transition-opacity"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                {activeView === 'list' && (
                    <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 mx-1">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-10 rounded-lg transition-all active:scale-90 cursor-pointer"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <div className="px-2 text-[10px] font-black tabular-nums opacity-60">
                            {currentPage} <span className="opacity-20">/</span> {totalPages || 1}
                        </div>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-10 rounded-lg transition-all active:scale-90 cursor-pointer"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                )}

                <button
                    onClick={onRefresh}
                    className="p-2.5 rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all"
                >
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                </button>

                <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 group transition-all">
                    {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="Profile" className="w-5 h-5 rounded-full border border-white/20" />
                    ) : (
                        config.type === 'token' ? <ShieldCheck size={14} className="text-blue-500" /> : <User size={14} className="text-blue-500 opacity-70" />
                    )}
                    <span className="text-[10px] font-black uppercase tracking-widest max-w-[120px] truncate opacity-60 group-hover:opacity-100 transition-opacity">
                        {profile?.full_name || profile?.username || config.resolvedUsername || config.value || 'Analytic Mode'}
                    </span>
                </div>

                <div className="h-8 w-px bg-black/5 dark:bg-white/10 mx-1" />

                <button
                    onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                    className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all active:scale-90"
                >
                    {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                </button>




            </div>
        </header>
    );
};

export default Header;
