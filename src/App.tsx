import { useState } from 'react';
import { I18nProvider } from './i18n/I18nContext';
import { ThemeProvider } from './theme/ThemeContext';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { SubscriptionProvider, useSubscription } from './auth/SubscriptionContext';
import { LandingPage } from './components/LandingPage';
import { AuthPage } from './components/AuthPage';
import { Onboarding } from './components/Onboarding';
import { AppShell } from './components/AppShell';
import { SubscriptionGate } from './components/SubscriptionGate';
import { Logo } from './components/Logo';

type Route = 'landing' | 'auth';

function Router() {
  const { session, profile, loading } = useAuth();
  const { subscription, loading: subLoading, hasAccess } = useSubscription();
  const [route, setRoute] = useState<Route>('landing');

  if (loading || (session && subLoading)) {
    return (
      <div className="grid min-h-screen place-items-center bg-sable-100 dark:bg-indigo-400">
        <div className="flex flex-col items-center gap-4">
          <Logo />
          <div className="h-1 w-24 overflow-hidden rounded-full bg-aubergine-100 dark:bg-white/10">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-ocre-400" />
          </div>
        </div>
      </div>
    );
  }

  // Authenticated path
  if (session) {
    if (!profile?.onboarding_completed) return <Onboarding />;
    if (!hasAccess && subscription !== null) return <SubscriptionGate />;
    if (!hasAccess) return <SubscriptionGate />;
    return <AppShell />;
  }

  // Public path
  if (route === 'auth') return <AuthPage onBack={() => setRoute('landing')} />;
  return <LandingPage onAuth={() => setRoute('auth')} />;
}

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <SubscriptionProvider>
            <Router />
          </SubscriptionProvider>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
