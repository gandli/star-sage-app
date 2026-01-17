import React, { useState, useEffect } from 'react';
import { LayoutDashboard, List as ListIcon, Filter, Settings, PanelLeft, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn, getLanguageColor } from '../utils/theme';
import { LanguageIcon } from './LanguageIcon';
import type { Repo, SyncProgress } from '../types';
import type { Profile } from '../hooks/useProfile';
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
    profile
}) => {
    const [collapsed, setCollapsed] = useState(() => {
        return localStorage.getItem('gh_stars_sidebar_collapsed') === 'true';
    });

    useEffect(() => {
        localStorage.setItem('gh_stars_sidebar_collapsed', collapsed.toString());
    }, [collapsed]);

    const navItemClass = "flex items-center gap-3 px-6 py-2.5 mx-2 rounded-xl cursor-pointer transition-all duration-300 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.98] font-['Fira_Sans']";
    const navItemActiveClass = "bg-blue-500/10 text-blue-500 font-bold shadow-sm shadow-blue-500/5";

    return (
        <aside
            className={`border - r border - [var(--border - main)] flex flex - col flex - shrink - 0 z - 20 backdrop - blur - 2xl transition - all duration - 500 relative bg - [var(--bg - sidebar)] ${collapsed ? 'w-20' : 'w-68'} `}
        >
            <div className={`flex items - center transition - all duration - 300 ${collapsed ? 'justify-center h-16 flex-col gap-3 pt-6' : 'justify-between h-20 px-6'} `}>
                <div className={`flex items - center gap - 3 overflow - hidden ${collapsed ? 'justify-center w-full' : ''} `}>
                    <img
                        src={logo}
                        alt="Logo"
                        className={`transition - all duration - 300 ${collapsed ? 'w-8 h-8' : 'w-8 h-8'} `}
                    />
                    {!collapsed && (
                        <h2 className="text-xl font-black tracking-tight text-blue-500 whitespace-nowrap" style={{ fontFamily: 'Fira Code, monospace' }}>
                            StarSage
                        </h2>
                    )}
                </div>

                {!collapsed && (
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="p-2.5 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 text-blue-500 hover:from-blue-500/20 hover:to-purple-500/20 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/20 active:scale-95 transition-all duration-300 backdrop-blur-sm"
                        aria-label="Collapse sidebar"
                        title="Collapse sidebar"
                    >
                        <PanelLeft size={16} className="transition-transform duration-300" />
                    </button>
                )}
            </div>

            {collapsed && (
                <div className="px-6 pb-3 flex justify-center">
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="w-8 h-8 p-1.5 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 text-blue-500 hover:from-blue-500/20 hover:to-purple-500/20 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/20 active:scale-95 transition-all duration-300 backdrop-blur-sm flex items-center justify-center"
                        aria-label="Expand sidebar"
                        title="Expand sidebar"
                    >
                        <PanelLeft size={16} className="transition-transform duration-300 rotate-180" />
                    </button>
                </div>
            )}

            <nav className="flex-1 overflow-y-auto py-2 space-y-1 custom-scrollbar">
                {!collapsed && <div className="px-6 mb-2 text-[10px] uppercase font-black tracking-widest opacity-40 font-['Fira_Sans']">Main</div>}
                <div
                    className={cn(navItemClass, activeView === 'overview' && navItemActiveClass, collapsed && 'justify-center px-2 mx-2')}
                    onClick={() => setActiveView('overview')}
                    title={collapsed ? '数据概览' : ''}
                >
                    <LayoutDashboard size={18} className={activeView === 'overview' ? "text-blue-500" : "opacity-70"} />
                    {!collapsed && <span>数据概览</span>}
                </div>
                <div
                    className={cn(navItemClass, activeView === 'list' && navItemActiveClass, collapsed && 'justify-center px-2 mx-2')}
                    onClick={() => setActiveView('list')}
                    title={collapsed ? '项目列表' : ''}
                >
                    <ListIcon size={18} className={activeView === 'list' ? "text-blue-500" : "opacity-70"} />
                    {!collapsed && <span>项目列表</span>}
                </div>

                {!collapsed && <div className="mt-8 px-6 mb-2 text-[10px] uppercase font-black tracking-widest opacity-40">Languages</div>}
                <div
                    className={cn(navItemClass, selectedLanguage === null && activeView === 'list' && navItemActiveClass, collapsed && 'justify-center px-2 mx-2')}
                    onClick={() => { setSelectedLanguage(null); setCurrentPage(1); setActiveView('list'); }}
                    title={collapsed ? '全部项目' : ''}
                >
                    <Filter size={16} className="opacity-70" />
                    {!collapsed && (
                        <>
                            全部项目 <span className="ml-auto text-[10px] tabular-nums bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded-md">{repos.length}</span>
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

            <div className={`p - 4 mt - auto border - t border - [var(--border - main)]space - y - 4`}>
                {syncProgress && (
                    <div className={cn("px-1", collapsed ? "flex justify-center" : "space-y-2")}>
                        {collapsed ? (
                            <div className="relative w-8 h-8 flex items-center justify-center" title={`Syncing: ${Math.round(syncProgress.current)}% `}>
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
                                        animate={{ strokeDashoffset: 88 - (88 * syncProgress.current) / 100 }}
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
                                    <span className="tabular-nums">{Math.round(syncProgress.current)}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${syncProgress.current}% ` }}
                                        transition={{ type: "spring", bounce: 0, duration: 1 }}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                )}
                <button
                    onClick={onOpenSettings}
                    className={`w - full h - 11 flex items - center gap - 2.5 text - xs font - black uppercase tracking - widest bg - black / [0.03] dark: bg - white / [0.03] border border - black / 5 dark: border - white / 10 rounded - xl hover: bg - black / 5 dark: hover: bg - white / 5 active: scale - [0.98] transition - all duration - 300 ${collapsed ? 'justify-center px-0' : 'justify-center'} `}
                    title={collapsed ? 'Settings' : ''}
                >
                    <Settings size={14} className="opacity-70" /> {!collapsed && 'Settings'}
                </button>
            </div>
            {/* User Account Info */}
            <div className={`mt - auto p - 4 border - t border - [var(--border - main)]transition - all duration - 300 ${collapsed ? 'items-center' : ''} `}>
                <div className={`flex items - center gap - 3 ${collapsed ? 'justify-center' : ''} p - 2 rounded - xl bg - black / 5 dark: bg - white / 5`}>
                    <div className="relative">
                        {profile?.avatar_url ? (
                            <img src={profile.avatar_url} className="w-8 h-8 rounded-full border border-blue-500/30" alt="Avatar" />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500 font-bold text-xs">
                                {profile?.username?.[0] || 'U'}
                            </div>
                        )}
                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[var(--bg-sidebar)]" />
                    </div>
                    {!collapsed && (
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold truncate">{profile?.full_name || profile?.username || 'Guest'}</p>
                            <p className="text-[10px] opacity-40 truncate">Cloud Sync Enabled</p>
                        </div>
                    )}
                </div>

                <button
                    onClick={onSignOut}
                    className={`w - full mt - 3 flex items - center gap - 3 px - 4 py - 2.5 rounded - xl text - red - 500 / 60 hover: text - red - 500 hover: bg - red - 500 / 10 transition - all font - bold text - xs ${collapsed ? 'justify-center' : ''} `}
                >
                    <LogOut size={16} />
                    {!collapsed && <span>Sign Out</span>}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
