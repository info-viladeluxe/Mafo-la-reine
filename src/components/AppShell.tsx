import { useState } from 'react';
import {
  LayoutDashboard, HeartPulse, Activity, Sparkles, Baby, Stethoscope,
  FolderLock, BookOpen, Bot, CalendarClock, Pill, Settings as SettingsIcon, Crown, LogOut, Menu, X,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { LanguageToggle } from './LanguageToggle';
import { Dashboard } from './Dashboard';
import { Cycle } from './Cycle';
import { Symptom } from './Symptom';
import { Fertility } from './Fertility';
import { Pregnancy } from './Pregnancy';
import { Health } from './Health';
import { Documents } from './Documents';
import { Journal } from './Journal';
import { AIAssistant } from './AIAssistant';
import { Appointments } from './Appointments';
import { Medications } from './Medications';
import { Settings as SettingsView } from './Settings';

type ViewKey =
  | 'dashboard' | 'cycle' | 'symptoms' | 'fertility' | 'pregnancy'
  | 'health' | 'documents' | 'journal' | 'ai' | 'appointments' | 'medications' | 'settings';

export function AppShell({ onAdmin }: { onAdmin?: () => void }) {
  const { t } = useI18n();
  const { profile, signOut } = useAuth();
  const [view, setView] = useState<ViewKey>('dashboard');
  const [navOpen, setNavOpen] = useState(false);

  const nav: { key: ViewKey; label: string; icon: typeof LayoutDashboard }[] = [
    { key: 'dashboard', label: t('app.dashboard'), icon: LayoutDashboard },
    { key: 'cycle', label: t('app.cycle'), icon: HeartPulse },
    { key: 'symptoms', label: t('app.symptoms'), icon: Activity },
    { key: 'fertility', label: t('app.fertility'), icon: Sparkles },
    { key: 'pregnancy', label: t('app.pregnancy'), icon: Baby },
    { key: 'health', label: t('app.health'), icon: Stethoscope },
    { key: 'documents', label: t('app.documents'), icon: FolderLock },
    { key: 'journal', label: t('app.journal'), icon: BookOpen },
    { key: 'ai', label: t('app.ai'), icon: Bot },
    { key: 'appointments', label: t('app.appointments'), icon: CalendarClock },
    { key: 'medications', label: t('app.medications'), icon: Pill },
    { key: 'settings', label: t('app.settings'), icon: SettingsIcon },
  ];

  const initials = (profile?.first_name?.[0] ?? profile?.email?.[0] ?? 'M').toUpperCase();

  const handleNav = (k: ViewKey) => { setView(k); setNavOpen(false); };

  return (
    <div className="min-h-screen bg-sable-100 dark:bg-indigo-400">
      {/* Top bar (mobile) */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-aubergine-100 bg-sable-100/85 px-4 py-3 backdrop-blur-md lg:hidden dark:border-white/5 dark:bg-indigo-400/85">
        <button onClick={() => setNavOpen(true)} aria-label="Menu" className="grid h-9 w-9 place-items-center rounded-full border border-aubergine-200 bg-white/60 text-aubergine-700 dark:border-white/10 dark:bg-white/5 dark:text-sable-100">
          <Menu size={18} />
        </button>
        <Logo />
        <ThemeToggle />
      </header>

      <div className="flex">
        {/* Sidebar (desktop) */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-aubergine-100 bg-sable-50 p-4 lg:flex dark:border-white/5 dark:bg-indigo-500">
          <div className="px-2 py-2"><Logo /></div>
          <nav className="mt-4 flex-1 space-y-1 overflow-y-auto">
            {nav.map((n) => (
              <button
                key={n.key}
                onClick={() => handleNav(n.key)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  view === n.key
                    ? 'bg-aubergine-600 text-white shadow-soft'
                    : 'text-aubergine-700 hover:bg-aubergine-50 dark:text-sable-100/80 dark:hover:bg-white/5'
                }`}
              >
                <n.icon size={18} />
                {n.label}
              </button>
            ))}
          </nav>
          <div className="mt-auto space-y-2 border-t border-aubergine-100 pt-3 dark:border-white/5">
            <div className="flex items-center gap-2 px-2">
              <LanguageToggle />
              <ThemeToggle />
            </div>
            {profile?.is_admin && (
              <button onClick={() => onAdmin?.()} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-200 dark:hover:bg-rose-500/10">
                <Crown size={18} />
                {t('admin.title')}
              </button>
            )}
            <button onClick={signOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-terre-600 transition-colors hover:bg-terre-50 dark:text-terre-200 dark:hover:bg-terre-500/10">
              <LogOut size={18} />
              {t('app.signOut')}
            </button>
          </div>
        </aside>

        {/* Drawer (mobile) */}
        {navOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-aubergine-900/40 backdrop-blur-sm" onClick={() => setNavOpen(false)} />
            <aside className="absolute left-0 top-0 flex h-full w-72 max-w-[85%] flex-col bg-sable-50 p-4 shadow-soft-lg dark:bg-indigo-500">
              <div className="flex items-center justify-between px-2 py-2">
                <Logo />
                <button onClick={() => setNavOpen(false)} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full border border-aubergine-200 text-aubergine-700 dark:border-white/10 dark:text-sable-100">
                  <X size={18} />
                </button>
              </div>
              <nav className="mt-4 flex-1 space-y-1 overflow-y-auto">
                {nav.map((n) => (
                  <button
                    key={n.key}
                    onClick={() => handleNav(n.key)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                      view === n.key
                        ? 'bg-aubergine-600 text-white shadow-soft'
                        : 'text-aubergine-700 hover:bg-aubergine-50 dark:text-sable-100/80 dark:hover:bg-white/5'
                    }`}
                  >
                    <n.icon size={18} />
                    {n.label}
                  </button>
                ))}
              </nav>
              <div className="mt-auto space-y-2 border-t border-aubergine-100 pt-3 dark:border-white/5">
                {profile?.is_admin && (
                  <button onClick={() => onAdmin?.()} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-200 dark:hover:bg-rose-500/10">
                    <Crown size={18} />
                    {t('admin.title')}
                  </button>
                )}
                <button onClick={signOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-terre-600 transition-colors hover:bg-terre-50 dark:text-terre-200 dark:hover:bg-terre-500/10">
                  <LogOut size={18} />
                  {t('app.signOut')}
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* Main content */}
        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {/* Desktop top strip */}
            <div className="mb-6 hidden items-center justify-end gap-3 lg:flex">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-aubergine-600 text-sm font-semibold text-white">
                {initials}
              </span>
            </div>

            {view === 'dashboard' && <Dashboard onNavigate={handleNav} />}
            {view === 'cycle' && <Cycle />}
            {view === 'symptoms' && <Symptom />}
            {view === 'fertility' && <Fertility />}
            {view === 'pregnancy' && <Pregnancy />}
            {view === 'health' && <Health />}
            {view === 'documents' && <Documents />}
            {view === 'journal' && <Journal />}
            {view === 'ai' && <AIAssistant />}
            {view === 'appointments' && <Appointments />}
            {view === 'medications' && <Medications />}
            {view === 'settings' && <SettingsView />}
            {view !== 'dashboard' && view !== 'cycle' && view !== 'symptoms' && view !== 'fertility' && view !== 'pregnancy' && view !== 'health' && view !== 'documents' && view !== 'journal' && view !== 'ai' && view !== 'appointments' && view !== 'medications' && view !== 'settings' && (
              <div className="card flex min-h-[50vh] flex-col items-center justify-center gap-3 p-10 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-aubergine-50 text-aubergine-600 dark:bg-white/5 dark:text-sable-100">
                  {nav.find((n) => n.key === view)?.icon ? (() => { const Icon = nav.find((n) => n.key === view)!.icon; return <Icon size={26} />; })() : null}
                </div>
                <h2 className="text-lg font-semibold text-aubergine-700 dark:text-sable-100">
                  {nav.find((n) => n.key === view)?.label}
                </h2>
                <p className="max-w-sm text-sm text-neutral">
                  {t('features.subtitle')}
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
