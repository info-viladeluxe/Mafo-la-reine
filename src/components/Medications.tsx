import { useEffect, useState } from 'react';
import { Pill, Plus, X, Loader2, Trash2, Clock, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { todayISOLocal } from '../lib/dateUtils';

interface Med {
  id: string;
  name: string;
  type: string | null;
  dosage: string | null;
  frequency: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  notes: string | null;
}

const TYPE_COLORS: Record<string, string> = {
  pill: 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-200',
  vitamin: 'bg-emeraude-50 text-emeraude-600 dark:bg-emeraude-700/20 dark:text-emeraude-200',
  supplement: 'bg-ocre-50 text-ocre-600 dark:bg-ocre-400/15 dark:text-ocre-200',
  antibiotic: 'bg-terre-50 text-terre-600 dark:bg-terre-500/15 dark:text-terre-200',
  other: 'bg-aubergine-50 text-aubergine-600 dark:bg-white/5 dark:text-sable-100/80',
};

function fmtDate(iso: string, lang: 'fr' | 'en') {
  return new Date(iso + 'T00:00:00').toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function Medications() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [meds, setMeds] = useState<Med[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState('pill');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('daily');
  const [startDate, setStartDate] = useState(todayISOLocal());
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('medications').select('*').order('is_active', { ascending: false });
    setLoading(false);
    setMeds((data as Med[]) ?? []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const flashToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const save = async () => {
    setBusy(true); setError(null);
    const { error: err } = await supabase.from('medications').insert({
      name: name.trim(), type, dosage: dosage.trim() || null, frequency,
      start_date: startDate || null, end_date: endDate || null, notes: notes.trim() || null,
    });
    setBusy(false);
    if (err) { setError(t('med.error')); return; }
    setShowForm(false); setName(''); setDosage(''); setEndDate(''); setNotes('');
    flashToast(t('med.saved')); load();
  };

  const toggleActive = async (m: Med) => {
    await supabase.from('medications').update({ is_active: !m.is_active }).eq('id', m.id);
    load();
  };

  const remove = async (id: string) => {
    if (!window.confirm(t('med.confirmDelete'))) return;
    await supabase.from('medications').delete().eq('id', id);
    load();
  };

  const types = ['pill', 'vitamin', 'supplement', 'antibiotic', 'other'];
  const freqs = ['daily', 'weekly', 'asNeeded'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-aubergine-700 dark:text-sable-100">{t('med.title')}</h1>
          <p className="mt-1 text-sm text-neutral">{t('med.subtitle')}</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary px-4 py-2.5 text-sm"><Plus size={16} /> {t('med.add')}</button>
      </div>

      {error && <div className="rounded-xl bg-terre-50 px-4 py-3 text-sm text-terre-600 dark:bg-terre-500/15 dark:text-terre-200">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-neutral"><Loader2 size={16} className="animate-spin" /> {t('med.loading')}</div>
      ) : meds.length === 0 ? (
        <div className="card flex flex-col items-center gap-4 p-10 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-rose-100 text-rose-500 dark:bg-rose-500/20 dark:text-rose-200"><Pill size={26} /></div>
          <p className="max-w-xs text-sm text-neutral">{t('med.empty')}</p>
          <button onClick={() => setShowForm(true)} className="btn-primary px-4 py-2.5 text-sm"><Plus size={16} /> {t('med.emptyCta')}</button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {meds.map((m) => (
            <div key={m.id} className={`card p-4 transition-opacity ${m.is_active ? '' : 'opacity-60'}`}>
              <div className="flex items-start gap-3">
                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${TYPE_COLORS[m.type ?? 'other']}`}>
                  <Pill size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-aubergine-700 dark:text-sable-100">{m.name}</span>
                    <button onClick={() => toggleActive(m)} className={`chip px-2 py-0.5 text-[10px] ${m.is_active ? 'bg-emeraude-50 text-emeraude-600 dark:bg-emeraude-700/20 dark:text-emeraude-200' : 'bg-neutral-100 text-neutral dark:bg-white/5'}`}>
                      {m.is_active ? t('med.active') : t('med.inactive')}
                    </button>
                  </div>
                  <span className="text-[11px] font-medium text-neutral">{t(`med.type.${m.type ?? 'other'}` as never)}</span>
                  {m.dosage && <p className="mt-1 text-xs text-neutral">{m.dosage}</p>}
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-neutral">
                    {m.frequency && <span className="flex items-center gap-1"><Clock size={10} /> {t(`med.freq.${m.frequency}` as never)}</span>}
                    {m.start_date && <span className="flex items-center gap-1"><Calendar size={10} /> {fmtDate(m.start_date, lang)}</span>}
                  </div>
                  {m.notes && <p className="mt-1.5 text-xs text-neutral">{m.notes}</p>}
                </div>
                <button onClick={() => remove(m.id)} className="btn-icon btn-icon-sm btn-icon-danger"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-aubergine-900/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative m-0 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-sable-50 p-6 shadow-soft-lg sm:m-4 sm:rounded-3xl dark:bg-indigo-300">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-aubergine-700 dark:text-sable-100">{t('med.add')}</h3>
              <button onClick={() => setShowForm(false)} className="btn-icon btn-icon-md"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-aubergine-700 dark:text-sable-100">{t('med.name')}</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-aubergine-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-aubergine-700 dark:text-sable-100">{t('med.type')}</label>
                <div className="grid grid-cols-3 gap-2">
                  {types.map((ty) => (
                    <button key={ty} onClick={() => setType(ty)} className={`rounded-xl border-2 py-2 text-xs font-medium transition-all ${type === ty ? 'border-rose-500 bg-rose-50 text-rose-600 dark:border-rose-400 dark:bg-rose-500/15 dark:text-rose-200' : 'border-aubergine-100 bg-white text-aubergine-600 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100/80'}`}>{t(`med.type.${ty}` as never)}</button>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-aubergine-700 dark:text-sable-100">{t('med.dosage')}</label>
                  <input type="text" value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="1 cp / matin" className="w-full rounded-xl border border-aubergine-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-aubergine-700 dark:text-sable-100">{t('med.frequency')}</label>
                  <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className="w-full rounded-xl border border-aubergine-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100">
                    {freqs.map((f) => <option key={f} value={f}>{t(`med.freq.${f}` as never)}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-aubergine-700 dark:text-sable-100">{t('med.startDate')}</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded-xl border border-aubergine-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-aubergine-700 dark:text-sable-100">{t('med.endDate')}</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full rounded-xl border border-aubergine-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-aubergine-700 dark:text-sable-100">{t('med.notes')}</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full resize-none rounded-xl border border-aubergine-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100" />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowForm(false)} className="btn-outline flex-1 py-2.5 text-sm">{t('med.cancel')}</button>
                <button onClick={save} disabled={busy || !name.trim()} className="btn-primary flex-1 py-2.5 text-sm">{busy ? <Loader2 size={16} className="animate-spin" /> : null} {t('med.save')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-fade-up">
          <div className="flex items-center gap-2 rounded-full bg-emeraude-500 px-5 py-2.5 text-sm font-medium text-white shadow-soft-lg"><Pill size={16} /> {toast}</div>
        </div>
      )}
    </div>
  );
}
