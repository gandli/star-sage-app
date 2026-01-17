export interface Repo {
  id: number;
  name: string;
  full_name: string;
  description: string;
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
}

export interface SyncProgress {
  current: number;
  total: number;
}
