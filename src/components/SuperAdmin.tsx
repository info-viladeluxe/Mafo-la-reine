import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Users, Crown, TrendingUp, Activity, Search, Shield, ArrowLeft, Loader2, Globe,
  Plus, Trash2, Edit3, X, Gift, Tag, UserCog, ScrollText, Bot, Sparkles,
  LogIn, LogOut, ChevronRight, BarChart3, DollarSign, Check, Copy,
} from 'lucide-react';
import { supabase, type Profile } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import type { TranslationKey } from '../i18n/translations';

/* ── Types ────────────────────────────────────────────────────────────────── */

interface StaffRole {
  id: string;
  name: string;
  description: string;
  permissions: Record<string, boolean>;
  is_system: boolean;
  created_at: string;
}
interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  assigned_by: string | null;
  created_at: string;
  role?: StaffRole;
  user?: Profile;
}
interface CommercialCode {
  id: string;
  code: string;
  label: string;
  created_by: string | null;
  assigned_to: string | null;
  discount_type: string;
  discount_value: number;
  max_uses: number | null;
  uses_count: number;
  status: string;
  expires_at: string | null;
  created_at: string;
  assignee?: Profile;
}
interface ActivityLog {
  id: string;
  user_id: string;
  event_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
  user?: Profile;
}
interface AuditEntry {
  id: string;
  admin_id: string | null;
  action: string;
  target_user_id: string | null;
  target_resource: string | null;
  details: Record<string, unknown>;
  created_at: string;
  admin?: Profile;
  target_user?: Profile;
}

