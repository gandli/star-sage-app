import React from 'react';
import { Loader2 } from 'lucide-react';

import { AuthScreen } from './components/AuthScreen';
import MainLayout from './components/MainLayout';

import { AuthProvider, useAuthContext } from './contexts/AuthContext';
import { AppConfigProvider } from './contexts/AppConfigContext';
import { AppStateProvider } from './contexts/AppStateContext';
import { StarDataProvider } from './contexts/StarDataContext';

const AppInner: React.FC = () => {
  const { session, loading: authLoading } = useAuthContext();

  if (authLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[var(--bg-main)] text-[var(--text-primary)]">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  return (
    <AppConfigProvider>
      <StarDataProvider>
        <AppStateProvider>
          <MainLayout />
        </AppStateProvider>
      </StarDataProvider>
    </AppConfigProvider>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
};

export default App;
