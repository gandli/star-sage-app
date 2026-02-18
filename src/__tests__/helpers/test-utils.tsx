import '@testing-library/jest-dom/vitest';

// Mock window.matchMedia for jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

import React, { type ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';
import type { Repo, Config, Profile } from '../../types';

// ─── Mock Data Factories ───────────────────────────────────────

export function createMockRepo(overrides: Partial<Repo> = {}): Repo {
  return {
    id: Math.floor(Math.random() * 100000),
    name: 'mock-repo',
    full_name: 'user/mock-repo',
    description: 'A mock repository for testing',
    html_url: 'https://github.com/user/mock-repo',
    stargazers_count: 42,
    forks_count: 10,
    updated_at: '2025-01-15T00:00:00Z',
    topics: ['react', 'testing'],
    language: 'TypeScript',
    owner: { login: 'user', avatar_url: 'https://github.com/user.png' },
    starred_at: '2025-01-10T00:00:00Z',
    ...overrides,
  };
}

export function createMockConfig(overrides: Partial<Config> = {}): Config {
  return {
    type: 'username',
    value: 'testuser',
    autoTranslate: true,
    ...overrides,
  };
}

export function createMockProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'user-123',
    username: 'testuser',
    full_name: 'Test User',
    avatar_url: 'https://github.com/testuser.png',
    config_type: 'username',
    config_value: 'testuser',
    resolved_username: 'testuser',
    settings: null,
    ...overrides,
  };
}

export function createMockSession() {
  return {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Date.now() / 1000 + 3600,
    user: createMockUser(),
    provider_token: null as string | null,
    provider_refresh_token: null as string | null,
  };
}

export function createMockUser() {
  return {
    id: 'user-123',
    email: 'test@example.com',
    aud: 'authenticated',
    role: 'authenticated',
    app_metadata: {},
    user_metadata: { user_name: 'testuser', name: 'Test User' },
    created_at: '2025-01-01T00:00:00Z',
  } as any;
}

// ─── Mock Contexts (direct values, no real hooks) ──────────────

interface MockAuthValues {
  session?: any;
  user?: any;
  loading?: boolean;
  signOut?: () => Promise<void>;
  profile?: Profile | null;
  profileLoading?: boolean;
  updateCloudSettings?: (s: Record<string, any>) => Promise<void>;
  updateCloudConfig?: (c: Config) => Promise<void>;
  refreshProfile?: () => Promise<void>;
}

interface MockAppConfigValues {
  config?: Config;
  setConfig?: (c: Config) => void;
  saveConfig?: (c: Config) => void;
  tempConfig?: Config;
  setTempConfig?: (c: Config) => void;
}

interface MockAppStateValues {
  theme?: 'light' | 'dark';
  setTheme?: (t: 'light' | 'dark') => void;
  activeView?: 'overview' | 'list';
  setActiveView?: (v: 'overview' | 'list') => void;
  selectedLanguage?: string | null;
  setSelectedLanguage?: (l: string | null) => void;
  currentPage?: number;
  setCurrentPage?: (p: number | ((prev: number) => number)) => void;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
  sortOrder?: 'starred_at' | 'updated_at' | 'stargazers_count' | 'name';
  setSortOrder?: (o: 'starred_at' | 'updated_at' | 'stargazers_count' | 'name') => void;
  sortDirection?: 'asc' | 'desc';
  setSortDirection?: (d: 'asc' | 'desc') => void;
  isMobileMenuOpen?: boolean;
  setIsMobileMenuOpen?: (b: boolean) => void;
  showSettings?: boolean;
  setShowSettings?: (b: boolean) => void;
}

interface MockStarDataValues {
  repos?: Repo[];
  loading?: boolean;
  syncProgress?: any;
  error?: string | null;
  setError?: (e: string | null) => void;
  fetchAllStars?: (config: Config, isIncremental?: boolean, startPage?: number) => void;
  languageStats?: { name: string; value: number }[];
  topicStats?: { name: string; value: number }[];
  trendStats?: { month: string; count: number }[];
}

// We mock all four contexts at the module level so components
// that import useAuthContext etc. get our controlled values.

let _authValues: Required<MockAuthValues>;
let _appConfigValues: Required<MockAppConfigValues>;
let _appStateValues: Required<MockAppStateValues>;
let _starDataValues: Required<MockStarDataValues>;

// Mock the context hooks — these are imported by components
vi.mock('../../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useAuthContext: () => _authValues,
}));

vi.mock('../../contexts/AppConfigContext', () => ({
  AppConfigProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useAppConfigContext: () => _appConfigValues,
}));

vi.mock('../../contexts/AppStateContext', () => ({
  AppStateProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useAppStateContext: () => _appStateValues,
}));

vi.mock('../../contexts/StarDataContext', () => ({
  StarDataProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useStarDataContext: () => _starDataValues,
}));

// Mock hooks that are used inside contexts/components
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => _authValues,
}));

