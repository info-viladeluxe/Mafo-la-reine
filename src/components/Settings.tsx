import { useEffect, useState } from 'react';
import { Settings as SettingsIcon, User, Globe, Moon, Shield, Download, Trash2, CreditCard, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { useTheme } from '../theme/ThemeContext';
import { LanguageToggle } from './LanguageToggle';

export function Settings() {
  const { t } = useI18n();
  const { profile, user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const [firstName, setFirstName] = useState(profile?.first_name ?? '');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setFirstName(profile?.first_name ?? ''); }, [profile]);

  const flashToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const saveProfile = async () => {
    setBusy(true); setError(null);
    const { error: err } = await supabase.from('profiles').update({ first_name: firstName.trim() }).eq('id', user?.id);
    setBusy(false);
    if (err) { setError(t('settings.error')); return; }
    flashToast(t('settings.saved'));
  };

  const deleteAccount = async () => {
    if (!window.confirm(t('settings.confirmDelete'))) return;
    await signOut();
  };

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
            <p className="text-sm text-neutral">{profile?.country ?? '—'}</p>
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
            <button onClick={toggle} className="flex items-center gap-2 rounded-xl border border-aubergine-200 px-4 py-2.5 text-sm text-aubergine-700 transition-colors hover:border-rose-400 dark:border-white/10 dark:text-sable-100">
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
        <p className="text-sm text-neutral">{t('settings.plan')}: <span className="font-semibold text-aubergine-700 dark:text-sable-100">Premium</span></p>
        <button className="btn-outline mt-3 px-4 py-2.5 text-sm">{t('settings.managePlan')}</button>
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
            <button className="grid h-10 w-10 place-items-center rounded-full bg-white text-aubergine-600 transition-colors hover:bg-rose-50 hover:text-rose-500 dark:bg-indigo-200 dark:text-sable-100" title={t('settings.exportSoon')}>
              <Download size={16} />
            </button>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-terre-50 p-4 dark:bg-terre-500/10">
            <div>
              <p className="text-sm font-medium text-terre-600 dark:text-terre-200">{t('settings.deleteAccount')}</p>
              <p className="text-xs text-neutral">{t('settings.deleteDesc')}</p>
            </div>
            <button onClick={deleteAccount} className="grid h-10 w-10 place-items-center rounded-full bg-white text-terre-600 transition-colors hover:bg-terre-100 dark:bg-indigo-200 dark:text-terre-200">
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
