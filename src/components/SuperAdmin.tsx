import { useEffect, useMemo, useState } from 'react';
import { Users, Crown, TrendingUp, Activity, Search, Shield, ArrowLeft, Loader2, Globe, HeartPulse } from 'lucide-react';
import { supabase, type Profile } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/I18nContext';

interface AdminUser extends Profile {}

function fmtDate(iso: string, lang: 'fr' | 'en') {
  return new Date(iso).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function SuperAdmin({ onExit }: { onExit: () => void }) {
  const { t, lang } = useI18n();
  const { profile } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    setLoading(false);
    if (err) { setError(t('admin.error')); return; }
    setUsers((data as AdminUser[]) ?? []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const toggleAdmin = async (u: AdminUser) => {
    setBusyId(u.id);
    const { error: err } = await supabase
      .from('profiles')
      .update({ is_admin: !u.is_admin })
      .eq('id', u.id);
    setBusyId(null);
    if (err) { setError(t('admin.error')); return; }
    load();
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter((u) =>
      u.email?.toLowerCase().includes(q) ||
      u.first_name?.toLowerCase().includes(q) ||
      u.country?.toLowerCase().includes(q)
    );
  }, [users, search]);

  const totalUsers = users.length;
  const premiumUsers = users.filter((u) => u.subscription_plan === 'premium' || u.subscription_plan === 'pro').length;
  const activeUsers = users.filter((u) => u.onboarding_completed).length;
  const planDist = useMemo(() => {
    const dist: Record<string, number> = {};
    users.forEach((u) => { dist[u.subscription_plan ?? 'free'] = (dist[u.subscription_plan ?? 'free'] ?? 0) + 1; });
    return dist;
  }, [users]);
  const countryDist = useMemo(() => {
    const dist: Record<string, number> = {};
    users.forEach((u) => { if (u.country) dist[u.country] = (dist[u.country] ?? 0) + 1; });
    return Object.entries(dist).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [users]);

  if (!profile?.is_admin) {
    return (
      <div className="grid min-h-screen place-items-center bg-sable-100 dark:bg-indigo-400">
        <div className="card flex flex-col items-center gap-4 p-10 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-terre-50 text-terre-500 dark:bg-terre-500/15 dark:text-terre-200"><Shield size={26} /></div>
          <p className="max-w-xs text-sm text-neutral">{t('admin.noAccess')}</p>
          <button onClick={onExit} className="btn-outline px-4 py-2.5 text-sm"><ArrowLeft size={16} /> {t('admin.back')}</button>
        </div>
      </div>
    );
  }

  const PLAN_COLORS: Record<string, string> = {
    free: 'bg-neutral-100 text-neutral dark:bg-white/5',
    premium: 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-200',
    pro: 'bg-aubergine-50 text-aubergine-600 dark:bg-white/5 dark:text-sable-100/80',
  };

  return (
    <div className="min-h-screen bg-sable-100 dark:bg-indigo-400">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-aubergine-700 dark:text-sable-100">{t('admin.title')}</h1>
            <p className="mt-1 text-sm text-neutral">{t('admin.subtitle')}</p>
          </div>
          <button onClick={onExit} className="btn-outline px-4 py-2.5 text-sm"><ArrowLeft size={16} /> {t('admin.back')}</button>
        </div>

        {error && <div className="rounded-xl bg-terre-50 px-4 py-3 text-sm text-terre-600 dark:bg-terre-500/15 dark:text-terre-200">{error}</div>}

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Users} label={t('admin.stats.users')} value={totalUsers} color="#5C2A4D" />
          <StatCard icon={Activity} label={t('admin.stats.active')} value={activeUsers} color="#12A76B" />
          <StatCard icon={Crown} label={t('admin.stats.premium')} value={premiumUsers} color="#F0509C" />
          <StatCard icon={TrendingUp} label={t('admin.stats.revenue')} value={`$${premiumUsers * 5}`} color="#D69A2D" />
        </div>

        {/* Distribution + countries */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card p-6">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-aubergine-700 dark:text-sable-100">
              <Crown size={16} className="text-rose-500" /> {t('admin.distribution')}
            </div>
            <div className="space-y-3">
              {Object.entries(planDist).map(([plan, count]) => {
                const pct = totalUsers > 0 ? (count / totalUsers) * 100 : 0;
                return (
                  <div key={plan}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-aubergine-700 dark:text-sable-100">{t(`admin.plans.${plan}` as never)}</span>
                      <span className="tnum text-neutral">{count} ({Math.round(pct)}%)</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-aubergine-100 dark:bg-white/5">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: plan === 'premium' ? '#F0509C' : plan === 'pro' ? '#5C2A4D' : '#8A7E74' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card p-6">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-aubergine-700 dark:text-sable-100">
              <Globe size={16} className="text-emeraude-500" /> {t('admin.countries')}
            </div>
            <div className="space-y-2">
              {countryDist.length === 0 ? (
                <p className="text-sm text-neutral">—</p>
              ) : countryDist.map(([country, count]) => (
                <div key={country} className="flex items-center justify-between rounded-xl bg-aubergine-50 px-3 py-2 dark:bg-white/5">
                  <span className="text-sm font-medium text-aubergine-700 dark:text-sable-100">{country}</span>
                  <span className="tnum text-xs text-neutral">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* User table */}
        <div className="card overflow-hidden p-0">
          <div className="flex flex-col gap-3 border-b border-aubergine-100 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-white/5">
            <h2 className="text-sm font-semibold text-aubergine-700 dark:text-sable-100">{t('admin.users')}</h2>
            <div className="relative max-w-xs">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral" />
              <input
                type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder={t('admin.users.search')}
                className="w-full rounded-full border border-aubergine-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-neutral"><Loader2 size={16} className="animate-spin" /> {t('admin.loading')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-aubergine-100 text-left text-xs font-medium text-neutral dark:border-white/5">
                    <th className="px-5 py-3">{t('admin.users.email')}</th>
                    <th className="px-5 py-3">{t('admin.users.country')}</th>
                    <th className="px-5 py-3">{t('admin.users.plan')}</th>
                    <th className="px-5 py-3">{t('admin.users.joined')}</th>
                    <th className="px-5 py-3 text-right">{t('admin.users.status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-aubergine-50 dark:divide-white/5">
                  {filtered.map((u) => (
                    <tr key={u.id} className="transition-colors hover:bg-aubergine-50/50 dark:hover:bg-white/5">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-aubergine-700 dark:text-sable-100">{u.first_name ?? '—'}</span>
                          {u.is_admin && <span className="chip bg-rose-50 px-2 py-0.5 text-[10px] text-rose-600 dark:bg-rose-500/15 dark:text-rose-200"><Crown size={10} /> {t('admin.users.admin')}</span>}
                        </div>
                        <span className="block text-xs text-neutral">{u.email}</span>
                      </td>
                      <td className="px-5 py-3 text-xs text-neutral">{u.country ?? '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`chip px-2 py-0.5 text-[10px] ${PLAN_COLORS[u.subscription_plan ?? 'free'] ?? PLAN_COLORS.free}`}>
                          {t(`admin.plans.${u.subscription_plan ?? 'free'}` as never)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-neutral">{u.created_at ? fmtDate(u.created_at, lang) : '—'}</td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => toggleAdmin(u)}
                          disabled={busyId === u.id || u.id === profile?.id}
                          className="rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:opacity-40 hover:bg-aubergine-50 dark:hover:bg-white/5"
                        >
                          {busyId === u.id ? <Loader2 size={12} className="animate-spin" /> : u.is_admin ? t('admin.users.removeAdmin') : t('admin.users.makeAdmin')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Users; label: string; value: string | number; color: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 text-xs font-medium text-neutral">
        <Icon size={14} style={{ color }} />
        {label}
      </div>
      <p className="tnum mt-2 text-2xl font-bold text-aubergine-700 dark:text-sable-100">{value}</p>
    </div>
  );
}
