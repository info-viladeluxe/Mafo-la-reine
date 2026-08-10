import { useEffect, useState } from 'react';
import { Stethoscope, Plus, X, Loader2, Trash2, Syringe, AlertCircle, HeartPulse, Pill, User, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/I18nContext';

interface HealthRecord {
  id: string;
  record_type: string;
  title: string;
  description: string | null;
  date_recorded: string | null;
  doctor_name: string | null;
  is_resolved: boolean;
}

const TYPE_ICONS: Record<string, typeof Syringe> = {
  vaccine: Syringe, allergy: AlertCircle, illness: HeartPulse,
  treatment: Pill, doctor: User, insurance: Shield,
};
const TYPE_COLORS: Record<string, string> = {
  vaccine: 'bg-emeraude-50 text-emeraude-600 dark:bg-emeraude-700/20 dark:text-emeraude-200',
  allergy: 'bg-terre-50 text-terre-600 dark:bg-terre-500/15 dark:text-terre-200',
  illness: 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-200',
  treatment: 'bg-ocre-50 text-ocre-600 dark:bg-ocre-400/15 dark:text-ocre-200',
  doctor: 'bg-aubergine-50 text-aubergine-600 dark:bg-white/5 dark:text-sable-100/80',
  insurance: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-200',
};

function fmtDate(iso: string, lang: 'fr' | 'en') {
  return new Date(iso + 'T00:00:00').toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function Health() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [type, setType] = useState('vaccine');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [doctor, setDoctor] = useState('');
  const [resolved, setResolved] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('health_records').select('*').order('date_recorded', { ascending: false, nullsFirst: false });
    setLoading(false);
    setRecords((data as HealthRecord[]) ?? []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const flashToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const save = async () => {
    setBusy(true); setError(null);
    const { error: err } = await supabase.from('health_records').insert({
      record_type: type, title: title.trim(), description: description.trim() || null,
      date_recorded: date || null, doctor_name: doctor.trim() || null, is_resolved: resolved,
    });
    setBusy(false);
    if (err) { setError(t('health.error')); return; }
    setShowForm(false); setTitle(''); setDescription(''); setDate(''); setDoctor(''); setResolved(false);
    flashToast(t('health.saved')); load();
  };

  const remove = async (id: string) => {
    if (!window.confirm(t('health.confirmDelete'))) return;
    await supabase.from('health_records').delete().eq('id', id);
    load();
  };

  const types = ['vaccine', 'allergy', 'illness', 'treatment', 'doctor', 'insurance'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-aubergine-700 dark:text-sable-100">{t('health.title')}</h1>
          <p className="mt-1 text-sm text-neutral">{t('health.subtitle')}</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary px-4 py-2.5 text-sm">
          <Plus size={16} /> {t('health.add')}
        </button>
      </div>

      {error && <div className="rounded-xl bg-terre-50 px-4 py-3 text-sm text-terre-600 dark:bg-terre-500/15 dark:text-terre-200">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-neutral"><Loader2 size={16} className="animate-spin" /> {t('health.loading')}</div>
      ) : records.length === 0 ? (
        <div className="card flex flex-col items-center gap-4 p-10 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-rose-100 text-rose-500 dark:bg-rose-500/20 dark:text-rose-200"><Stethoscope size={26} /></div>
          <p className="max-w-xs text-sm text-neutral">{t('health.empty')}</p>
          <button onClick={() => setShowForm(true)} className="btn-primary px-4 py-2.5 text-sm"><Plus size={16} /> {t('health.emptyCta')}</button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {records.map((r) => {
            const Icon = TYPE_ICONS[r.record_type] ?? Stethoscope;
            return (
              <div key={r.id} className="card p-4">
                <div className="flex items-start gap-3">
                  <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${TYPE_COLORS[r.record_type] ?? 'bg-aubergine-50 text-aubergine-600'}`}>
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-aubergine-700 dark:text-sable-100">{r.title}</span>
                      {r.is_resolved && <span className="chip bg-emeraude-50 px-2 py-0.5 text-[10px] text-emeraude-600 dark:bg-emeraude-700/20 dark:text-emeraude-200">{t('health.resolved')}</span>}
                    </div>
                    <span className="text-[11px] font-medium text-neutral">{t(`health.type.${r.record_type}` as never)}</span>
                    {r.description && <p className="mt-1 text-xs text-neutral">{r.description}</p>}
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-neutral">
                      {r.date_recorded && <span>{fmtDate(r.date_recorded, lang)}</span>}
                      {r.doctor_name && <span>· {r.doctor_name}</span>}
                    </div>
                  </div>
                  <button onClick={() => remove(r.id)} className="btn-icon btn-icon-sm btn-icon-danger"><Trash2 size={13} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-aubergine-900/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative m-0 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-sable-50 p-6 shadow-soft-lg sm:m-4 sm:rounded-3xl dark:bg-indigo-300">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-aubergine-700 dark:text-sable-100">{t('health.add')}</h3>
              <button onClick={() => setShowForm(false)} className="btn-icon btn-icon-md"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-aubergine-700 dark:text-sable-100">{t('health.type')}</label>
                <div className="grid grid-cols-3 gap-2">
                  {types.map((ty) => (
                    <button key={ty} onClick={() => setType(ty)} className={`rounded-xl border-2 py-2 text-xs font-medium transition-all ${type === ty ? 'border-rose-500 bg-rose-50 text-rose-600 dark:border-rose-400 dark:bg-rose-500/15 dark:text-rose-200' : 'border-aubergine-100 bg-white text-aubergine-600 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100/80'}`}>
                      {t(`health.type.${ty}` as never)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-aubergine-700 dark:text-sable-100">{t('health.title_field')}</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-aubergine-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-aubergine-700 dark:text-sable-100">{t('health.description')}</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full resize-none rounded-xl border border-aubergine-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-aubergine-700 dark:text-sable-100">{t('health.date')}</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl border border-aubergine-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-aubergine-700 dark:text-sable-100">{t('health.doctor')}</label>
                  <input type="text" value={doctor} onChange={(e) => setDoctor(e.target.value)} className="w-full rounded-xl border border-aubergine-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-aubergine-700 dark:text-sable-100">
                <input type="checkbox" checked={resolved} onChange={(e) => setResolved(e.target.checked)} className="h-4 w-4 rounded border-aubergine-200 text-rose-500 focus:ring-rose-400" />
                {t('health.resolved')}
              </label>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowForm(false)} className="btn-outline flex-1 py-2.5 text-sm">{t('health.cancel')}</button>
                <button onClick={save} disabled={busy || !title.trim()} className="btn-primary flex-1 py-2.5 text-sm">
                  {busy ? <Loader2 size={16} className="animate-spin" /> : null} {t('health.save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-fade-up">
          <div className="flex items-center gap-2 rounded-full bg-emeraude-500 px-5 py-2.5 text-sm font-medium text-white shadow-soft-lg"><Stethoscope size={16} /> {toast}</div>
        </div>
      )}
    </div>
  );
}