type Tab = 'overview' | 'users' | 'staff' | 'codes' | 'subscriptions' | 'ai' | 'audit';

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function fmtDate(iso: string, lang: 'fr' | 'en') {
  return new Date(iso).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtDateTime(iso: string, lang: 'fr' | 'en') {
  return new Date(iso).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function genCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = 'MAFO-';
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

/* ── Main Component ───────────────────────────────────────────────────────── */

export function SuperAdmin({ onExit }: { onExit: () => void }) {
  const { t, lang } = useI18n();
  const { profile } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [users, setUsers] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [codes, setCodes] = useState<CommercialCode[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [usersR, rolesR, userRolesR, codesR, activityR, auditR] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('staff_roles').select('*').order('created_at', { ascending: true }),
      supabase.from('user_roles').select('*, role:staff_roles(*)'),
      supabase.from('commercial_codes').select('*').order('created_at', { ascending: false }),
      supabase.from('staff_activity_log').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('admin_audit_log').select('*').order('created_at', { ascending: false }).limit(100),
    ]);

    if (usersR.error) { setError(t('admin.error')); setLoading(false); return; }
    setUsers((usersR.data as Profile[]) ?? []);
    setRoles((rolesR.data as StaffRole[]) ?? []);
    const ur = (userRolesR.data as UserRole[]) ?? [];
    setUserRoles(ur);
    setCodes((codesR.data as CommercialCode[]) ?? []);
    setActivity((activityR.data as ActivityLog[]) ?? []);
    setAudit((auditR.data as AuditEntry[]) ?? []);
    setLoading(false);
  }, [t]);

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, []);

  const logAudit = async (action: string, targetUserId?: string, targetResource?: string, details?: Record<string, unknown>) => {
    if (!profile?.id) return;
    await supabase.from('admin_audit_log').insert({
      admin_id: profile.id, action, target_user_id: targetUserId ?? null,
      target_resource: targetResource ?? null, details: details ?? {},
    });
  };

  /* ── Guards ────────────────────────────────────────────────────────────── */

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

  const TABS: { key: Tab; label: string; icon: typeof Users }[] = [
    { key: 'overview', label: t('admin.tabs.overview'), icon: BarChart3 },
    { key: 'users', label: t('admin.tabs.users'), icon: Users },
    { key: 'staff', label: t('admin.tabs.staff'), icon: UserCog },
    { key: 'codes', label: t('admin.tabs.codes'), icon: Tag },
    { key: 'subscriptions', label: t('admin.tabs.subscriptions'), icon: Crown },
    { key: 'ai', label: t('admin.tabs.ai'), icon: Bot },
    { key: 'audit', label: t('admin.tabs.audit'), icon: ScrollText },
  ];

  return (
    <div className="min-h-screen bg-sable-100 dark:bg-indigo-400">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-aubergine-600 text-white shadow-soft">
              <Shield size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-aubergine-700 dark:text-sable-100">{t('admin.title')}</h1>
              <p className="text-xs text-neutral">{t('admin.subtitle')}</p>
            </div>
          </div>
          <button onClick={onExit} className="btn-outline px-4 py-2.5 text-sm"><ArrowLeft size={16} /> {t('admin.back')}</button>
        </div>

        {error && <div className="mt-4 rounded-xl bg-terre-50 px-4 py-3 text-sm text-terre-600 dark:bg-terre-500/15 dark:text-terre-200">{error}</div>}

        {/* Tabs */}
        <div className="mt-6 flex gap-1 overflow-x-auto pb-1">
          {TABS.map((tb) => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                tab === tb.key
                  ? 'bg-aubergine-600 text-white shadow-soft'
                  : 'text-aubergine-600 hover:bg-aubergine-50 dark:text-sable-100/70 dark:hover:bg-white/5'
              }`}
            >
              <tb.icon size={16} />
              {tb.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-sm text-neutral"><Loader2 size={18} className="animate-spin" /> {t('admin.loading')}</div>
          ) : (
            <>
              {tab === 'overview' && <OverviewTab users={users} activity={activity} codes={codes} audit={audit} lang={lang} t={t} />}
              {tab === 'users' && <UsersTab users={users} roles={roles} userRoles={userRoles} lang={lang} t={t} logAudit={logAudit} onReload={loadAll} />}
              {tab === 'staff' && <StaffTab users={users} roles={roles} userRoles={userRoles} lang={lang} t={t} logAudit={logAudit} onReload={loadAll} />}
              {tab === 'codes' && <CodesTab codes={codes} users={users} lang={lang} t={t} logAudit={logAudit} onReload={loadAll} />}
              {tab === 'subscriptions' && <SubscriptionsTab users={users} lang={lang} t={t} logAudit={logAudit} onReload={loadAll} />}
              {tab === 'ai' && <AITab users={users} lang={lang} t={t} />}
              {tab === 'audit' && <AuditTab audit={audit} users={users} lang={lang} t={t} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Overview Tab ─────────────────────────────────────────────────────────── */

function OverviewTab({ users, activity, codes, audit: _audit, lang, t }: {
  users: Profile[]; activity: ActivityLog[]; codes: CommercialCode[]; audit: AuditEntry[]; lang: 'fr' | 'en'; t: (k: TranslationKey, v?: Record<string, string | number>) => string;
}) {
  const totalUsers = users.length;
  const premiumUsers = users.filter((u) => u.subscription_plan === 'premium' || u.subscription_plan === 'family' || u.subscription_plan === 'premium_plus').length;
  const activeUsers = users.filter((u) => u.onboarding_completed).length;
  const today = new Date().toDateString();
  const enteredToday = activity.filter((a) => a.event_type === 'login' && new Date(a.created_at).toDateString() === today).length;
  const exitedToday = activity.filter((a) => a.event_type === 'logout' && new Date(a.created_at).toDateString() === today).length;
  const activeCodes = codes.filter((c) => c.status === 'active').length;
  const monthlyRevenue = premiumUsers * 5;

  const planDist = useMemo(() => {
    const dist: Record<string, number> = {};
    users.forEach((u) => { dist[u.subscription_plan ?? 'free'] = (dist[u.subscription_plan ?? 'free'] ?? 0) + 1; });
    return dist;
  }, [users]);

  const countryDist = useMemo(() => {
    const dist: Record<string, number> = {};
    users.forEach((u) => { if (u.country) dist[u.country] = (dist[u.country] ?? 0) + 1; });
    return Object.entries(dist).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [users]);

  // New users per day (last 7 days)
  const last7 = useMemo(() => {
    const days: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toDateString();
      const count = users.filter((u) => u.created_at && new Date(u.created_at).toDateString() === ds).length;
      days.push({ date: d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' }), count });
    }
    return days;
  }, [users, lang]);

  const maxBar = Math.max(...last7.map((d) => d.count), 1);

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label={t('admin.stats.users')} value={totalUsers} color="#5C2A4D" trend={`+${last7.reduce((a, b) => a + b.count, 0)} ${t('admin.thisWeek')}`} />
        <StatCard icon={Activity} label={t('admin.stats.active')} value={activeUsers} color="#12A76B" trend={`${Math.round((activeUsers / Math.max(totalUsers, 1)) * 100)}%`} />
        <StatCard icon={Crown} label={t('admin.stats.premium')} value={premiumUsers} color="#F0509C" trend={`${Math.round((premiumUsers / Math.max(totalUsers, 1)) * 100)}%`} />
        <StatCard icon={DollarSign} label={t('admin.stats.revenue')} value={`$${monthlyRevenue}`} color="#D69A2D" trend={t('admin.perMonth')} />
      </div>

      {/* Ins/outs + codes */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={LogIn} label={t('admin.stats.enteredToday')} value={enteredToday} color="#12A76B" />
        <StatCard icon={LogOut} label={t('admin.stats.exitedToday')} value={exitedToday} color="#A8461E" />
        <StatCard icon={Tag} label={t('admin.stats.activeCodes')} value={activeCodes} color="#5C2A4D" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* New users chart */}
        <div className="card p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-aubergine-700 dark:text-sable-100">
            <TrendingUp size={16} className="text-rose-500" /> {t('admin.newUsers7d')}
          </div>
          <div className="flex items-end justify-between gap-2" style={{ height: 140 }}>
            {last7.map((d, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-rose-400 to-rose-300 transition-all duration-500 dark:from-rose-500 dark:to-rose-400"
                    style={{ height: `${(d.count / maxBar) * 100}%`, minHeight: d.count > 0 ? '8px' : '2px' }}
                  />
                </div>
                <span className="text-[10px] text-neutral">{d.date}</span>
                <span className="tnum text-xs font-semibold text-aubergine-700 dark:text-sable-100">{d.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Plan distribution */}
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
      </div>

      {/* Countries */}
      <div className="card p-6">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-aubergine-700 dark:text-sable-100">
          <Globe size={16} className="text-emeraude-500" /> {t('admin.countries')}
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {countryDist.length === 0 ? <p className="text-sm text-neutral">—</p> : countryDist.map(([country, count]) => (
            <div key={country} className="flex items-center justify-between rounded-full bg-aubergine-50 px-4 py-2 dark:bg-white/5">
              <span className="text-sm font-medium text-aubergine-700 dark:text-sable-100">{country}</span>
              <span className="tnum text-xs text-neutral">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Users Tab ────────────────────────────────────────────────────────────── */

function UsersTab({ users, roles, userRoles, lang, t, logAudit, onReload }: {
  users: Profile[]; roles: StaffRole[]; userRoles: UserRole[]; lang: 'fr' | 'en'; t: (k: TranslationKey, v?: Record<string, string | number>) => string;
  logAudit: (a: string, uid?: string, res?: string, d?: Record<string, unknown>) => Promise<void>; onReload: () => Promise<void>;
}) {
  const { profile } = useAuth();
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<Profile | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter((u) => u.email?.toLowerCase().includes(q) || u.first_name?.toLowerCase().includes(q) || u.country?.toLowerCase().includes(q));
  }, [users, search]);

  const toggleAdmin = async (u: Profile) => {
    setBusyId(u.id);
    const { error } = await supabase.from('profiles').update({ is_admin: !u.is_admin }).eq('id', u.id);
    if (error) { setBusyId(null); return; }
    await logAudit(!u.is_admin ? 'promote_admin' : 'demote_admin', u.id, undefined, { email: u.email });
    setBusyId(null);
    onReload();
  };

  const changePlan = async (u: Profile, plan: string) => {
    setBusyId(u.id);
    const { error } = await supabase.from('profiles').update({ subscription_plan: plan }).eq('id', u.id);
    if (error) { setBusyId(null); return; }
    await logAudit('modify_subscription', u.id, undefined, { from: u.subscription_plan, to: plan });
    setBusyId(null);
    onReload();
  };

  const grantFreeSubscription = async (u: Profile) => {
    setBusyId(u.id);
    const trialEnd = new Date(); trialEnd.setFullYear(trialEnd.getFullYear() + 1);
    const { error: subErr } = await supabase.from('subscriptions').upsert({
      user_id: u.id, plan_id: 'premium', cycle: 'yearly', status: 'active',
      current_period_end: trialEnd.toISOString(), trial_ends_at: null,
    }, { onConflict: 'user_id' });
    if (subErr) { setBusyId(null); return; }
    await supabase.from('profiles').update({ subscription_plan: 'premium' }).eq('id', u.id);
    await logAudit('grant_subscription', u.id, undefined, { plan: 'premium', duration: '1 year' });
    setBusyId(null);
    onReload();
  };

  const PLAN_COLORS: Record<string, string> = {
    free: 'bg-neutral-100 text-neutral dark:bg-white/5',
    premium: 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-200',
    family: 'bg-ocre-50 text-ocre-600 dark:bg-ocre-400/15 dark:text-ocre-200',
    premium_plus: 'bg-aubergine-50 text-aubergine-600 dark:bg-white/5 dark:text-sable-100/80',
  };

  return (
    <div className="space-y-4">
      <div className="card overflow-hidden p-0">
        <div className="flex flex-col gap-3 border-b border-aubergine-100 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-white/5">
          <h2 className="text-sm font-semibold text-aubergine-700 dark:text-sable-100">{t('admin.users')}</h2>
          <div className="relative max-w-xs">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('admin.users.search')}
              className="w-full rounded-full border border-aubergine-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-aubergine-100 text-left text-xs font-medium text-neutral dark:border-white/5">
                <th className="px-5 py-3">{t('admin.users.email')}</th>
                <th className="px-5 py-3">{t('admin.users.country')}</th>
                <th className="px-5 py-3">{t('admin.users.plan')}</th>
                <th className="px-5 py-3">{t('admin.users.joined')}</th>
                <th className="px-5 py-3 text-right">{t('admin.users.actions')}</th>
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
                    <select
                      value={u.subscription_plan ?? 'free'}
                      onChange={(e) => changePlan(u, e.target.value)}
                      disabled={busyId === u.id}
                      className={`chip cursor-pointer border-0 px-2 py-0.5 text-[10px] outline-none ${PLAN_COLORS[u.subscription_plan ?? 'free'] ?? PLAN_COLORS.free}`}
                    >
                      <option value="free">{t('admin.plans.free')}</option>
                      <option value="premium">{t('admin.plans.premium')}</option>
                      <option value="family">{t('admin.plans.family')}</option>
                      <option value="premium_plus">{t('admin.plans.premium_plus')}</option>
                    </select>
                  </td>
                  <td className="px-5 py-3 text-xs text-neutral">{u.created_at ? fmtDate(u.created_at, lang) : '—'}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => grantFreeSubscription(u)} disabled={busyId === u.id}
                        className="rounded-full px-2.5 py-1 text-xs font-medium text-emeraude-600 transition-colors hover:bg-emeraude-50 dark:text-emeraude-200 dark:hover:bg-emeraude-700/15" title={t('admin.grantFree')}>
                        <Gift size={14} />
                      </button>
                      <button onClick={() => setEditUser(u)} disabled={busyId === u.id}
                        className="rounded-full px-2.5 py-1 text-xs font-medium text-aubergine-600 transition-colors hover:bg-aubergine-50 dark:text-sable-100/70 dark:hover:bg-white/5" title={t('admin.editRoles')}>
                        <UserCog size={14} />
                      </button>
                      <button onClick={() => toggleAdmin(u)} disabled={busyId === u.id || u.id === profile?.id}
                        className="rounded-full px-2.5 py-1 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-40 dark:text-rose-200 dark:hover:bg-rose-500/10" title={u.is_admin ? t('admin.users.removeAdmin') : t('admin.users.makeAdmin')}>
                        {busyId === u.id ? <Loader2 size={14} className="animate-spin" /> : u.is_admin ? <X size={14} /> : <Crown size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editUser && <RoleAssignmentModal user={editUser} roles={roles} userRoles={userRoles} onClose={() => setEditUser(null)} onReload={onReload} logAudit={logAudit} t={t} />}
    </div>
  );
}

/* ── Staff & Roles Tab ────────────────────────────────────────────────────── */

function StaffTab({ users, roles, userRoles, lang, t, logAudit, onReload }: {
  users: Profile[]; roles: StaffRole[]; userRoles: UserRole[]; lang: 'fr' | 'en'; t: (k: TranslationKey, v?: Record<string, string | number>) => string;
  logAudit: (a: string, uid?: string, res?: string, d?: Record<string, unknown>) => Promise<void>; onReload: () => Promise<void>;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [editRole, setEditRole] = useState<StaffRole | null>(null);

  const PERMISSION_KEYS = [
    'can_manage_users', 'can_manage_staff', 'can_manage_roles', 'can_manage_codes',
    'can_grant_subscriptions', 'can_modify_subscriptions', 'can_view_reports',
    'can_view_audit_log', 'can_manage_admins',
  ];

  const usersWithRoles = useMemo(() => {
    return users.map((u) => ({
      ...u,
      roles: userRoles.filter((ur) => ur.user_id === u.id).map((ur) => ur.role).filter(Boolean) as StaffRole[],
    }));
  }, [users, userRoles]);

  return (
    <div className="space-y-5">
      {/* Roles grid */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-aubergine-700 dark:text-sable-100">{t('admin.roles')}</h2>
          <button onClick={() => setShowCreate(true)} className="btn-primary px-4 py-2 text-sm"><Plus size={14} /> {t('admin.createRole')}</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((r) => (
            <div key={r.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-aubergine-50 text-aubergine-600 dark:bg-white/5 dark:text-sable-100/80">
                    <Shield size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-aubergine-700 dark:text-sable-100">{r.name}</p>
                    {r.is_system && <span className="text-[10px] text-neutral">{t('admin.systemRole')}</span>}
                  </div>
                </div>
                {!r.is_system && (
                  <button onClick={() => setEditRole(r)} className="rounded-full p-1.5 text-aubergine-600 hover:bg-aubergine-50 dark:text-sable-100/70 dark:hover:bg-white/5">
                    <Edit3 size={14} />
                  </button>
                )}
              </div>
              <p className="mt-2 text-xs text-neutral">{r.description || '—'}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {PERMISSION_KEYS.filter((k) => r.permissions[k]).map((k) => (
                  <span key={k} className="chip bg-emeraude-50 px-2 py-0.5 text-[10px] text-emeraude-700 dark:bg-emeraude-700/15 dark:text-emeraude-200">
                    {t(`admin.perms.${k}` as never)}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Staff list */}
      <div className="card overflow-hidden p-0">
        <div className="border-b border-aubergine-100 p-5 dark:border-white/5">
          <h2 className="text-sm font-semibold text-aubergine-700 dark:text-sable-100">{t('admin.staffList')}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-aubergine-100 text-left text-xs font-medium text-neutral dark:border-white/5">
                <th className="px-5 py-3">{t('admin.users.email')}</th>
                <th className="px-5 py-3">{t('admin.roles')}</th>
                <th className="px-5 py-3">{t('admin.users.joined')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-aubergine-50 dark:divide-white/5">
              {usersWithRoles.filter((u) => u.roles.length > 0 || u.is_admin).map((u) => (
                <tr key={u.id} className="transition-colors hover:bg-aubergine-50/50 dark:hover:bg-white/5">
                  <td className="px-5 py-3">
                    <span className="font-medium text-aubergine-700 dark:text-sable-100">{u.first_name ?? '—'}</span>
                    <span className="block text-xs text-neutral">{u.email}</span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.is_admin && <span className="chip bg-rose-50 px-2 py-0.5 text-[10px] text-rose-600 dark:bg-rose-500/15 dark:text-rose-200"><Crown size={10} /> {t('admin.users.admin')}</span>}
                      {u.roles.map((r) => (
                        <span key={r.id} className="chip bg-aubergine-50 px-2 py-0.5 text-[10px] text-aubergine-600 dark:bg-white/5 dark:text-sable-100/80">{r.name}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs text-neutral">{u.created_at ? fmtDate(u.created_at, lang) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && <RoleModal onClose={() => setShowCreate(false)} onReload={onReload} logAudit={logAudit} t={t} />}
      {editRole && <RoleModal role={editRole} onClose={() => setEditRole(null)} onReload={onReload} logAudit={logAudit} t={t} />}
    </div>
  );
}

/* ── Commercial Codes Tab ─────────────────────────────────────────────────── */

function CodesTab({ codes, users, lang, t, logAudit, onReload }: {
  codes: CommercialCode[]; users: Profile[]; lang: 'fr' | 'en'; t: (k: TranslationKey, v?: Record<string, string | number>) => string;
  logAudit: (a: string, uid?: string, res?: string, d?: Record<string, unknown>) => Promise<void>; onReload: () => Promise<void>;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const toggleStatus = async (c: CommercialCode) => {
    setBusyId(c.id);
    const newStatus = c.status === 'active' ? 'paused' : 'active';
    await supabase.from('commercial_codes').update({ status: newStatus }).eq('id', c.id);
    await logAudit('toggle_code', undefined, c.id, { code: c.code, from: c.status, to: newStatus });
    setBusyId(null);
    onReload();
  };

  const deleteCode = async (c: CommercialCode) => {
    setBusyId(c.id);
    await supabase.from('commercial_codes').delete().eq('id', c.id);
    await logAudit('delete_code', undefined, c.id, { code: c.code });
    setBusyId(null);
    onReload();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 1500);
  };

  const STATUS_COLORS: Record<string, string> = {
    active: 'bg-emeraude-50 text-emeraude-700 dark:bg-emeraude-700/15 dark:text-emeraude-200',
    paused: 'bg-ocre-50 text-ocre-700 dark:bg-ocre-400/15 dark:text-ocre-200',
    exhausted: 'bg-terre-50 text-terre-600 dark:bg-terre-500/15 dark:text-terre-200',
    archived: 'bg-neutral-100 text-neutral dark:bg-white/5',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-aubergine-700 dark:text-sable-100">{t('admin.codes')}</h2>
        <button onClick={() => setShowCreate(true)} className="btn-primary px-4 py-2 text-sm"><Plus size={14} /> {t('admin.createCode')}</button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {codes.map((c) => (
          <div key={c.id} className="card p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <code className="tnum rounded-full bg-aubergine-50 px-3 py-1 text-sm font-bold text-aubergine-700 dark:bg-white/5 dark:text-sable-100">{c.code}</code>
                  <button onClick={() => copyCode(c.code)} className="text-neutral hover:text-aubergine-600 dark:hover:text-sable-100">
                    {copied === c.code ? <Check size={14} className="text-emeraude-500" /> : <Copy size={14} />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-neutral">{c.label || '—'}</p>
              </div>
              <span className={`chip px-2 py-0.5 text-[10px] ${STATUS_COLORS[c.status] ?? STATUS_COLORS.active}`}>{t(`admin.codeStatus.${c.status}` as never)}</span>
            </div>
            <div className="mt-3 space-y-1 text-xs text-neutral">
              <p>{t('admin.codeType')}: <span className="font-medium text-aubergine-700 dark:text-sable-100">{t(`admin.codeTypes.${c.discount_type}` as never)}</span></p>
              <p>{t('admin.codeValue')}: <span className="tnum font-medium text-aubergine-700 dark:text-sable-100">{c.discount_value}</span></p>
              <p>{t('admin.codeUses')}: <span className="tnum font-medium text-aubergine-700 dark:text-sable-100">{c.uses_count}{c.max_uses ? ` / ${c.max_uses}` : ''}</span></p>
              {c.expires_at && <p>{t('admin.codeExpires')}: <span className="font-medium text-aubergine-700 dark:text-sable-100">{fmtDate(c.expires_at, lang)}</span></p>}
            </div>
            <div className="mt-4 flex items-center gap-1">
              <button onClick={() => toggleStatus(c)} disabled={busyId === c.id}
                className="rounded-full px-3 py-1.5 text-xs font-medium text-aubergine-600 transition-colors hover:bg-aubergine-50 dark:text-sable-100/70 dark:hover:bg-white/5">
                {busyId === c.id ? <Loader2 size={12} className="animate-spin" /> : c.status === 'active' ? t('admin.pauseCode') : t('admin.activateCode')}
              </button>
              <button onClick={() => deleteCode(c)} disabled={busyId === c.id}
                className="rounded-full px-3 py-1.5 text-xs font-medium text-terre-600 transition-colors hover:bg-terre-50 dark:text-terre-200 dark:hover:bg-terre-500/10">
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
        {codes.length === 0 && <p className="text-sm text-neutral">{t('admin.noCodes')}</p>}
      </div>

      {showCreate && <CodeModal users={users} onClose={() => setShowCreate(false)} onReload={onReload} logAudit={logAudit} t={t} />}
    </div>
  );
}

/* ── Subscriptions Tab ────────────────────────────────────────────────────── */

function SubscriptionsTab({ users, lang: _lang, t, logAudit, onReload }: {
  users: Profile[]; lang: 'fr' | 'en'; t: (k: TranslationKey, v?: Record<string, string | number>) => string;
  logAudit: (a: string, uid?: string, res?: string, d?: Record<string, unknown>) => Promise<void>; onReload: () => Promise<void>;
}) {
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const subUsers = users.filter((u) => u.subscription_plan && u.subscription_plan !== 'free');
  const filtered = useMemo(() => {
    if (!search.trim()) return subUsers;
    const q = search.toLowerCase();
    return subUsers.filter((u) => u.email?.toLowerCase().includes(q) || u.first_name?.toLowerCase().includes(q));
  }, [subUsers, search]);

  const changePlan = async (u: Profile, plan: string) => {
    setBusyId(u.id);
    await supabase.from('profiles').update({ subscription_plan: plan }).eq('id', u.id);
    await logAudit('modify_subscription', u.id, undefined, { to: plan });
    setBusyId(null);
    onReload();
  };

  const grantFree = async (u: Profile) => {
    setBusyId(u.id);
    const trialEnd = new Date(); trialEnd.setFullYear(trialEnd.getFullYear() + 1);
    await supabase.from('subscriptions').upsert({
      user_id: u.id, plan_id: 'premium', cycle: 'yearly', status: 'active',
      current_period_end: trialEnd.toISOString(),
    }, { onConflict: 'user_id' });
    await supabase.from('profiles').update({ subscription_plan: 'premium' }).eq('id', u.id);
    await logAudit('grant_subscription', u.id, undefined, { plan: 'premium', duration: '1 year' });
    setBusyId(null);
    onReload();
  };

  const cancelSub = async (u: Profile) => {
    setBusyId(u.id);
    await supabase.from('subscriptions').update({ status: 'canceled', cancel_at_period_end: true }).eq('user_id', u.id);
    await supabase.from('profiles').update({ subscription_plan: 'free' }).eq('id', u.id);
    await logAudit('cancel_subscription', u.id, undefined, {});
    setBusyId(null);
    onReload();
  };

  const PLAN_COLORS: Record<string, string> = {
    free: 'bg-neutral-100 text-neutral dark:bg-white/5',
    premium: 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-200',
    family: 'bg-ocre-50 text-ocre-600 dark:bg-ocre-400/15 dark:text-ocre-200',
    premium_plus: 'bg-aubergine-50 text-aubergine-600 dark:bg-white/5 dark:text-sable-100/80',
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Crown} label={t('admin.subStats.premium')} value={subUsers.filter((u) => u.subscription_plan === 'premium').length} color="#F0509C" />
        <StatCard icon={Sparkles} label={t('admin.subStats.pro')} value={subUsers.filter((u) => u.subscription_plan === 'premium_plus').length} color="#5C2A4D" />
        <StatCard icon={Gift} label={t('admin.subStats.free')} value={users.length - subUsers.length} color="#8A7E74" />
      </div>

      <div className="card overflow-hidden p-0">
        <div className="flex flex-col gap-3 border-b border-aubergine-100 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-white/5">
          <h2 className="text-sm font-semibold text-aubergine-700 dark:text-sable-100">{t('admin.subscriptionManagement')}</h2>
          <div className="relative max-w-xs">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('admin.users.search')}
              className="w-full rounded-full border border-aubergine-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-aubergine-100 text-left text-xs font-medium text-neutral dark:border-white/5">
                <th className="px-5 py-3">{t('admin.users.email')}</th>
                <th className="px-5 py-3">{t('admin.users.plan')}</th>
                <th className="px-5 py-3 text-right">{t('admin.users.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-aubergine-50 dark:divide-white/5">
              {filtered.map((u) => (
                <tr key={u.id} className="transition-colors hover:bg-aubergine-50/50 dark:hover:bg-white/5">
                  <td className="px-5 py-3">
                    <span className="font-medium text-aubergine-700 dark:text-sable-100">{u.first_name ?? '—'}</span>
                    <span className="block text-xs text-neutral">{u.email}</span>
                  </td>
                  <td className="px-5 py-3">
                    <select value={u.subscription_plan ?? 'free'} onChange={(e) => changePlan(u, e.target.value)} disabled={busyId === u.id}
                      className={`chip cursor-pointer border-0 px-2 py-0.5 text-[10px] outline-none ${PLAN_COLORS[u.subscription_plan ?? 'free'] ?? PLAN_COLORS.free}`}>
                      <option value="free">{t('admin.plans.free')}</option>
                      <option value="premium">{t('admin.plans.premium')}</option>
                      <option value="family">{t('admin.plans.family')}</option>
                      <option value="premium_plus">{t('admin.plans.premium_plus')}</option>
                    </select>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => grantFree(u)} disabled={busyId === u.id} title={t('admin.grantFree')}
                        className="rounded-full px-2.5 py-1 text-xs font-medium text-emeraude-600 transition-colors hover:bg-emeraude-50 dark:text-emeraude-200 dark:hover:bg-emeraude-700/15">
                        <Gift size={14} />
                      </button>
                      <button onClick={() => cancelSub(u)} disabled={busyId === u.id} title={t('admin.cancelSub')}
                        className="rounded-full px-2.5 py-1 text-xs font-medium text-terre-600 transition-colors hover:bg-terre-50 disabled:opacity-40 dark:text-terre-200 dark:hover:bg-terre-500/10">
                        <X size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── AI Insights Tab ──────────────────────────────────────────────────────── */

function AITab({ users, lang, t }: { users: Profile[]; lang: 'fr' | 'en'; t: (k: TranslationKey, v?: Record<string, string | number>) => string }) {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateInsight = async () => {
    setLoading(true);
    const total = users.length;
    const premium = users.filter((u) => u.subscription_plan === 'premium' || u.subscription_plan === 'family' || u.subscription_plan === 'premium_plus').length;
    const active = users.filter((u) => u.onboarding_completed).length;
    const countries = new Set(users.map((u) => u.country).filter(Boolean)).size;
    const conversionRate = total > 0 ? ((premium / total) * 100).toFixed(1) : '0';
    const completionRate = total > 0 ? ((active / total) * 100).toFixed(1) : '0';

    const prompt = lang === 'fr'
      ? `Analyse ces données de plateforme santé féminine Mafo: ${total} utilisateurs totaux, ${premium} payants (${conversionRate}% conversion), ${active} ont complété l'onboarding (${completionRate}%), ${countries} pays. Donne 3 recommandations stratégiques concrètes pour augmenter la conversion et l'engagement. Format: bullet points.`
      : `Analyze this Mafo women's health platform data: ${total} total users, ${premium} paying (${conversionRate}% conversion), ${active} completed onboarding (${completionRate}%), ${countries} countries. Give 3 concrete strategic recommendations to increase conversion and engagement. Format: bullet points.`;

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;
      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }], lang }),
      });
      if (!resp.ok) throw new Error('Failed');
      const data = await resp.json();
      setInsight(data.content || 'No insight generated');
    } catch {
      setInsight(lang === 'fr'
        ? `• Conversion à ${conversionRate}% — envisagez un essai gratuit plus long ou des réductions ciblées.\n• Taux de complétion d'onboarding à ${completionRate}% — simplifiez le parcours d'inscription.\n• Présence dans ${countries} pays — localisez le contenu pour chaque marché.`
        : `• Conversion at ${conversionRate}% — consider a longer free trial or targeted discounts.\n• Onboarding completion at ${completionRate}% — simplify the signup flow.\n• Presence in ${countries} countries — localize content for each market.`);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="card p-6">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-rose-100 text-rose-500 dark:bg-rose-500/20 dark:text-rose-200"><Bot size={22} /></div>
          <div>
            <h2 className="text-sm font-semibold text-aubergine-700 dark:text-sable-100">{t('admin.aiInsights')}</h2>
            <p className="text-xs text-neutral">{t('admin.aiInsightsDesc')}</p>
          </div>
        </div>
        <button onClick={generateInsight} disabled={loading} className="btn-primary mt-4 px-5 py-2.5 text-sm">
          {loading ? <><Loader2 size={14} className="animate-spin" /> {t('admin.generating')}</> : <><Sparkles size={14} /> {t('admin.generateInsight')}</>}
        </button>
      </div>

      {insight && (
        <div className="card p-6">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-aubergine-700 dark:text-sable-100">
            <Sparkles size={16} className="text-rose-500" /> {t('admin.aiReport')}
          </div>
          <div className="whitespace-pre-wrap text-sm text-aubergine-700 dark:text-sable-100/90">{insight}</div>
        </div>
      )}
    </div>
  );
}

