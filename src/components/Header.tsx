import React from 'react';
import { LayoutDashboard, List as ListIcon, Moon, Sun, ShieldCheck, User, RefreshCw, Search, X } from 'lucide-react';
import { cn } from '../utils/theme';
import type { Config } from '../types';

interface HeaderProps {
    activeView: 'overview' | 'list';
    selectedLanguage: string | null;
    theme: 'light' | 'dark';
    setTheme: (theme: 'light' | 'dark') => void;
    config: Config;
    loading: boolean;
    onRefresh: () => void;
    onRefresh: () => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    onSearch?: () => void;
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
    onSearch
}) => {
    const glassClass = "bg-[var(--card-bg)] backdrop-blur-xl border border-[var(--glass-border)] rounded-2xl shadow-sm transition-all duration-300";

    return (
        <header
            className="h-[76px] px-8 flex items-center justify-between backdrop-blur-3xl z-30 transition-all duration-500 border-b border-[var(--border-main)] sticky top-0 bg-[var(--bg-header)]"
        >
            <div className="flex items-center gap-3 font-black text-sm uppercase tracking-widest opacity-80">
                <div className="p-1.5 rounded-lg bg-black/5 dark:bg-white/5">
                    {activeView === 'overview' ? <LayoutDashboard size={14} /> : <ListIcon size={14} />}
                </div>
                <span className="truncate max-w-[200px]">
                    {activeView === 'overview' ? 'Overview' : selectedLanguage || 'Projects'}
                </span>
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

                <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 group transition-all">
                    {config.type === 'token' ? <ShieldCheck size={14} className="text-blue-500" /> : <User size={14} className="text-blue-500 opacity-70" />}
                    <span className="text-[10px] font-black uppercase tracking-widest max-w-[120px] truncate opacity-60 group-hover:opacity-100 transition-opacity">{config.resolvedUsername || config.value || 'None'}</span>
                </div>

                <div className="h-8 w-px bg-black/5 dark:bg-white/10 mx-1" />

                <button
                    onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                    className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all active:scale-90"
                >
                    {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                </button>

                <button
                    onClick={onRefresh}
                    className="p-2.5 rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all"
                >
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>
        </header>
    );
};

export default Header;
