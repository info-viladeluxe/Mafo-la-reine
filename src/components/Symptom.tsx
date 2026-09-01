import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, X, Loader2, Activity, Moon, Scale, Thermometer, Smile, Flame, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { formatISODateLocal, parseISODateLocal, todayISOLocal } from '../lib/dateUtils';

interface SymptomEntry {
  id: string;
  log_date: string;
  fatigue: number | null;
  stress: number | null;
  acne: number | null;
  migraine: number | null;
  cramps: number | null;
  nausea: number | null;
  libido: number | null;
  digestion: number | null;
  mood: number | null;
  sleep_hours: number | null;
  weight_kg: number | null;
  temperature_c: number | null;
  notes: string | null;
}

type SymptomKey = 'fatigue' | 'stress' | 'acne' | 'migraine' | 'cramps' | 'nausea' | 'libido' | 'digestion';

const SYMPTOMS: SymptomKey[] = ['fatigue', 'stress', 'acne', 'migraine', 'cramps', 'nausea', 'libido', 'digestion'];

const MOOD_COLORS = ['#A8461E', '#D69A2D', '#8A7E74', '#12A76B', '#F0509C'];
const SEVERITY_COLORS = ['#E5E7EB', '#FBCFE8', '#F472B6', '#F0509C'];

