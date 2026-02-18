import React, { createContext, useContext, type ReactNode } from 'react';
import { useAppState } from '../hooks/useAppState';

type AppStateValue = ReturnType<typeof useAppState>;

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const appState = useAppState();

  return (
    <AppStateContext.Provider value={appState}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppStateContext(): AppStateValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppStateContext must be used within AppStateProvider');
  return ctx;
}
