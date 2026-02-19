import { createContext, useContext, type ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import type { Session, User } from '@supabase/supabase-js';
import type { Config, Profile } from '../types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  profile: Profile | null;
  profileLoading: boolean;
  updateCloudSettings: (settings: Record<string, any>) => Promise<void>;
  updateCloudConfig: (config: Config) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { session, user, loading, signOut } = useAuth();
  const { profile, loading: profileLoading, updateCloudSettings, updateCloudConfig, refreshProfile } = useProfile(user);

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut, profile, profileLoading, updateCloudSettings, updateCloudConfig, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
