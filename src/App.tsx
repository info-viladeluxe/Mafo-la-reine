import { useState, useEffect } from 'react';
import { I18nProvider, useI18n } from './i18n/I18nContext';
import { ThemeProvider } from './theme/ThemeContext';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { SubscriptionProvider, useSubscription } from './auth/SubscriptionContext';
import { LandingPage } from './components/LandingPage';
import { AuthPage } from './components/AuthPage';
import { Onboarding } from './components/Onboarding';
import { AppShell } from './components/AppShell';
import { SubscriptionGate } from './components/SubscriptionGate';
import { SuperAdmin } from './components/SuperAdmin';
import { LegalPageView, type LegalPage } from './components/LegalPageView';
import { Logo } from './components/Logo';
import { verifyFlutterwaveTransaction, verifyPayunitTransaction } from './lib/payments';

const ADMIN_EMAILS = new Set([
  'vincentnogue2@gmail.com',
  'vincentnogue@yahoo.com',
  'webdxb1@gmail.com',
]);

type Route = 'landing' | 'auth' | 'legal';

function CheckoutToast({ message, tone }: { message: string; tone: 'success' | 'pending' | 'error' }) {
  const cls =
    tone === 'success'
      ? 'bg-emeraude-500 text-white'
      : tone === 'pending'
        ? 'bg-ocre-400 text-aubergine-900'
        : 'bg-terre-500 text-white';
  return (
    <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 animate-fade-up">
      <div className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium shadow-soft-lg ${cls}`}>
        {message}
      </div>
    </div>
  );
}

function Router() {
  const { t } = useI18n();
  const { session, profile, loading } = useAuth();
  const { loading: subLoading, hasAccess, refresh } = useSubscription();
  const [route, setRoute] = useState<Route>('landing');
  const [legalPage, setLegalPage] = useState<LegalPage>('terms');
  const [adminMode, setAdminMode] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'pending' | 'error' } | null>(null);
  const [forceGate, setForceGate] = useState(() => new URLSearchParams(window.location.search).get('upgrade') === '1');
  const isAdmin = profile?.is_admin || (profile?.email ? ADMIN_EMAILS.has(profile.email) : false);

  // Handle PSP redirect callbacks: /?checkout=success|cancel&provider=stripe|flutterwave|payunit
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get('checkout');
    const provider = params.get('provider');

    // Strip the upgrade flag so a hard refresh doesn't re-trap the user on the gate.
    if (params.get('upgrade') === '1' && !checkout) {
      window.history.replaceState({}, document.title, window.location.pathname);
      setForceGate(false);
    }

    if (!checkout || !session) return;

    const run = async () => {
      if (checkout === 'cancel') {
        setToast({ message: t('gate.paymentCanceled'), tone: 'error' });
      } else if (provider === 'flutterwave') {
        const txId = params.get('transaction_id') || params.get('tx_id');
        const txRef = params.get('tx_ref');
        if (txId) {
          setToast({ message: t('gate.paymentPending'), tone: 'pending' });
          const { activated } = await verifyFlutterwaveTransaction(txId, txRef ?? undefined);
          setToast({
            message: activated ? t('gate.paymentSuccess') : t('gate.paymentPending'),
            tone: activated ? 'success' : 'pending',
          });
        }
      } else if (provider === 'payunit') {
        const txId = params.get('transaction_id');
        if (txId) {
          setToast({ message: t('gate.paymentPending'), tone: 'pending' });
          const { activated } = await verifyPayunitTransaction(txId);
          setToast({
            message: activated ? t('gate.paymentSuccess') : t('gate.paymentPending'),
            tone: activated ? 'success' : 'pending',
          });
        }
      } else {
        // Stripe: the webhook activates the subscription async. Refresh + hint.
        setToast({ message: t('gate.paymentPending'), tone: 'pending' });
      }
      await refresh();
      // Clean the URL so a refresh doesn't re-trigger the toast.
      window.history.replaceState({}, document.title, window.location.pathname);
      setTimeout(() => setToast(null), 6000);
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  let content: React.ReactNode;
  if (loading || (session && subLoading)) {
    content = (
      <div className="grid min-h-screen place-items-center bg-sable-100 dark:bg-indigo-400">
        <div className="flex flex-col items-center gap-4">
          <Logo />
          <div className="h-1 w-24 overflow-hidden rounded-full bg-aubergine-100 dark:bg-white/10">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-ocre-400" />
          </div>
        </div>
      </div>
    );
  } else if (route === 'legal') {
    content = <LegalPageView page={legalPage} onBack={() => setRoute('landing')} />;
  } else if (session) {
    if (adminMode && isAdmin) content = <SuperAdmin onExit={() => setAdminMode(false)} />;
    else if (!profile?.onboarding_completed) content = <Onboarding />;
    else if (forceGate || !hasAccess) content = <SubscriptionGate />;
    else content = <AppShell onAdmin={() => setAdminMode(true)} adminVisible={isAdmin} />;
  } else if (route === 'auth') {
    content = <AuthPage onBack={() => setRoute('landing')} />;
  } else {
    content = (
      <LandingPage
        onAuth={() => setRoute('auth')}
        onLegalClick={(p) => { setLegalPage(p); setRoute('legal'); }}
      />
    );
  }

  return (
    <>
      {content}
      {toast && <CheckoutToast message={toast.message} tone={toast.tone} />}
    </>
  );
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