vi.mock('../../hooks/useProfile', () => ({
  useProfile: () => ({
    profile: _authValues.profile,
    loading: _authValues.profileLoading,
    updateCloudSettings: _authValues.updateCloudSettings,
    updateCloudConfig: _authValues.updateCloudConfig,
    refreshProfile: _authValues.refreshProfile,
  }),
}));

vi.mock('../../hooks/useAppConfig', () => ({
  useAppConfig: () => ({
    config: _appConfigValues.config,
    setConfig: _appConfigValues.setConfig,
    saveConfig: _appConfigValues.saveConfig,
  }),
}));

vi.mock('../../hooks/useAppState', () => ({
  useAppState: () => _appStateValues,
}));

vi.mock('../../hooks/useGithubSync', () => ({
  useGithubSync: () => _starDataValues,
}));

vi.mock('../../hooks/useRepoStats', () => ({
  useRepoStats: () => ({ totalRepos: 100, translatedRepos: 50, translationPercentage: 50 }),
}));

vi.mock('../../hooks/useResponsiveGrid', () => ({
  useResponsiveGrid: () => ({ itemsPerPage: 12 }),
}));

vi.mock('../../hooks/useUrlSync', () => ({
  useUrlSync: () => {},
}));

vi.mock('../../hooks/useSettingsSync', () => ({
  useSettingsSync: () => {},
}));

vi.mock('../../hooks/useTranslationStatus', () => ({
  useTranslationStatus: () => ({ isTranslating: false, progress: 0 }),
}));

vi.mock('../../services/AutoTranslator', () => ({
  autoTranslator: { setAccount: vi.fn() },
}));

vi.mock('../../services/StarDataService', () => ({
  starService: {
    subscribe: vi.fn(() => vi.fn()),
    fetchAndSummarizeReadme: vi.fn(),
  },
}));

vi.mock('../../utils/db', () => ({
  db: {
    getTranslation: vi.fn().mockResolvedValue(null),
    saveTranslation: vi.fn().mockResolvedValue(undefined),
    getTranslationsFromSupabaseBatch: vi.fn().mockResolvedValue(new Map()),
    saveBatchTranslations: vi.fn().mockResolvedValue(undefined),
    clearAllData: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../utils/translate', () => ({
  translateText: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../utils/sharedObserver', () => ({
  repoCardObserver: {
    observe: vi.fn(),
    unobserve: vi.fn(),
  },
}));

// Mock static assets
vi.mock('../../assets/icon.png', () => ({ default: 'icon.png' }));

// ─── Provider Options ──────────────────────────────────────────

export interface ProviderOverrides {
  auth?: MockAuthValues;
  appConfig?: MockAppConfigValues;
  appState?: MockAppStateValues;
  starData?: MockStarDataValues;
}

function applyDefaults(overrides: ProviderOverrides = {}) {
  const defaultConfig = createMockConfig();

  _authValues = {
    session: createMockSession(),
    user: createMockUser(),
    loading: false,
    signOut: vi.fn().mockResolvedValue(undefined),
    profile: createMockProfile(),
    profileLoading: false,
    updateCloudSettings: vi.fn().mockResolvedValue(undefined),
    updateCloudConfig: vi.fn().mockResolvedValue(undefined),
    refreshProfile: vi.fn().mockResolvedValue(undefined),
    ...overrides.auth,
  };

  _appConfigValues = {
    config: defaultConfig,
    setConfig: vi.fn(),
    saveConfig: vi.fn(),
    tempConfig: defaultConfig,
    setTempConfig: vi.fn(),
    ...overrides.appConfig,
  };

  _appStateValues = {
    theme: 'light',
    setTheme: vi.fn(),
    activeView: 'overview',
    setActiveView: vi.fn(),
    selectedLanguage: null,
    setSelectedLanguage: vi.fn(),
    currentPage: 1,
    setCurrentPage: vi.fn(),
    searchQuery: '',
    setSearchQuery: vi.fn(),
    sortOrder: 'starred_at',
    setSortOrder: vi.fn(),
    sortDirection: 'desc',
    setSortDirection: vi.fn(),
    isMobileMenuOpen: false,
    setIsMobileMenuOpen: vi.fn(),
    showSettings: false,
    setShowSettings: vi.fn(),
    ...overrides.appState,
  };

  _starDataValues = {
    repos: [],
    loading: false,
    syncProgress: null,
    error: null,
    setError: vi.fn(),
    fetchAllStars: vi.fn(),
    languageStats: [],
    topicStats: [],
    trendStats: [],
    ...overrides.starData,
  };
}

// ─── renderWithProviders ───────────────────────────────────────

export function renderWithProviders(
  ui: React.ReactElement,
  options?: RenderOptions & { providerOverrides?: ProviderOverrides },
) {
  const { providerOverrides, ...renderOptions } = options || {};
  applyDefaults(providerOverrides);
  return render(ui, renderOptions);
}

// Re-export for convenience
export { _authValues, _appConfigValues, _appStateValues, _starDataValues };