function fmtDate(iso: string, lang: 'fr' | 'en') {
  return new Date(iso + 'T00:00:00').toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function relativeDay(iso: string, lang: 'fr' | 'en', t: (k: never) => string) {
  const d = new Date(iso + 'T00:00:00');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return t('sym.today' as never);
  if (lang === 'fr') return diff === 1 ? 'Hier' : `Il y a ${diff} jours`;
  return diff === 1 ? 'Yesterday' : `${diff} days ago`;
}

export function Symptom() {
  const { t, lang } = useI18n();
  const { user } = useAuth();

  const [entries, setEntries] = useState<SymptomEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // form
  const [date, setDate] = useState(todayISOLocal());
  const [severities, setSeverities] = useState<Record<SymptomKey, number | null>>({
    fatigue: null, stress: null, acne: null, migraine: null,
    cramps: null, nausea: null, libido: null, digestion: null,
  });
  const [mood, setMood] = useState<number | null>(null);
  const [sleep, setSleep] = useState('');
  const [weight, setWeight] = useState('');
  const [temp, setTemp] = useState('');
  const [notes, setNotes] = useState('');

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('symptom_entries')
      .select('*')
      .order('log_date', { ascending: false });
    setLoading(false);
    if (error) { setError(t('sym.error')); return; }
    setEntries((data as SymptomEntry[]) ?? []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const flashToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const resetForm = () => {
    setSeverities({ fatigue: null, stress: null, acne: null, migraine: null, cramps: null, nausea: null, libido: null, digestion: null });
    setMood(null); setSleep(''); setWeight(''); setTemp(''); setNotes('');
    setDate(todayISOLocal());
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    const payload = {
      log_date: date,
      fatigue: severities.fatigue,
      stress: severities.stress,
      acne: severities.acne,
      migraine: severities.migraine,
      cramps: severities.cramps,
      nausea: severities.nausea,
      libido: severities.libido,
      digestion: severities.digestion,
      mood,
      sleep_hours: sleep ? parseFloat(sleep) : null,
      weight_kg: weight ? parseFloat(weight) : null,
      temperature_c: temp ? parseFloat(temp) : null,
      notes: notes.trim() || null,
    };

    // Upsert: if entry exists for this date, update; else insert.
    const { data: existing } = await supabase
      .from('symptom_entries')
      .select('id')
      .eq('log_date', date)
      .maybeSingle();

    let result;
    if (existing) {
      result = await supabase.from('symptom_entries').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', existing.id).select('*').maybeSingle();
    } else {
      result = await supabase.from('symptom_entries').insert(payload).select('*').maybeSingle();
    }

    setBusy(false);
    if (result.error) { setError(t('sym.saveError')); return; }
    setShowForm(false);
    resetForm();
    flashToast(t('sym.saved'));
    load();
  };

  const remove = async (id: string) => {
    if (!window.confirm(t('sym.confirmDelete'))) return;
    const { error: err } = await supabase.from('symptom_entries').delete().eq('id', id);
    if (err) { setError(t('sym.deleteError')); return; }
    load();
  };

  // Streak: consecutive days with entries ending today or yesterday.
  const streak = useMemo(() => {
    if (entries.length === 0) return 0;
    const dates = new Set(entries.map((e) => e.log_date));
    let count = 0;
    const cursor = new Date(); cursor.setHours(0, 0, 0, 0);
    // Allow streak to start from today or yesterday.
    if (!dates.has(formatISODateLocal(cursor))) {
      cursor.setDate(cursor.getDate() - 1);
      if (!dates.has(formatISODateLocal(cursor))) return 0;
    }
    while (dates.has(formatISODateLocal(cursor))) {
      count++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }, [entries]);

  // 30-day trend data: average severity per symptom.
  const trendData = useMemo(() => {
    const last30 = entries.filter((e) => {
      const d = parseISODateLocal(e.log_date);
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
      return d >= cutoff;
    });
    if (last30.length === 0) return null;
    const avg: Record<SymptomKey, number> = {} as Record<SymptomKey, number>;
    for (const s of SYMPTOMS) {
      const vals = last30.map((e) => e[s]).filter((v): v is number => v !== null);
      avg[s] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    }
    return { avg, count: last30.length };
  }, [entries]);

  // Week summary: last 7 entries.
  const weekEntries = entries.slice(0, 7);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-aubergine-700 dark:text-sable-100">
            {t('sym.title')}
          </h1>
          <p className="mt-1 text-sm text-neutral">{t('sym.subtitle')}</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary btn-md">
          <Plus size={16} /> {t('sym.log')}
        </button>
      </div>

      {error && (
        <div className="animate-fade-in rounded-xl bg-terre-50 px-4 py-3 text-sm text-terre-600 dark:bg-terre-500/15 dark:text-terre-200">
          {error}
        </div>
      )}

      {/* Stats: streak + week avg */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card flex items-center gap-4 p-5">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-200">
            <Flame size={22} />
          </div>
          <div>
            <p className="text-xs text-neutral">{t('sym.streak')}</p>
            <p className="tnum text-2xl font-bold text-aubergine-700 dark:text-sable-100">{streak}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 p-5">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emeraude-50 text-emeraude-600 dark:bg-emeraude-700/20 dark:text-emeraude-200">
            <Activity size={22} />
          </div>
          <div>
            <p className="text-xs text-neutral">{t('sym.history')}</p>
            <p className="tnum text-2xl font-bold text-aubergine-700 dark:text-sable-100">{entries.length}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 p-5">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-ocre-50 text-ocre-600 dark:bg-ocre-400/15 dark:text-ocre-200">
            <Smile size={22} />
          </div>
          <div>
            <p className="text-xs text-neutral">{t('sym.mood')}</p>
            <p className="text-2xl font-bold text-aubergine-700 dark:text-sable-100">
              {weekEntries.filter((e) => e.mood !== null).length > 0
                ? (weekEntries.filter((e) => e.mood !== null).reduce((s, e) => s + (e.mood ?? 0), 0) / weekEntries.filter((e) => e.mood !== null).length).toFixed(1)
                : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Trend chart */}
      <div className="card p-6">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-aubergine-700 dark:text-sable-100">
          <TrendingUp size={16} className="text-rose-500" />
          {t('sym.trend')}
        </div>
        {trendData ? (
          <div className="space-y-3">
            {SYMPTOMS.map((s) => {
              const val = trendData.avg[s];
              const pct = (val / 3) * 100;
              return (
                <div key={s} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-xs font-medium text-aubergine-700 dark:text-sable-100/80">
                    {t(`sym.symptom.${s}` as never)}
                  </span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-aubergine-100 dark:bg-white/5">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: SEVERITY_COLORS[Math.round(val)] || '#F0509C' }}
                    />
                  </div>
                  <span className="tnum w-10 text-right text-xs font-semibold text-neutral">
                    {val > 0 ? val.toFixed(1) : '—'}
                  </span>
                </div>
              );
            })}
            <p className="pt-2 text-xs text-neutral">
              {trendData.count} {t('sym.history').toLowerCase()}
            </p>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-neutral">{t('sym.noData')}</p>
        )}
      </div>

      {/* History */}
      <div className="card p-6">
        <h2 className="mb-4 text-sm font-semibold text-aubergine-700 dark:text-sable-100">
          {t('sym.history')}
        </h2>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-neutral">
            <Loader2 size={16} className="animate-spin" /> {t('sym.loading')}
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-rose-100 text-rose-500 dark:bg-rose-500/20 dark:text-rose-200">
              <Activity size={26} />
            </div>
            <p className="max-w-xs text-sm text-neutral">{t('sym.empty')}</p>
            <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary btn-md">
              <Plus size={16} /> {t('sym.emptyCta')}
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-aubergine-100 dark:divide-white/5">
            {entries.map((e) => {
              const activeSyms = SYMPTOMS.filter((s) => e[s] !== null && e[s]! > 0);
              const hasAny = activeSyms.length > 0 || e.mood !== null || e.sleep_hours || e.weight_kg || e.temperature_c;
              return (
                <li key={e.id} className="py-4">
                  <div className="flex items-start gap-4">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-200">
                      <Activity size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-aubergine-700 dark:text-sable-100">
                          {fmtDate(e.log_date, lang)}
                        </span>
                        <span className="text-xs text-neutral">{relativeDay(e.log_date, lang, t)}</span>
                      </div>

                      {hasAny ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {activeSyms.map((s) => (
                            <span
                              key={s}
                              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                              style={{ backgroundColor: SEVERITY_COLORS[e[s] ?? 0] + '22', color: SEVERITY_COLORS[e[s] ?? 0] === '#E5E7EB' ? '#8A7E74' : SEVERITY_COLORS[e[s] ?? 0] }}
                            >
                              {t(`sym.symptom.${s}` as never)} · {t(`sym.level.${e[s]}` as never)}
                            </span>
                          ))}
                          {e.mood !== null && (
                            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium" style={{ backgroundColor: MOOD_COLORS[e.mood] + '22', color: MOOD_COLORS[e.mood] }}>
                              <Smile size={10} /> {t(`sym.mood.${e.mood}` as never)}
                            </span>
                          )}
                          {e.sleep_hours !== null && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-medium text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-200">
                              <Moon size={10} /> {e.sleep_hours}h
                            </span>
                          )}
                          {e.weight_kg !== null && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emeraude-50 px-2.5 py-0.5 text-[11px] font-medium text-emeraude-600 dark:bg-emeraude-700/20 dark:text-emeraude-200">
                              <Scale size={10} /> {e.weight_kg} kg
                            </span>
                          )}
                          {e.temperature_c !== null && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-ocre-50 px-2.5 py-0.5 text-[11px] font-medium text-ocre-600 dark:bg-ocre-400/15 dark:text-ocre-200">
                              <Thermometer size={10} /> {e.temperature_c} °C
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="mt-1 text-xs text-neutral">{t('sym.noSymptomsDesc')}</p>
                      )}

                      {e.notes && <p className="mt-2 text-xs text-neutral">{e.notes}</p>}
                    </div>
                    <button
                      onClick={() => remove(e.id)}
                      aria-label={t('sym.delete')}
                      className="btn-icon btn-icon-sm btn-icon-danger"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
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
          <div className="relative m-0 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-sable-50 p-6 shadow-soft-lg sm:m-4 sm:rounded-3xl dark:bg-indigo-300">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-aubergine-700 dark:text-sable-100">{t('sym.log')}</h3>
              <button onClick={() => setShowForm(false)} aria-label={t('sym.cancel')} className="btn-icon btn-icon-md">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5">
              {/* Date */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-aubergine-700 dark:text-sable-100">{t('sym.date')}</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  max={todayISOLocal()}
                  className="w-full rounded-xl border border-aubergine-200 bg-white px-4 py-2.5 text-sm text-aubergine-900 outline-none transition-all focus:border-rose-400 focus:ring-2 focus:ring-rose-200 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100"
                />
              </div>

              {/* Symptoms grid */}
              <div>
                <label className="mb-2 block text-sm font-medium text-aubergine-700 dark:text-sable-100">{t('sym.severity')}</label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {SYMPTOMS.map((s) => (
                    <div key={s}>
                      <p className="mb-1.5 text-xs font-medium text-aubergine-700 dark:text-sable-100/80">{t(`sym.symptom.${s}` as never)}</p>
                      <div className="flex gap-1.5">
                        {[0, 1, 2, 3].map((lvl) => (
                          <button
                            key={lvl}
                            onClick={() => setSeverities((prev) => ({ ...prev, [s]: prev[s] === lvl ? null : lvl }))}
                            className={`h-8 flex-1 rounded-lg border-2 transition-all ${
                              severities[s] === lvl
                                ? 'border-transparent'
                                : 'border-aubergine-100 hover:border-aubergine-200 dark:border-white/10 dark:hover:border-white/20'
                            }`}
                            style={severities[s] === lvl ? { backgroundColor: SEVERITY_COLORS[lvl] } : {}}
                            aria-label={t(`sym.level.${lvl}` as never)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mood */}
              <div>
                <label className="mb-2 block text-sm font-medium text-aubergine-700 dark:text-sable-100">{t('sym.mood')}</label>
                <div className="flex gap-2">
                  {[0, 1, 2, 3, 4].map((m) => (
                    <button
                      key={m}
                      onClick={() => setMood(mood === m ? null : m)}
                      className={`grid h-10 flex-1 place-items-center rounded-xl border-2 transition-all ${
                        mood === m ? 'border-transparent' : 'border-aubergine-100 hover:border-aubergine-200 dark:border-white/10 dark:hover:border-white/20'
                      }`}
                      style={mood === m ? { backgroundColor: MOOD_COLORS[m] + '22', borderColor: MOOD_COLORS[m] } : {}}
                      aria-label={t(`sym.mood.${m}` as never)}
                    >
                      <Smile size={18} style={{ color: mood === m ? MOOD_COLORS[m] : '#8A7E74' }} />
                    </button>
                  ))}
                </div>
                {mood !== null && (
                  <p className="mt-1.5 text-xs font-medium" style={{ color: MOOD_COLORS[mood] }}>
                    {t(`sym.mood.${mood}` as never)}
                  </p>
                )}
              </div>

              {/* Metrics */}
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-aubergine-700 dark:text-sable-100">{t('sym.sleep')}</label>
                  <input
                    type="number" step="0.1" min="0" max="24"
                    value={sleep} onChange={(e) => setSleep(e.target.value)}
                    className="w-full rounded-xl border border-aubergine-200 bg-white px-3 py-2 text-sm text-aubergine-900 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100"
                    placeholder="7.5"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-aubergine-700 dark:text-sable-100">{t('sym.weight')}</label>
                  <input
                    type="number" step="0.1" min="0"
                    value={weight} onChange={(e) => setWeight(e.target.value)}
                    className="w-full rounded-xl border border-aubergine-200 bg-white px-3 py-2 text-sm text-aubergine-900 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100"
                    placeholder="62"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-aubergine-700 dark:text-sable-100">{t('sym.temperature')}</label>
                  <input
                    type="number" step="0.01" min="30" max="45"
                    value={temp} onChange={(e) => setTemp(e.target.value)}
                    className="w-full rounded-xl border border-aubergine-200 bg-white px-3 py-2 text-sm text-aubergine-900 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100"
                    placeholder="36.6"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-aubergine-700 dark:text-sable-100">{t('sym.notes')}</label>
                <textarea
                  value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('sym.notesPlaceholder')}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-aubergine-200 bg-white px-4 py-2.5 text-sm text-aubergine-900 outline-none transition-all placeholder:text-neutral/60 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100 dark:placeholder:text-sable-100/40"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowForm(false)} className="btn-outline flex-1 py-2.5 text-sm">
                  {t('sym.cancel')}
                </button>
                <button onClick={save} disabled={busy} className="btn-primary flex-1 py-2.5 text-sm">
                  {busy ? <Loader2 size={16} className="animate-spin" /> : null}
                  {t('sym.save')}
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
            <Activity size={16} />
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
