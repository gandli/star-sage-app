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
  sync_status?: 'pending' | 'synced';
  last_updated?: number;
}
