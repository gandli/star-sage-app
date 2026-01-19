import React, { useState, useEffect } from 'react';
import { LayoutDashboard, List as ListIcon, Filter, Settings, PanelLeft, LogOut, Moon, Sun } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, getLanguageColor } from '../utils/theme';
import { LanguageIcon } from './LanguageIcon';
import type { Repo, SyncProgress, Profile } from '../types';
import logo from '../assets/icon.png';

interface SidebarProps {
    activeView: 'overview' | 'list';
    setActiveView: (view: 'overview' | 'list') => void;
    repos: Repo[];
    languageStats: { name: string; value: number }[];
    selectedLanguage: string | null;
    setSelectedLanguage: (lang: string | null) => void;
    setCurrentPage: (page: number) => void;
    syncProgress: SyncProgress | null;
    onOpenSettings: () => void;
    onSignOut: () => void;
    profile: Profile | null;
    isOpen?: boolean;
    onClose?: () => void;
    theme: 'light' | 'dark';
    setTheme: (theme: 'light' | 'dark') => void;
    loading?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
    activeView,
    setActiveView,
    repos,
    languageStats,
    selectedLanguage,
    setSelectedLanguage,
    setCurrentPage,
    syncProgress,
    onOpenSettings,
    onSignOut,
    isOpen,
    onClose,
    theme,
    setTheme,
    loading
}) => {
    const [collapsed, setCollapsed] = useState(() => {
        return localStorage.getItem('gh_stars_sidebar_collapsed') === 'true';
    });

    useEffect(() => {
        localStorage.setItem('gh_stars_sidebar_collapsed', collapsed.toString());
    }, [collapsed]);

    const navItemClass = "flex items-center gap-3 px-6 py-2 mx-2 rounded-xl cursor-pointer transition-all duration-300 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.98] font-body";
    const navItemActiveClass = "bg-blue-500/10 text-blue-500 font-bold shadow-sm shadow-blue-500/5";

    // Show progress if loading OR if it's stuck in a non-100% state
    const showProgress = syncProgress && (loading || (syncProgress.total > 0 && syncProgress.current < syncProgress.total));

    return (
        <>
            {/* Mobile Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] md:hidden cursor-pointer"
                    />
                )}
            </AnimatePresence>

            <aside
                className={cn(
                    "border-r border-[var(--border-main)] flex flex-col flex-shrink-0 z-[110] backdrop-blur-2xl transition-all duration-500 relative bg-[var(--bg-sidebar)]",
                    "fixed md:relative inset-y-0 left-0",
                    collapsed ? 'w-20' : 'w-64',
                    !isOpen && "max-md:-translate-x-full"
                )}
            >
                <div className={`relative group/sidebar-header transition-all duration-300 ${collapsed ? 'h-24 flex items-center justify-center' : 'h-20 px-6 flex items-center justify-between'}`}>
                    <div
                        onClick={() => {
                            setActiveView('overview');
                            setSelectedLanguage(null);
                            setCurrentPage(1);
                        }}
                        className={cn("flex items-center gap-3 transition-all duration-300 cursor-pointer", collapsed ? "absolute inset-0 flex items-center justify-center" : "")}
                    >
                        <img
                            src={logo}
                            alt="Logo"
                            className={cn(
                                "w-8 h-8 transition-all duration-300",
                                collapsed && "group-hover/sidebar-header:opacity-0 group-hover/sidebar-header:scale-0"
                            )}
                        />
                        {!collapsed && (
                            <h2 className="text-xl font-black tracking-tight text-blue-500 whitespace-nowrap" style={{ fontFamily: 'Fira Code, monospace' }}>
                                StarSage
                            </h2>
                        )}
                    </div>

                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className={cn(
                            "p-2.5 rounded-full premium-glass text-blue-500 hover:shadow-lg hover:shadow-blue-500/20 active:scale-95 transition-all duration-300",
                            collapsed
                                ? "opacity-0 scale-0 group-hover/sidebar-header:opacity-100 group-hover/sidebar-header:scale-100"
                                : "relative opacity-100 scale-100"
                        )}
                        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        <PanelLeft size={16} className={cn("transition-transform duration-500", collapsed && "rotate-180")} />
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto py-2 space-y-1 custom-scrollbar">
                    {!collapsed && <div className="px-6 mb-2 text-[10px] uppercase font-bold tracking-widest opacity-40 font-body">Main</div>}
                    <div
                        className={cn(navItemClass, activeView === 'overview' && navItemActiveClass, collapsed && 'justify-center px-2 mx-2')}
                        onClick={() => setActiveView('overview')}
                        title={collapsed ? 'Data Overview' : ''}
                    >
                        <LayoutDashboard size={18} className={activeView === 'overview' ? "text-blue-500" : "opacity-70"} />
                        {!collapsed && <span>Data Overview</span>}
                    </div>
                    <div
                        className={cn(navItemClass, activeView === 'list' && navItemActiveClass, collapsed && 'justify-center px-2 mx-2')}
                        onClick={() => setActiveView('list')}
                        title={collapsed ? 'Starred List' : ''}
                    >
                        <ListIcon size={18} className={activeView === 'list' ? "text-blue-500" : "opacity-70"} />
                        {!collapsed && <span>Starred List</span>}
                    </div>

                    {!collapsed && <div className="mt-8 px-6 mb-2 text-[10px] uppercase font-bold tracking-widest opacity-40 font-body">Languages</div>}
                    <div
                        className={cn(navItemClass, selectedLanguage === null && activeView === 'list' && navItemActiveClass, collapsed && 'justify-center px-2 mx-2')}
                        onClick={() => { setSelectedLanguage(null); setCurrentPage(1); setActiveView('list'); }}
                        title={collapsed ? 'All' : ''}
                    >
                        <Filter size={16} className="opacity-70" />
                        {!collapsed && (
                            <>
                                All <span className="ml-auto text-[10px] tabular-nums bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded-md">{repos.length}</span>
                            </>
                        )}
                    </div>

                    {languageStats.map(lang => (
                        <div
                            key={lang.name}
                            className={cn(navItemClass, "group", selectedLanguage === lang.name && navItemActiveClass, collapsed && 'justify-center px-2 mx-2')}
                            onClick={() => { setSelectedLanguage(lang.name); setCurrentPage(1); setActiveView('list'); }}
                            title={collapsed ? lang.name : ''}
                        >
                            <LanguageIcon name={lang.name} color={getLanguageColor(lang.name)} />
                            {!collapsed && (
                                <>
                                    <span className="flex-1 truncate text-sm font-medium">{lang.name}</span>
                                    <span className="text-[10px] tabular-nums opacity-60 font-bold bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded-md">{lang.value}</span>
                                </>
                            )}
                        </div>
                    ))}
                </nav>

                <div className={`p-4 mt-auto border-t border-[var(--border-main)] space-y-4`}>
                    {showProgress && (
                        <div className={cn("px-1", collapsed ? "flex justify-center" : "space-y-2")}>
                            {(() => {
                                const percentage = Math.min(100, Math.round((syncProgress.current / (syncProgress.total || 1)) * 100));
                                return collapsed ? (
                                    <div className="relative w-8 h-8 flex items-center justify-center" title={`Syncing: ${percentage}%`}>
                                        <svg className="w-full h-full -rotate-90">
                                            <circle
                                                cx="16" cy="16" r="14"
                                                stroke="currentColor" strokeWidth="3" fill="transparent"
                                                className="text-black/5 dark:text-white/5"
                                            />
                                            <motion.circle
                                                cx="16" cy="16" r="14"
                                                stroke="url(#sync-gradient)" strokeWidth="3" fill="transparent"
                                                strokeDasharray="88"
                                                animate={{ strokeDashoffset: 88 - (88 * percentage) / 100 }}
                                                strokeLinecap="round"
                                                transition={{ type: "spring", bounce: 0, duration: 1 }}
                                            />
                                            <defs>
                                                <linearGradient id="sync-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                                    <stop offset="0%" stopColor="#3b82f6" />
                                                    <stop offset="100%" stopColor="#a855f7" />
                                                </linearGradient>
                                            </defs>
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center animate-pulse">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex justify-between text-[10px] uppercase tracking-tighter font-black opacity-50">
                                            <span className="animate-pulse">Syncing…</span>
                                            <span className="tabular-nums">{percentage}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${percentage}%` }}
                                                transition={{ type: "spring", bounce: 0, duration: 1 }}
                                            />
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    )}
                    <button
                        onClick={onOpenSettings}
                        className={`w-full h-11 flex items-center gap-2.5 text-xs font-black uppercase tracking-widest bg-black/[0.03] dark:bg-white/[0.03] border border-black/5 dark:border-white/10 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.98] transition-all duration-300 ${collapsed ? 'justify-center px-0' : 'justify-center'}`}
                        title={collapsed ? 'Settings' : ''}
                    >
                        <Settings size={14} className="opacity-70" /> {!collapsed && 'Settings'}
                    </button>
                </div>
                {/* User Account Info */}
                <div className={`mt-auto p-4 border-t border-[var(--border-main)] transition-all duration-300 ${collapsed ? 'items-center' : ''}`}>
                    {/* Theme Toggle in Sidebar (For Mobile) */}
                    <button
                        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                        className={`w-full mt-3 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all font-bold text-xs ${collapsed ? 'justify-center px-0' : ''} md:hidden`}
                        title={collapsed ? (theme === 'light' ? 'Dark Mode' : 'Light Mode') : ''}
                    >
                        {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
                        {!collapsed && <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>}
                    </button>

                    <button
                        onClick={onSignOut}
                        className={`w-full mt-3 flex items-center gap-3 px-4 py-2.5 rounded-xl text-red-500/60 hover:text-red-500 hover:bg-red-500/10 transition-all font-bold text-xs ${collapsed ? 'justify-center' : ''}`}
                    >
                        <LogOut size={16} />
                        {!collapsed && <span>Sign Out</span>}
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