/* ── Audit Log Tab ────────────────────────────────────────────────────────── */

function AuditTab({ audit, users, lang, t }: { audit: AuditEntry[]; users: Profile[]; lang: 'fr' | 'en'; t: (k: TranslationKey, v?: Record<string, string | number>) => string }) {
  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  return (
    <div className="card overflow-hidden p-0">
      <div className="border-b border-aubergine-100 p-5 dark:border-white/5">
        <h2 className="text-sm font-semibold text-aubergine-700 dark:text-sable-100">{t('admin.auditLog')}</h2>
      </div>
      <div className="max-h-[60vh] overflow-y-auto">
        {audit.length === 0 ? (
          <p className="py-12 text-center text-sm text-neutral">{t('admin.noAudit')}</p>
        ) : (
          <div className="divide-y divide-aubergine-50 dark:divide-white/5">
            {audit.map((a) => {
              const admin = a.admin_id ? userMap.get(a.admin_id) : null;
              const target = a.target_user_id ? userMap.get(a.target_user_id) : null;
              return (
                <div key={a.id} className="flex items-start gap-3 p-4">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-aubergine-50 text-aubergine-600 dark:bg-white/5 dark:text-sable-100/80">
                    <ScrollText size={14} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-aubergine-700 dark:text-sable-100">{t(`admin.auditActions.${a.action}` as never) ?? a.action}</span>
                      <span className="text-xs text-neutral">{fmtDateTime(a.created_at, lang)}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-neutral">
                      {admin?.email ?? '—'} → {target?.email ?? a.target_resource ?? '—'}
                    </p>
                    {Object.keys(a.details).length > 0 && (
                      <pre className="mt-1 overflow-x-auto rounded-lg bg-aubergine-50 p-2 text-[10px] text-aubergine-600 dark:bg-white/5 dark:text-sable-100/60">{JSON.stringify(a.details)}</pre>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Role Assignment Modal ───────────────────────────────────────────────── */

function RoleAssignmentModal({ user, roles, userRoles, onClose, onReload, logAudit, t }: {
  user: Profile; roles: StaffRole[]; userRoles: UserRole[]; onClose: () => void;
  onReload: () => Promise<void>; logAudit: (a: string, uid?: string, res?: string, d?: Record<string, unknown>) => Promise<void>;
  t: (k: TranslationKey, v?: Record<string, string | number>) => string;
}) {
  const [busy, setBusy] = useState(false);
  const currentRoleIds = new Set(userRoles.filter((ur) => ur.user_id === user.id).map((ur) => ur.role_id));

  const toggleRole = async (role: StaffRole) => {
    setBusy(true);
    if (currentRoleIds.has(role.id)) {
      await supabase.from('user_roles').delete().eq('user_id', user.id).eq('role_id', role.id);
      await logAudit('unassign_role', user.id, role.id, { role: role.name });
    } else {
      await supabase.from('user_roles').insert({ user_id: user.id, role_id: role.id });
      await logAudit('assign_role', user.id, role.id, { role: role.name });
    }
    setBusy(false);
    onReload();
  };

  return (
    <Modal onClose={onClose} title={t('admin.editRolesFor', { name: user.first_name ?? user.email ?? '—' })}>
      <div className="space-y-2">
        {roles.map((r) => (
          <button key={r.id} onClick={() => toggleRole(r)} disabled={busy}
            className={`flex w-full items-center justify-between rounded-full border px-4 py-3 text-sm transition-all ${
              currentRoleIds.has(r.id)
                ? 'border-rose-400 bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-200'
                : 'border-aubergine-100 text-aubergine-600 hover:border-aubergine-200 dark:border-white/10 dark:text-sable-100/70'
            }`}>
            <div className="text-left">
              <p className="font-medium">{r.name}</p>
              <p className="text-xs text-neutral">{r.description || '—'}</p>
            </div>
            {currentRoleIds.has(r.id) && <Check size={16} />}
          </button>
        ))}
      </div>
    </Modal>
  );
}

/* ── Role Create/Edit Modal ───────────────────────────────────────────────── */

function RoleModal({ role, onClose, onReload, logAudit, t }: {
  role?: StaffRole; onClose: () => void; onReload: () => Promise<void>;
  logAudit: (a: string, uid?: string, res?: string, d?: Record<string, unknown>) => Promise<void>;
  t: (k: TranslationKey, v?: Record<string, string | number>) => string;
}) {
  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [permissions, setPermissions] = useState<Record<string, boolean>>(role?.permissions ?? {});
  const [busy, setBusy] = useState(false);

  const PERM_KEYS = [
    'can_manage_users', 'can_manage_staff', 'can_manage_roles', 'can_manage_codes',
    'can_grant_subscriptions', 'can_modify_subscriptions', 'can_view_reports',
    'can_view_audit_log', 'can_manage_admins',
  ];

  const save = async () => {
    setBusy(true);
    if (role) {
      await supabase.from('staff_roles').update({ name, description, permissions, updated_at: new Date().toISOString() }).eq('id', role.id);
      await logAudit('update_role', undefined, role.id, { name });
    } else {
      await supabase.from('staff_roles').insert({ name, description, permissions, is_system: false });
      await logAudit('create_role', undefined, undefined, { name });
    }
    setBusy(false);
    onClose();
    onReload();
  };

  return (
    <Modal onClose={onClose} title={role ? t('admin.editRole') : t('admin.createRole')}>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-neutral">{t('admin.roleName')}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sales Manager"
            className="mt-1 w-full rounded-full border border-aubergine-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100" />
        </div>
        <div>
          <label className="text-xs font-medium text-neutral">{t('admin.roleDescription')}</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this role do?"
            className="mt-1 w-full rounded-full border border-aubergine-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100" />
        </div>
        <div>
          <label className="text-xs font-medium text-neutral">{t('admin.permissions')}</label>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {PERM_KEYS.map((k) => (
              <button key={k} onClick={() => setPermissions((p) => ({ ...p, [k]: !p[k] }))}
                className={`flex items-center justify-between rounded-full border px-3 py-2 text-xs transition-all ${
                  permissions[k]
                    ? 'border-emeraude-400 bg-emeraude-50 text-emeraude-700 dark:bg-emeraude-700/15 dark:text-emeraude-200'
                    : 'border-aubergine-100 text-aubergine-600 dark:border-white/10 dark:text-sable-100/70'
                }`}>
                {t(`admin.perms.${k}` as never)}
                {permissions[k] && <Check size={14} />}
              </button>
            ))}
          </div>
        </div>
        <button onClick={save} disabled={busy || !name.trim()} className="btn-primary w-full px-5 py-2.5 text-sm">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} {t('admin.save')}
        </button>
      </div>
    </Modal>
  );
}

/* ── Code Create Modal ────────────────────────────────────────────────────── */

function CodeModal({ users, onClose, onReload, logAudit, t }: {
  users: Profile[]; onClose: () => void; onReload: () => Promise<void>;
  logAudit: (a: string, uid?: string, res?: string, d?: Record<string, unknown>) => Promise<void>;
  t: (k: TranslationKey, v?: Record<string, string | number>) => string;
}) {
  const [code, setCode] = useState(genCode());
  const [label, setLabel] = useState('');
  const [discountType, setDiscountType] = useState('free_trial');
  const [discountValue, setDiscountValue] = useState(7);
  const [maxUses, setMaxUses] = useState<number | ''>('');
  const [assignedTo, setAssignedTo] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const { data } = await supabase.from('commercial_codes').insert({
      code, label, discount_type: discountType, discount_value: discountValue,
      max_uses: maxUses || null, assigned_to: assignedTo || null,
    }).select('*').maybeSingle();
    if (data) await logAudit('create_code', undefined, data.id, { code, type: discountType });
    setBusy(false);
    onClose();
    onReload();
  };

  return (
    <Modal onClose={onClose} title={t('admin.createCode')}>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-neutral">{t('admin.codeString')}</label>
          <div className="mt-1 flex gap-2">
            <input value={code} onChange={(e) => setCode(e.target.value)}
              className="tnum flex-1 rounded-full border border-aubergine-200 bg-white px-4 py-2.5 text-sm font-mono outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100" />
            <button onClick={() => setCode(genCode())} className="btn-outline px-3 py-2.5 text-sm"><ChevronRight size={14} /></button>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-neutral">{t('admin.codeLabel')}</label>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Summer Campaign 2026"
            className="mt-1 w-full rounded-full border border-aubergine-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-neutral">{t('admin.codeType')}</label>
            <select value={discountType} onChange={(e) => setDiscountType(e.target.value)}
              className="mt-1 w-full rounded-full border border-aubergine-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-rose-400 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100">
              <option value="free_trial">{t('admin.codeTypes.free_trial')}</option>
              <option value="free_subscription">{t('admin.codeTypes.free_subscription')}</option>
              <option value="percent">{t('admin.codeTypes.percent')}</option>
              <option value="fixed">{t('admin.codeTypes.fixed')}</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-neutral">{t('admin.codeValue')}</label>
            <input type="number" value={discountValue} onChange={(e) => setDiscountValue(Number(e.target.value))}
              className="tnum mt-1 w-full rounded-full border border-aubergine-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100" />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-neutral">{t('admin.codeMaxUses')}</label>
            <input type="number" value={maxUses} onChange={(e) => setMaxUses(e.target.value ? Number(e.target.value) : '')} placeholder="∞"
              className="tnum mt-1 w-full rounded-full border border-aubergine-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100" />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral">{t('admin.assignToCommercial')}</label>
            <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}
              className="mt-1 w-full rounded-full border border-aubergine-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-rose-400 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100">
              <option value="">—</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.email}</option>)}
            </select>
          </div>
        </div>
        <button onClick={save} disabled={busy || !code.trim()} className="btn-primary w-full px-5 py-2.5 text-sm">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} {t('admin.createCode')}
        </button>
      </div>
    </Modal>
  );
}

/* ── Shared Modal ─────────────────────────────────────────────────────────── */

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-aubergine-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="card relative z-10 w-full max-w-lg space-y-4 p-6 shadow-soft-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-aubergine-700 dark:text-sable-100">{title}</h3>
          <button onClick={onClose} className="rounded-full p-1.5 text-neutral hover:bg-aubergine-50 dark:hover:bg-white/5"><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ── StatCard ─────────────────────────────────────────────────────────────── */

function StatCard({ icon: Icon, label, value, color, trend }: { icon: typeof Users; label: string; value: string | number; color: string; trend?: string }) {
  return (
    <div className="card p-5 transition-all hover:-translate-y-0.5 hover:shadow-soft-lg">
      <div className="flex items-center gap-2 text-xs font-medium text-neutral">
        <Icon size={14} style={{ color }} />
        {label}
      </div>
      <p className="tnum mt-2 text-2xl font-bold text-aubergine-700 dark:text-sable-100">{value}</p>
      {trend && <p className="mt-1 text-[10px] text-neutral">{trend}</p>}
    </div>
  );
}
