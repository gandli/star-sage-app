export interface Repo {
  id: number;
  name: string;
  full_name: string;
  description: string;
  description_cn?: string;
  readme_summary?: string;
  html_url: string;
  stargazers_count: number;
  forks_count?: number;
  updated_at: string;
  topics?: string[];
  language: string;
  owner: {
    login?: string;
    avatar_url: string;
  };
  starred_at?: string;
}

export interface Config {
  type: 'username' | 'token';
  value: string;
  resolvedUsername?: string;
  autoTranslate?: boolean;
}

export interface SyncProgress {
  total: number;
  current: number;
  phase?: 'fetching' | 'saving' | 'translating';
}

export interface SyncState {
  username: string;
  configType: 'username' | 'token';
  configValue: string;
  startTime: number;
  lastUpdateTime: number;
  currentPage: number;
  totalPages: number;
  syncedCount: number;
  expectedTotal: number;
  isIncremental: boolean;
  status: 'in_progress' | 'completed' | 'error';
}
