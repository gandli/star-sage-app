import React, { useState, useEffect, useMemo, Suspense, lazy, useRef, useTransition } from 'react';
import { Star, Code2, History, AlertCircle, X, Loader2, ArrowUp, Languages } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import RepoList from './components/RepoList';
import SettingsModal from './components/SettingsModal';
import { useGithubSync } from './hooks/useGithubSync';
import { useAuth } from './hooks/useAuth';

import { useProfile } from './hooks/useProfile';
import { AuthScreen } from './components/AuthScreen';
import type { Config } from './types';


// Lazy load heavy charts
const Charts = lazy(() => import('./components/Charts'));


// const ITEMS_PER_PAGE = 30;

const App: React.FC = () => {
  // --- Auth & Config State ---
  const { session, user, loading: authLoading, signOut } = useAuth();
  const { profile, updateCloudConfig } = useProfile(user);

  // Initialize config - prioritize local storage, but will override if github token is present
  const [sessionMethodsCheck, setSessionMethodsCheck] = useState(false);

  const [config, setConfig] = useState<Config>(() => {
    const saved = localStorage.getItem('gh_stars_config');
    const base = saved ? JSON.parse(saved) : { type: 'username', value: '' };
    return { ...base, autoTranslate: true };
  });

  // Auto-configure with Provider Token if available
  useEffect(() => {
    if (session?.provider_token) {
      // If we have a direct GitHub token from OAuth, use it!
      const newConfig: Config = {
        type: 'token',
        value: session.provider_token,
        resolvedUsername: session.user.user_metadata.user_name || session.user.user_metadata.name // Try to get username
      };
      // Only update if different to avoid loop
      if (JSON.stringify(config) !== JSON.stringify(newConfig)) {
        setConfig(newConfig);
        localStorage.setItem('gh_stars_config', JSON.stringify(newConfig));
        // Trigger fetch immediately handled by effect below
      }
    } else if (session && !config.value && !sessionMethodsCheck) {
      // Fallback: If logged in via email but no config, maybe try to use username from metadata if available, or just leave it
      // Ideally we prompt user, but for now let's just mark checked
      setSessionMethodsCheck(true);
    }
  }, [session]);

  // Sync Cloud config to Local
  useEffect(() => {
    if (profile?.config_type && profile?.config_value) {
      const cloudConfig: Config = {
        type: profile.config_type as 'username' | 'token',
        value: profile.config_value,
        resolvedUsername: profile.resolved_username || undefined
      };

      // If we don't have a local config or the cloud one is different (and we are not using provider_token which is dynamic)
      if (!session?.provider_token && JSON.stringify(config) !== JSON.stringify(cloudConfig)) {
        setConfig(cloudConfig);
        localStorage.setItem('gh_stars_config', JSON.stringify(cloudConfig));
      }
    }
  }, [profile, session, config]);

  // Sync Local config to Cloud (Debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (user && config.value && (config.type !== 'token' || config.value !== session?.provider_token)) {
        updateCloudConfig(config);
      }
    }, 5000); // 5s debounce for cloud sync
    return () => clearTimeout(timer);
  }, [config, user, session, updateCloudConfig]);


  // --- States ---
  const [, startTransition] = useTransition();
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('gh_stars_theme') as 'light' | 'dark') || 'light';
  });

  // ... (rest of state items: showSettings, tempConfig, etc.)
  const [showSettings, setShowSettings] = useState(false); // Default false, will open if needed
  const [tempConfig, setTempConfig] = useState<Config>(config);
  const [activeView, setActiveView] = useState<'overview' | 'list'>(() => {
    return (localStorage.getItem('gh_stars_view') as 'overview' | 'list') || 'overview';
  });
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(() => {
    return localStorage.getItem('gh_stars_language');
  });

  const [currentPage, setCurrentPage] = useState(() => {
    return parseInt(localStorage.getItem('gh_stars_page') || '1', 10);
  });
  const [searchQuery, setSearchQuery] = useState(() => {
    return localStorage.getItem('gh_stars_search') || '';
  });
  const [itemsPerPage] = useState(() => {
    const saved = localStorage.getItem('gh_stars_items_per_page');
    return saved ? parseInt(saved, 10) : 30;
  });

  const [sortOrder, setSortOrder] = useState<'starred_at' | 'updated_at' | 'stargazers_count' | 'name'>(() => {
    return (localStorage.getItem('gh_stars_sort_order') as any) || 'starred_at';
  });
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(() => {
    return (localStorage.getItem('gh_stars_sort_direction') as any) || 'desc';
  });

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isMounted = useRef(false);

  const { repos, loading, syncProgress, error, setError, fetchAllStars } = useGithubSync(config);

  // Close mobile menu on navigate
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [activeView, selectedLanguage]);

  // --- Effects ---
  useEffect(() => {
    localStorage.setItem('gh_stars_sort_order', sortOrder);
    if (isMounted.current) {
      setCurrentPage(1);
    }
  }, [sortOrder]);

  useEffect(() => {
    localStorage.setItem('gh_stars_sort_direction', sortDirection);
    if (isMounted.current) {
      setCurrentPage(1);
    }
  }, [sortDirection]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('gh_stars_theme', theme);
  }, [theme]);

  // Persist current page
  useEffect(() => {
    localStorage.setItem('gh_stars_page', currentPage.toString());
  }, [currentPage]);

  // ... (keeping other effects)

  useEffect(() => {
    localStorage.setItem('gh_stars_view', activeView);
  }, [activeView]);

  useEffect(() => {
    if (selectedLanguage) {
      localStorage.setItem('gh_stars_language', selectedLanguage);
    } else {
      localStorage.removeItem('gh_stars_language');
    }
    if (isMounted.current) {
      setCurrentPage(1);
    }
  }, [selectedLanguage]);

  useEffect(() => {
    localStorage.setItem('gh_stars_search', searchQuery);
    if (isMounted.current) {
      setCurrentPage(1);
    }
  }, [searchQuery]);

  // IMPORTANT: Set to true AFTER initial mount effects have run to prevent reset-to-page-1 bug
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // 如果登录但没有配置，打开设置面板
  useEffect(() => {
    if (!config.value && session && !showSettings && !authLoading) {
      setShowSettings(true);
    }
  }, [config.value, session, showSettings, authLoading]);

  // Reload config when sync completes to get resolvedUsername
  useEffect(() => {
    if (!loading && !syncProgress) {
      if (config.type === 'token' && !config.resolvedUsername) {
        // If we just synced with a token but have no username, we might want to fetch it
        // useGithubSync handles simple fetching, but maybe we explicitly verify here
      }
    }
  }, [loading, syncProgress, config]);

  // Scroll to top button visibility
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setShowScrollTop(container.scrollTop > 300);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [session]);

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // --- Memoized Data --- 
  // (Keeping all memos...)
  const languageStats = useMemo(() => {
    const stats: Record<string, number> = {};
    repos.forEach(repo => {
      const lang = repo.language || 'Unknown';
      stats[lang] = (stats[lang] || 0) + 1;
    });
    return Object.entries(stats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [repos]);

  const filteredRepos = useMemo(() => {
    if (!selectedLanguage) return repos;
    return repos.filter(r => (r.language || 'Unknown') === selectedLanguage);
  }, [repos, selectedLanguage]);

  const searchedRepos = useMemo(() => {
    if (!searchQuery.trim()) return filteredRepos;
    const query = searchQuery.toLowerCase();
    return filteredRepos.filter(repo =>
      repo.name.toLowerCase().includes(query) ||
      repo.description?.toLowerCase().includes(query) ||
      (repo.owner?.login || '').toLowerCase().includes(query)
    );
  }, [filteredRepos, searchQuery]);

  const sortedRepos = useMemo(() => {
    return [...searchedRepos].sort((a, b) => {
      let valA: any = a[sortOrder];
      let valB: any = b[sortOrder];

      // Handle missing values
      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      // Special handling for dates
      if (sortOrder === 'starred_at' || sortOrder === 'updated_at') {
        valA = valA ? new Date(valA).getTime() : 0;
        valB = valB ? new Date(valB).getTime() : 0;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [searchedRepos, sortOrder, sortDirection]);

  const paginatedRepos = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedRepos.slice(start, start + itemsPerPage);
  }, [sortedRepos, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(searchedRepos.length / itemsPerPage);

  const pieData = useMemo(() => {
    if (languageStats.length <= 8) return languageStats;
    const top = languageStats.slice(0, 7);
    const othersValue = languageStats.slice(7).reduce((acc, curr) => acc + curr.value, 0);
    return [...top, { name: 'Others', value: othersValue }];
  }, [languageStats]);

  const hotTopics = useMemo(() => {
    const topicCounts: Record<string, number> = {};
    repos.forEach(repo => {
      repo.topics?.forEach(topic => {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      });
    });
    return Object.entries(topicCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [repos]);

  const starTrends = useMemo(() => {
    const trends: Record<string, number> = {};
    repos.forEach(repo => {
      if (repo.starred_at) {
        const date = new Date(repo.starred_at);
        const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        trends[month] = (trends[month] || 0) + 1;
      }
    });
    return Object.entries(trends)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [repos]);

  const translationStats = useMemo(() => {
    const translatedCount = repos.filter(r =>
      r.description_cn || (r.description && /[\u4e00-\u9fa5]/.test(r.description))
    ).length;
    const total = repos.length || 1;
    const percentage = Math.round((translatedCount / total) * 100);
    return { count: translatedCount, percentage };
  }, [repos]);

  const saveConfig = () => {
    const configToSave = {
      ...tempConfig,
      ...(tempConfig.type === 'token' && config.resolvedUsername ? { resolvedUsername: config.resolvedUsername } : {})
    };
    localStorage.setItem('gh_stars_config', JSON.stringify(configToSave));
    setConfig(configToSave);
    setShowSettings(false);
    // useGithubSync 会自动检测配置变化并触发同步，这里不需要手动调用
  };

  // --- Auth Guards ---
  if (authLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[var(--bg-main)] text-[var(--text-primary)]">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  return (
    <div className="h-screen w-full flex overflow-hidden selection:bg-blue-500/30 bg-[var(--bg-main)] text-[var(--text-primary)] transition-colors duration-500">
      {/* Ambient background decorations */}
      <div className="ambient-light top-0 left-1/4 w-[500px] h-[500px] bg-blue-500 rounded-full" />
      <div className="ambient-light bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-500 rounded-full" />
      <div className="ambient-light top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500 opacity-10" />

      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        repos={repos}
        languageStats={languageStats.slice(0, 15)}
        selectedLanguage={selectedLanguage}
        setSelectedLanguage={setSelectedLanguage}
        setCurrentPage={setCurrentPage}
        syncProgress={syncProgress}
        onOpenSettings={() => { setTempConfig(config); setShowSettings(true); }}
        onSignOut={signOut}
        profile={profile}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        theme={theme}
        setTheme={setTheme}
      />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">

        <Header
          activeView={activeView}
          selectedLanguage={selectedLanguage}
          theme={theme}
          setTheme={(t) => startTransition(() => setTheme(t))}
          config={config}
          loading={loading}
          onRefresh={() => fetchAllStars(config, true)} // 使用增量同步
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          profile={profile}
          currentPage={currentPage}
          totalPages={totalPages}
          setCurrentPage={setCurrentPage}
          onSearch={() => {
            if (activeView !== 'list') {
              setActiveView('list');
            }
          }}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          sortDirection={sortDirection}
          setSortDirection={setSortDirection}
          onOpenMenu={() => setIsMobileMenuOpen(true)}
        />


        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <AnimatePresence mode="wait">
            {activeView === 'overview' ? (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="max-w-6xl mx-auto space-y-8"
              >


                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                  <StatCard icon={<Star size={32} className="text-yellow-500" />} value={repos.length} label="Starred Repos" />
                  <StatCard icon={<Code2 size={32} className="text-purple-500" />} value={languageStats.length} label="Different Languages" />
                  <StatCard icon={<History size={32} className="text-blue-500" />} value={languageStats[0]?.name || '-'} label="Dominant Skill" />
                  <StatCard
                    icon={<Languages size={32} className="text-green-500" />}
                    value={`${translationStats.percentage}%`}
                    label={`ZH/CN: ${translationStats.count} Projects`}
                  />
                </div>

                <Suspense fallback={
                  <div className="h-[450px] flex items-center justify-center opacity-50">
                    <Loader2 className="animate-spin mr-2" /> 载入分析图表...
                  </div>
                }>
                  <Charts
                    pieData={pieData}
                    languageStats={languageStats}
                    starTrends={starTrends}
                    hotTopics={hotTopics}
                    isSyncing={!!syncProgress}
                  />
                </Suspense>
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <RepoList
                  repos={paginatedRepos}
                  token={session?.provider_token || (config.type === 'token' ? config.value : undefined)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <SettingsModal
        show={showSettings}
        onClose={() => setShowSettings(false)}
        tempConfig={tempConfig}
        setTempConfig={setTempConfig}
        onSave={saveConfig}
        config={config}
      />

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-12 left-1/2 -translate-x-1/2 max-w-lg w-full px-6 z-[110]"
        >
          <div className="bg-white dark:bg-zinc-900 border border-red-500/20 shadow-2xl rounded-[2rem] p-6 flex flex-col gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-500/10 rounded-2xl text-red-500 flex-shrink-0">
                <AlertCircle size={24} />
              </div>
              <div className="flex-1 space-y-1">
                <h4 className="font-black uppercase tracking-tighter text-lg">
                  {error === 'TOKEN_INVALID' ? 'Authentication Failed' :
                    error === 'NO_PUBLIC_DATA' ? 'No Public Stars found' :
                      error === 'NO_DATA' ? 'Empty Repository List' : 'Sync Interrupted'}
                </h4>
                <p className="text-sm opacity-60 leading-relaxed">
                  {error === 'TOKEN_INVALID' ? 'Your Personal Access Token is invalid or has expired. Please check your token permissions.' :
                    error === 'NO_PUBLIC_DATA' ? 'No public starred repositories found for this user. If your stars are private, please use an API Token instead.' :
                      error === 'NO_DATA' ? 'We couldn\'t find any starred repositories associated with this account. Try another source?' :
                        'The GitHub API connection was lost. Please check your network or try again later.'}
                </p>
              </div>
              <button onClick={() => setError(null)} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setError(null); setShowSettings(true); }}
                className="flex-1 bg-red-500 text-white font-black uppercase tracking-widest text-[10px] py-4 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-red-500/20"
              >
                Configure {error === 'NO_PUBLIC_DATA' ? 'Token' : 'Source'}
              </button>
              {error === 'NO_PUBLIC_DATA' && (
                <a
                  href="https://github.com/settings/tokens"
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 bg-black/5 dark:bg-white/5 font-black uppercase tracking-widest text-[10px] py-4 rounded-xl text-center hover:bg-black/10 dark:hover:bg-white/10 transition-all"
                >
                  Go to GitHub
                </a>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Scroll to Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            onClick={scrollToTop}
            className="fixed bottom-8 right-8 z-[100] size-12 rounded-2xl premium-glass text-blue-500 shadow-xl hover:-translate-y-1 active:scale-95 flex items-center justify-center group/top transition-all duration-300"
            aria-label="Scroll to top"
          >
            <ArrowUp size={20} className="group-hover/top:scale-110 transition-transform duration-300" strokeWidth={2.5} />
          </motion.button>
        )}
      </AnimatePresence>

    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode, value: string | number, label: string }> = ({ icon, value, label }) => (
  <div className="premium-glass p-8 rounded-[2rem] text-center group hover:scale-[1.05] transition-all duration-500">
    <div className="mx-auto mb-6 flex justify-center transform group-hover:scale-110 transition-transform duration-500">{icon}</div>
    <div className="text-5xl font-black tracking-tighter tabular-nums mb-2 truncate px-2">{value}</div>
    <div className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 group-hover:opacity-60 transition-opacity">{label}</div>
  </div>
);

export default App;
