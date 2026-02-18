import React, { createContext, useContext, type ReactNode } from 'react';
import { useGithubSync } from '../hooks/useGithubSync';
import { useAppConfigContext } from './AppConfigContext';
import type { Repo, SyncProgress, Config } from '../types';

interface StarDataContextValue {
  repos: Repo[];
  loading: boolean;
  syncProgress: SyncProgress | null;
  error: string | null;
  setError: (e: string | null) => void;
  fetchAllStars: (config: Config, isIncremental?: boolean, startPage?: number) => void;
  languageStats: { name: string; value: number }[];
  topicStats: { name: string; value: number }[];
  trendStats: { month: string; count: number }[];
}

const StarDataContext = createContext<StarDataContextValue | null>(null);

export function StarDataProvider({ children }: { children: ReactNode }) {
  const { config } = useAppConfigContext();
  const data = useGithubSync(config);

  return (
    <StarDataContext.Provider value={data}>
      {children}
    </StarDataContext.Provider>
  );
}

export function useStarDataContext(): StarDataContextValue {
  const ctx = useContext(StarDataContext);
  if (!ctx) throw new Error('useStarDataContext must be used within StarDataProvider');
  return ctx;
}
