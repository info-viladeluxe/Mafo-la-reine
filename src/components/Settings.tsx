import { useEffect, useState } from 'react';
import { Settings as SettingsIcon, User, Globe, Moon, Shield, Download, Trash2, CreditCard, Loader2, Crown } from 'lucide-react';
import { supabase, SUPABASE_URL } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';
import { useSubscription } from '../auth/SubscriptionContext';
import { useI18n } from '../i18n/I18nContext';
import { useTheme } from '../theme/ThemeContext';
import { LanguageToggle } from './LanguageToggle';
import { PLANS } from '../lib/payments';

// Countries covered by at least one connected PSP today (Flutterwave/PayUnit/
// Paystack mobile-money coverage skews West & Central Africa) plus a general
// "other" bucket — this is a display/formatting preference only, it does not
// change which PSP is offered at checkout.
const COUNTRIES = [
  'CM', 'CI', 'SN', 'NG', 'GH', 'KE', 'BJ', 'TG', 'CD', 'GA', 'CG', 'ML', 'BF',
  'FR', 'US', 'GB', 'AE', 'CA', 'BE', 'CH',
];
const CURRENCIES = ['USD', 'XAF', 'NGN', 'GHS', 'ZAR', 'KES', 'EUR', 'GBP'];

export function Settings() {
  const { t, lang } = useI18n();
  const { profile, user, signOut } = useAuth();
  const { subscription } = useSubscription();
  const { theme, toggle } = useTheme();
  const [firstName, setFirstName] = useState(profile?.first_name ?? '');
  const [country, setCountry] = useState(profile?.country ?? '');
  const [currency, setCurrency] = useState(profile?.currency ?? 'USD');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFirstName(profile?.first_name ?? '');
    setCountry(profile?.country ?? '');
    setCurrency(profile?.currency ?? 'USD');
  }, [profile]);

  const flashToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const saveProfile = async () => {
    setBusy(true); setError(null);
    const { error: err } = await supabase
      .from('profiles')
      .update({ first_name: firstName.trim(), country: country || null, currency })
      .eq('id', user?.id);
    setBusy(false);
    if (err) { setError(t('settings.error')); return; }
    flashToast(t('settings.saved'));
  };

  const deleteAccount = async () => {
    if (!window.confirm(t('settings.confirmDelete'))) return;
    if (!window.confirm(t('settings.confirmDeleteFinal'))) return;
    setBusy(true); setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error(t('settings.error'));
      const res = await fetch(`${SUPABASE_URL}/functions/v1/delete-account`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || t('settings.error'));
      }
      await signOut();
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : t('settings.error'));
    }
  };

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  const planLabel = subscription
    ? (PLANS.find((p) => p.id === subscription.plan_id)?.nameKey ?? null)
    : null;
  const statusKey =
    subscription?.status === 'active' ? 'gate.statusActive'
      : subscription?.status === 'trialing' ? 'gate.statusTrialing'
        : subscription?.status === 'canceled' ? 'gate.statusCanceled'
          : null;
  const periodKey = subscription?.status === 'trialing' ? 'settings.trialEndsOn' : 'settings.renewsOn';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-aubergine-700 dark:text-sable-100">{t('settings.title')}</h1>
        <p className="mt-1 text-sm text-neutral">{t('settings.subtitle')}</p>
      </div>

      {/* Profile */}
      <div className="card p-6">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-aubergine-700 dark:text-sable-100">
          <User size={16} className="text-rose-500" /> {t('settings.profile')}
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-aubergine-700 dark:text-sable-100">{t('settings.firstName')}</label>
            <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full max-w-sm rounded-xl border border-aubergine-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-aubergine-700 dark:text-sable-100">{t('settings.country')}</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full max-w-sm rounded-xl border border-aubergine-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100"
            >
              <option value="">{t('settings.selectCountry')}</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-aubergine-700 dark:text-sable-100">{t('settings.currency')}</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full max-w-sm rounded-xl border border-aubergine-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-neutral">{t('settings.currencyNote')}</p>
          </div>
          <button onClick={saveProfile} disabled={busy} className="btn-primary px-4 py-2.5 text-sm">
            {busy ? <Loader2 size={16} className="animate-spin" /> : null} {t('settings.saved')}
          </button>
        </div>
      </div>

      {/* Preferences */}
      <div className="card p-6">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-aubergine-700 dark:text-sable-100">
          <Globe size={16} className="text-rose-500" /> {t('settings.language')} & {t('settings.theme')}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <LanguageToggle />
          <div className="flex items-center gap-2">
            <button onClick={toggle} className="btn-outline px-4 py-2.5 text-sm">
              <Moon size={16} /> {theme === 'light' ? 'Light' : 'Dark'}
            </button>
          </div>
        </div>
      </div>

      {/* Subscription */}
      <div className="card p-6">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-aubergine-700 dark:text-sable-100">
          <CreditCard size={16} className="text-rose-500" /> {t('settings.subscription')}
        </div>

        {subscription && planLabel ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs text-neutral">{t('settings.plan')}</p>
                <p className="text-sm font-semibold text-aubergine-700 dark:text-sable-100">{t(planLabel as never)}</p>
              </div>
              <div>
                <p className="text-xs text-neutral">{t('settings.status')}</p>
                <p className="text-sm font-semibold text-aubergine-700 dark:text-sable-100">
                  {statusKey ? t(statusKey as never) : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral">{t('settings.billingCycle')}</p>
                <p className="text-sm capitalize text-aubergine-700 dark:text-sable-100">
                  {subscription.cycle === 'monthly' ? t('pricing.monthly') : t('pricing.yearly')}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral">{t('settings.provider')}</p>
                <p className="text-sm capitalize text-aubergine-700 dark:text-sable-100">
                  {subscription.provider ?? '—'}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-neutral">{t(periodKey as never)}</p>
                <p className="text-sm font-semibold text-aubergine-700 dark:text-sable-100">
                  {fmt(subscription.status === 'trialing' ? subscription.trial_ends_at : subscription.current_period_end)}
                </p>
              </div>
            </div>
            <button
              onClick={() => { window.location.href = '/?upgrade=1'; }}
              className="btn-outline px-4 py-2.5 text-sm"
            >
              <Crown size={16} /> {t('settings.upgrade')}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-neutral">{t('settings.noSubscription')}</p>
            <button
              onClick={() => { window.location.href = '/?upgrade=1'; }}
              className="btn-primary px-4 py-2.5 text-sm"
            >
              <Crown size={16} /> {t('settings.upgrade')}
            </button>
          </div>
        )}
      </div>

      {/* Privacy */}
      <div className="card p-6">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-aubergine-700 dark:text-sable-100">
          <Shield size={16} className="text-rose-500" /> {t('settings.privacy')}
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl bg-aubergine-50 p-4 dark:bg-white/5">
            <div>
              <p className="text-sm font-medium text-aubergine-700 dark:text-sable-100">{t('settings.exportData')}</p>
              <p className="text-xs text-neutral">{t('settings.exportDesc')}</p>
            </div>
            <button className="btn-icon btn-icon-lg text-aubergine-600 hover:bg-rose-50 hover:text-rose-500 dark:text-sable-100" title={t('settings.exportSoon')}>
              <Download size={16} />
            </button>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-terre-50 p-4 dark:bg-terre-500/10">
            <div>
              <p className="text-sm font-medium text-terre-600 dark:text-terre-200">{t('settings.deleteAccount')}</p>
              <p className="text-xs text-neutral">{t('settings.deleteDesc')}</p>
            </div>
            <button onClick={deleteAccount} className="btn-icon btn-icon-lg text-terre-600 hover:bg-terre-100 dark:text-terre-200">
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>

      {error && <div className="rounded-xl bg-terre-50 px-4 py-3 text-sm text-terre-600 dark:bg-terre-500/15 dark:text-terre-200">{error}</div>}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-fade-up">
          <div className="flex items-center gap-2 rounded-full bg-emeraude-500 px-5 py-2.5 text-sm font-medium text-white shadow-soft-lg"><SettingsIcon size={16} /> {toast}</div>
        </div>
      )}
    </div>
  );
}
