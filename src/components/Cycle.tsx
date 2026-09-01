import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, X, Loader2, Calendar, TrendingUp, HeartPulse, Droplet } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { todayISOLocal } from '../lib/dateUtils';
import { useCycleState } from '../lib/cycle';

interface CycleEntry {
  id: string;
  start_date: string;
  flow: 'light' | 'medium' | 'heavy' | null;
  notes: string | null;
  created_at: string;
}

type Flow = 'light' | 'medium' | 'heavy';

const flowColor: Record<Flow, string> = {
  light: 'bg-cycle/20 text-cycle',
  medium: 'bg-cycle/30 text-cycle',
  heavy: 'bg-cycle/50 text-white',
};

function fmtDate(iso: string, lang: 'fr' | 'en') {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function Cycle() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const cycleState = useCycleState();

  const [entries, setEntries] = useState<CycleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // form state
  const [date, setDate] = useState(todayISOLocal());
  const [flow, setFlow] = useState<Flow | ''>('');
  const [notes, setNotes] = useState('');

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('cycle_entries')
      .select('*')
      .order('start_date', { ascending: false });
    setLoading(false);
    if (error) { setError(t('cycle.error')); return; }
    setEntries((data as CycleEntry[]) ?? []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const flashToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.from('cycle_entries').insert({
      start_date: date,
      flow: flow || null,
      notes: notes.trim() || null,
    });
    setBusy(false);
    if (err) { setError(t('cycle.saveError')); return; }
    setShowForm(false);
    setNotes(''); setFlow('');
    setDate(todayISOLocal());
    flashToast(t('cycle.saved'));
    load();
  };

  const remove = async (id: string) => {
    if (!window.confirm(t('cycle.confirmDelete'))) return;
    const { error: err } = await supabase.from('cycle_entries').delete().eq('id', id);
    if (err) { setError(t('cycle.deleteError')); return; }
    load();
  };

  // Derived stats
  const sortedAsc = useMemo(() => [...entries].sort((a, b) => a.start_date.localeCompare(b.start_date)), [entries]);

  const cycleLengths = useMemo(() => {
    const out: { label: string; length: number }[] = [];
    for (let i = 1; i < sortedAsc.length; i++) {
      const diff = Math.round((new Date(sortedAsc[i].start_date).getTime() - new Date(sortedAsc[i - 1].start_date).getTime()) / 86400000);
      out.push({ label: `${i}`, length: diff });
    }
    return out;
  }, [sortedAsc]);

  const avgCycle = cycleLengths.length
    ? Math.round(cycleLengths.reduce((s, c) => s + c.length, 0) / cycleLengths.length)
    : cycleState?.cycleLength ?? 28;
  const avgPeriod = cycleState?.periodLength ?? 5;

  // Trend chart bounds
  const trendMax = Math.max(35, ...cycleLengths.map((c) => c.length));
  const trendMin = Math.min(21, ...cycleLengths.map((c) => c.length));
  const range = Math.max(1, trendMax - trendMin);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-aubergine-700 dark:text-sable-100">
            {t('cycle.title')}
          </h1>
          <p className="mt-1 text-sm text-neutral">{t('cycle.subtitle')}</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary px-4 py-2.5 text-sm">
          <Plus size={16} /> {t('cycle.log')}
        </button>
      </div>

      {error && (
        <div className="animate-fade-in rounded-xl bg-terre-50 px-4 py-3 text-sm text-terre-600 dark:bg-terre-500/15 dark:text-terre-200">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={HeartPulse} label={t('cycle.avgCycle')} value={`${avgCycle}`} unit={t('cycle.daysShort')} color="#C97A87" />
        <StatCard icon={Droplet} label={t('cycle.avgPeriod')} value={`${avgPeriod}`} unit={t('cycle.daysShort')} color="#A8461E" />
        <StatCard icon={Calendar} label={t('cycle.totalCycles')} value={`${entries.length}`} unit="" color="#5C2A4D" />
      </div>

      {/* Current cycle summary */}
      {cycleState && (
        <div className="card overflow-hidden p-6">
          <div className="flex items-center gap-2 text-sm font-medium text-aubergine-700 dark:text-sable-100">
            <HeartPulse size={16} className="text-cycle" />
            {t('dash.day', { n: cycleState.dayOfCycle })}
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs">
            <span className="chip bg-emeraude-50 text-emeraude-700 dark:bg-emeraude-700/20 dark:text-emeraude-200">
              {t('dash.fertileWindowDesc', { start: cycleState.fertileStart, end: cycleState.fertileEnd })}
            </span>
            <span className="chip bg-ocre-50 text-ocre-700 dark:bg-ocre-400/15 dark:text-ocre-200">
              {t('dash.ovulation')} · {t('dash.ovulationIn', { n: Math.max(0, cycleState.ovulationDay - cycleState.dayOfCycle) })}
            </span>
            <span className="chip bg-aubergine-50 text-aubergine-600 dark:bg-white/5 dark:text-sable-100/80">
              {cycleState.daysUntilPeriod > 0
                ? t('dash.periodIn', { n: cycleState.daysUntilPeriod })
                : t('dash.periodToday')}
            </span>
          </div>
        </div>
      )}

      {/* Trend chart */}
      <div className="card p-6">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-aubergine-700 dark:text-sable-100">
          <TrendingUp size={16} className="text-ocre-500" />
          {t('cycle.trend')}
        </div>
        <p className="mb-4 text-xs text-neutral">{t('cycle.trendDesc')}</p>
        {cycleLengths.length >= 2 ? (
          <div className="flex items-end gap-2" style={{ height: 160 }}>
            {cycleLengths.map((c, i) => {
              const h = ((c.length - trendMin) / range) * 100 + 20;
              return (
                <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className="tnum text-[10px] font-semibold text-aubergine-700 dark:text-sable-100">{c.length}</span>
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-cycle/40 to-cycle transition-all duration-700 hover:from-cycle/60 hover:to-cycle"
                    style={{ height: `${h}%` }}
                  />
                  <span className="text-[10px] text-neutral">{c.label}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-neutral">{t('cycle.noData')}</p>
        )}
      </div>

      {/* History */}
      <div className="card p-6">
        <h2 className="mb-4 text-sm font-semibold text-aubergine-700 dark:text-sable-100">
          {t('cycle.history')}
        </h2>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-neutral">
            <Loader2 size={16} className="animate-spin" /> {t('cycle.loading')}
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-cycle/10 text-cycle">
              <HeartPulse size={26} />
            </div>
            <p className="max-w-xs text-sm text-neutral">{t('cycle.empty')}</p>
            <button onClick={() => setShowForm(true)} className="btn-primary px-4 py-2.5 text-sm">
              <Plus size={16} /> {t('cycle.emptyCta')}
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-aubergine-100 dark:divide-white/5">
            {entries.map((e, i) => {
              const flowVal = e.flow as Flow | null;
              return (
                <li key={e.id} className="flex items-center gap-4 py-3.5">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cycle/10 text-cycle">
                    <Droplet size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-aubergine-700 dark:text-sable-100">
                        {fmtDate(e.start_date, lang)}
                      </span>
                      {flowVal && (
                        <span className={`chip px-2 py-0.5 text-[10px] ${flowColor[flowVal]}`}>
                          {t(`cycle.flow.${flowVal}` as never)}
                        </span>
                      )}
                    </div>
                    {e.notes && (
                      <p className="mt-0.5 truncate text-xs text-neutral">{e.notes}</p>
                    )}
                  </div>
                  <span className="hidden text-xs text-neutral sm:block">
                    {t('cycle.cycleN', { n: entries.length - i })}
                  </span>
                  <button
                    onClick={() => remove(e.id)}
                    aria-label={t('cycle.delete')}
                    className="btn-icon btn-icon-sm btn-icon-danger"
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Log modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-aubergine-900/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative m-0 w-full max-w-md animate-fade-up rounded-t-3xl bg-sable-50 p-6 shadow-soft-lg sm:m-4 sm:rounded-3xl dark:bg-indigo-300">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-aubergine-700 dark:text-sable-100">{t('cycle.log')}</h3>
              <button onClick={() => setShowForm(false)} aria-label={t('cycle.cancel')} className="btn-icon btn-icon-md">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-aubergine-700 dark:text-sable-100">
                  {t('cycle.logDate')}
                </label>
                <div className="relative">
                  <Calendar size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    max={todayISOLocal()}
                    className="w-full rounded-xl border border-aubergine-200 bg-white py-2.5 pl-10 pr-3 text-sm text-aubergine-900 outline-none transition-all focus:border-ocre-400 focus:ring-2 focus:ring-ocre-200 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-aubergine-700 dark:text-sable-100">
                  {t('cycle.flow')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['light', 'medium', 'heavy'] as Flow[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFlow(flow === f ? '' : f)}
                      className={`rounded-xl border-2 py-2.5 text-xs font-medium transition-all ${
                        flow === f
                          ? 'border-cycle bg-cycle/15 text-cycle'
                          : 'border-aubergine-100 bg-white text-aubergine-600 hover:border-aubergine-200 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100/80'
                      }`}
                    >
                      {t(`cycle.flow.${f}` as never)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-aubergine-700 dark:text-sable-100">
                  {t('cycle.notes')}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('cycle.notesPlaceholder')}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-aubergine-200 bg-white px-4 py-2.5 text-sm text-aubergine-900 outline-none transition-all placeholder:text-neutral/60 focus:border-ocre-400 focus:ring-2 focus:ring-ocre-200 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100 dark:placeholder:text-sable-100/40"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowForm(false)} className="btn-outline flex-1 py-2.5 text-sm">
                  {t('cycle.cancel')}
                </button>
                <button onClick={save} disabled={busy || !date} className="btn-primary flex-1 py-2.5 text-sm">
                  {busy ? <Loader2 size={16} className="animate-spin" /> : null}
                  {t('cycle.save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-fade-up">
          <div className="flex items-center gap-2 rounded-full bg-emeraude-500 px-5 py-2.5 text-sm font-medium text-white shadow-soft-lg">
            <HeartPulse size={16} />
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, unit, color,
}: {
  icon: typeof HeartPulse; label: string; value: string; unit: string; color: string;
}) {
  return (
    <div className="card flex items-center gap-4 p-5 transition-all hover:-translate-y-0.5 hover:shadow-soft-lg">
      <div className="grid h-12 w-12 place-items-center rounded-2xl" style={{ backgroundColor: `${color}1a`, color }}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-xs text-neutral">{label}</p>
        <p className="tnum text-2xl font-bold text-aubergine-700 dark:text-sable-100">
          {value} {unit && <span className="text-sm font-medium text-neutral">{unit}</span>}
        </p>
      </div>
    </div>
  );
}
