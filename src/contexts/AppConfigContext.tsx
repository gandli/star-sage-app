import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useAppConfig } from '../hooks/useAppConfig';
import { useAuthContext } from './AuthContext';
import type { Config } from '../types';

interface AppConfigContextValue {
  config: Config;
  setConfig: (c: Config) => void;
  saveConfig: (c: Config) => void;
  tempConfig: Config;
  setTempConfig: (c: Config) => void;
}

const AppConfigContext = createContext<AppConfigContextValue | null>(null);

export function AppConfigProvider({ children }: { children: ReactNode }) {
  const { session } = useAuthContext();
  const { config, setConfig, saveConfig } = useAppConfig(session);
  const [tempConfig, setTempConfig] = useState(config);

  useEffect(() => {
    setTempConfig(config);
  }, [config]);

  return (
    <AppConfigContext.Provider value={{ config, setConfig, saveConfig, tempConfig, setTempConfig }}>
      {children}
    </AppConfigContext.Provider>
  );
}

export function useAppConfigContext(): AppConfigContextValue {
  const ctx = useContext(AppConfigContext);
  if (!ctx) throw new Error('useAppConfigContext must be used within AppConfigProvider');
  return ctx;
}
