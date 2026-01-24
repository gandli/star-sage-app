import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

import Sidebar from './components/Sidebar';
import Header from './components/Header';
import SettingsModal from './components/SettingsModal';
import { AuthScreen } from './components/AuthScreen';
import { ScrollToTop } from './components/common/ScrollToTop';
import { ErrorToast } from './components/common/ErrorToast';
import { MainContent } from './components/MainContent';

import { useGithubSync } from './hooks/useGithubSync';
import { useAuth } from './hooks/useAuth';
import { useProfile } from './hooks/useProfile';
import { useRepoStats } from './hooks/useRepoStats';
import { useResponsiveGrid } from './hooks/useResponsiveGrid';
import { useRepoFilter } from './hooks/useRepoFilter';
import { useUrlSync } from './hooks/useUrlSync';
import { useAppConfig } from './hooks/useAppConfig';
import { useAppState } from './hooks/useAppState';
import { useSettingsSync } from './hooks/useSettingsSync';
import { autoTranslator } from './services/AutoTranslator';

const App: React.FC = () => {
  // --- Auth & Config State ---
  const { session, user, loading: authLoading, signOut } = useAuth();
  const { profile, loading: profileLoading, updateCloudSettings } = useProfile(user);

  const { config, setConfig, saveConfig: saveAppConfig } = useAppConfig(session);

  const githubUser = config.resolvedUsername || config.value;
  const { totalRepos, translatedRepos, translationPercentage } = useRepoStats(githubUser);

  // --- UI State ---
  const appState = useAppState();
  const {
    activeView, setActiveView,
    currentPage, setCurrentPage,
    selectedLanguage, setSelectedLanguage,
    searchQuery, setSearchQuery,
    sortOrder, setSortOrder,
    sortDirection, setSortDirection,
    isMobileMenuOpen, setIsMobileMenuOpen,
    showSettings, setShowSettings,
    theme, setTheme
  } = appState;

  // --- Data Loading ---
  const isMounted = useRef(false);
  const { repos, loading, syncProgress, error, setError, fetchAllStars, languageStats, topicStats, trendStats } = useGithubSync(config);

  // --- Mobile & Grid ---
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.matchMedia('(max-width: 640px)').matches);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const { itemsPerPage } = useResponsiveGrid(scrollContainerRef as React.RefObject<HTMLElement>);
  const prevItemsPerPage = useRef(itemsPerPage);

  useEffect(() => {
    if (prevItemsPerPage.current !== itemsPerPage && itemsPerPage > 0) {
      const firstItemIndex = (currentPage - 1) * prevItemsPerPage.current;
      const newPage = Math.floor(firstItemIndex / itemsPerPage) + 1;
      setCurrentPage(Math.max(1, newPage));
      prevItemsPerPage.current = itemsPerPage;
    }
  }, [itemsPerPage, currentPage, setCurrentPage]);

  // --- Filter Logic ---
  const repoFilter = useRepoFilter({
    repos,
    languageStats,
    topicStats,
    trendStats,
    searchQuery,
    selectedLanguage,
    sortOrder,
    sortDirection,
    currentPage,
    itemsPerPage,
    isMobile
  });
  const { totalPages } = repoFilter;

  // --- Syncs ---
  useUrlSync({
    activeView,
    currentPage,
    selectedLanguage,
    searchQuery,
    isMounted: isMounted.current
  });

  useSettingsSync({
    user,
    session,
    profile,
    profileLoading,
    config,
    setConfig,
    updateCloudSettings,
    appState
  });

  useEffect(() => {
    if (user && githubUser) autoTranslator.setAccount(user.id, githubUser);
    else autoTranslator.setAccount(null, null);
  }, [user, githubUser]);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Show settings if unconfigured
  useEffect(() => {
    if (!config.value && session && !session?.provider_token && !profile?.config_value && !showSettings && !authLoading && !profileLoading) {
      setShowSettings(true);
    }
  }, [config.value, session, showSettings, authLoading, profileLoading, profile]);

  // Infinite Scroll Listener
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !isMobile) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      if (scrollHeight - scrollTop - clientHeight < 300) {
        if (currentPage < totalPages) {
          setCurrentPage(p => {
            if (p < totalPages) return p + 1;
            return p;
          });
        }
      }
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isMobile, loading, totalPages, currentPage, setCurrentPage]);

  const [tempConfig, setTempConfig] = useState(config);

  // Update temp config when main config changes (e.g. from cloud sync)
  useEffect(() => {
    setTempConfig(config);
  }, [config]);

  const handleSaveConfig = () => {
    const configToSave = {
      ...tempConfig,
      ...(tempConfig.type === 'token' && config.resolvedUsername ? { resolvedUsername: config.resolvedUsername } : {})
    };
    saveAppConfig(configToSave);
    setShowSettings(false);
    // Cloud sync handled in hook
  };

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
      <div className="ambient-light top-0 left-1/4 w-[500px] h-[500px] bg-blue-500 rounded-full" />
      <div className="ambient-light bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-500 rounded-full" />
      <div className="ambient-light top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500 opacity-10" />

      <Sidebar
        activeView={activeView}
        setActiveView={(view) => {
          setActiveView(view);
          setIsMobileMenuOpen(false);
        }}
        repos={repos}
        languageStats={repoFilter.languageStats}
        selectedLanguage={selectedLanguage}
        setSelectedLanguage={(lang) => {
          setSelectedLanguage(lang);
          setCurrentPage(1);
        }}
        setCurrentPage={setCurrentPage}
        syncProgress={syncProgress}
        onOpenSettings={() => setShowSettings(true)}
        onSignOut={signOut}
        profile={profile}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        theme={theme}
        setTheme={setTheme}
        loading={loading}
      />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Header
          activeView={activeView}
          selectedLanguage={selectedLanguage}
          theme={theme}
          setTheme={setTheme}
          config={config}
          loading={loading}
          onRefresh={() => fetchAllStars(config, true)}
          searchQuery={searchQuery}
          setSearchQuery={(q) => {
            setSearchQuery(q);
            if (isMounted.current) setCurrentPage(1);
          }}
          profile={profile}
          currentPage={currentPage}
          totalPages={totalPages}
          setCurrentPage={setCurrentPage}
          onSearch={() => activeView !== 'list' && setActiveView('list')}
          sortOrder={sortOrder}
          setSortOrder={(o) => {
            setSortOrder(o);
            if (isMounted.current) setCurrentPage(1);
          }}
          sortDirection={sortDirection}
          setSortDirection={(d) => {
            setSortDirection(d);
            if (isMounted.current) setCurrentPage(1);
          }}
          onOpenMenu={() => setIsMobileMenuOpen(true)}
        />

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <MainContent
            activeView={activeView}
            loading={loading}
            totalRepos={totalRepos}
            languageStats={repoFilter.languageStats}
            translationPercentage={translationPercentage}
            translatedRepos={translatedRepos}
            pieData={repoFilter.pieData}
            starTrends={repoFilter.starTrends}
            hotTopics={repoFilter.hotTopics}
            syncProgress={syncProgress}
            paginatedRepos={repoFilter.paginatedRepos}
            config={config}
          />
        </div>
      </main>

      <SettingsModal
        show={showSettings}
        onClose={() => setShowSettings(false)}
        tempConfig={tempConfig}
        setTempConfig={setTempConfig}
        onSave={handleSaveConfig}
        config={config}
      />

      {error && <ErrorToast error={error} onClose={() => setError(null)} onConfigure={() => setShowSettings(true)} />}

      <ScrollToTop scrollContainerRef={scrollContainerRef} />
    </div>
  );
};

export default App;
