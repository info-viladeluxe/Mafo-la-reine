import { useState } from 'react';
import { ArrowLeft, Loader2, Mail, Lock } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { Logo } from './Logo';
import { LanguageToggle } from './LanguageToggle';
import { ThemeToggle } from './ThemeToggle';

export function AuthPage({ onBack }: { onBack: () => void }) {
  const { t } = useI18n();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = mode === 'signin' ? await signIn(email, password) : await signUp(email, password);
    setBusy(false);
    if (res.error) {
      if (mode === 'signin' && /invalid|credentials/i.test(res.error)) {
        setError(t('auth.errorInvalid'));
      } else if (mode === 'signup' && /already|exists/i.test(res.error)) {
        setError(t('auth.errorExists'));
      } else {
        setError(res.error);
      }
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-sable-100 dark:bg-indigo-400">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-gradient-to-br from-ocre-100/50 via-aubergine-50 to-emeraude-50/30 blur-3xl dark:from-ocre-400/10 dark:via-aubergine-700/20" />

      <div className="relative flex items-center justify-between px-4 pt-5 sm:px-6">
        <button onClick={onBack} className="btn-ghost text-sm">
          <ArrowLeft size={16} /> {t('auth.back')}
        </button>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-md flex-col justify-center px-4 py-8 sm:px-6">
        <div className="mb-8 text-center">
          <Logo className="justify-center" />
        </div>

        <div className="card p-7 shadow-soft-lg">
          <h1 className="text-2xl font-bold tracking-tight text-aubergine-700 dark:text-sable-100">
            {mode === 'signin' ? t('auth.signInTitle') : t('auth.signUpTitle')}
          </h1>
          <p className="mt-1.5 text-sm text-neutral">{t('auth.trialNote')}</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-aubergine-700 dark:text-sable-100">
                {t('auth.email')}
              </label>
              <div className="relative">
                <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-aubergine-200 bg-white py-2.5 pl-10 pr-3 text-sm text-aubergine-900 outline-none transition-all placeholder:text-neutral/60 focus:border-ocre-400 focus:ring-2 focus:ring-ocre-200 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100 dark:placeholder:text-sable-100/40"
                  placeholder="toi@exemple.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-aubergine-700 dark:text-sable-100">
                {t('auth.password')}
              </label>
              <div className="relative">
                <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral" />
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-aubergine-200 bg-white py-2.5 pl-10 pr-3 text-sm text-aubergine-900 outline-none transition-all placeholder:text-neutral/60 focus:border-ocre-400 focus:ring-2 focus:ring-ocre-200 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100 dark:placeholder:text-sable-100/40"
                  placeholder="•••••••"
                />
              </div>
              <p className="mt-1 text-xs text-neutral">{t('auth.passwordHint')}</p>
            </div>

            {error && (
              <div className="animate-fade-in rounded-xl bg-terre-50 px-4 py-3 text-sm text-terre-600 dark:bg-terre-500/15 dark:text-terre-200">
                {error}
              </div>
            )}

            <button type="submit" disabled={busy} className="btn-primary w-full py-3 text-sm">
              {busy ? <Loader2 size={16} className="animate-spin" /> : null}
              {mode === 'signin' ? t('auth.signInCta') : t('auth.signUpCta')}
            </button>
          </form>

          <button
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); }}
            className="mt-5 w-full text-center text-sm font-medium text-ocre-600 hover:text-ocre-700 dark:text-ocre-200"
          >
            {mode === 'signin' ? t('auth.switchToSignUp') : t('auth.switchToSignIn')}
          </button>
        </div>
      </div>
    </div>
  );
}
