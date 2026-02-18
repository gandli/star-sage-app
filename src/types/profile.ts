export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  config_type: 'username' | 'token' | null;
  config_value: string | null;
  resolved_username: string | null;
  settings: Record<string, any> | null;
}
