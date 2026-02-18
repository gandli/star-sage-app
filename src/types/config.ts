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
