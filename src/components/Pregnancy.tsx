import { useEffect, useState } from 'react';
import { Baby, Plus, X, Loader2, Trash2, Calendar, Check, ShoppingBag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/I18nContext';

interface PregnancyEntry {
  id: string;
  is_active: boolean;
  lmp_date: string | null;
  due_date: string | null;
  current_week: number | null;
  current_weight_kg: number | null;
  notes: string | null;
  checklist: Record<string, boolean> | null;
}

const DEFAULT_CHECKLIST: string[] = [
  "Carte d'identité", 'Dossier médical', 'Vêtements pour bébé', 'Bodies x5',
  'Couches', 'Lingettes', 'Doudou', 'Biberons', 'Tétines', 'Vêtements confort maman',
];

function fmtDate(iso: string, lang: 'fr' | 'en') {
  return new Date(iso + 'T00:00:00').toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' });
}

const BABY_SIZES: Record<number, { fr: string; en: string; size: string; weight: string }> = {
  4: { fr: 'Graine de pavot', en: 'Poppy seed', size: '~0.4 cm', weight: '~0.4 g' },
  8: { fr: 'Grain de framboise', en: 'Raspberry', size: '~1.6 cm', weight: '~1 g' },
  12: { fr: 'Prune', en: 'Plum', size: '~5.4 cm', weight: '~14 g' },
  16: { fr: 'Avocat', en: 'Avocado', size: '~11.6 cm', weight: '~100 g' },
  20: { fr: 'Banane', en: 'Banana', size: '~25.6 cm', weight: '~300 g' },
  24: { fr: 'Maïs', en: 'Corn cob', size: '~30 cm', weight: '~600 g' },
  28: { fr: 'Aubergine', en: 'Eggplant', size: '~37.6 cm', weight: '~1 kg' },
  32: { fr: 'Citrouille', en: 'Pumpkin', size: '~42.4 cm', weight: '~1.7 kg' },
  36: { fr: 'Cantaloup', en: 'Cantaloupe', size: '~47 cm', weight: '~2.6 kg' },
  40: { fr: 'Pastèque', en: 'Watermelon', size: '~51 cm', weight: '~3.5 kg' },
};

function babyInfo(week: number, lang: 'fr' | 'en') {
  const keys = Object.keys(BABY_SIZES).map(Number).sort((a, b) => a - b);
  let closest = keys[0];
  for (const k of keys) { if (week >= k) closest = k; }
  const info = BABY_SIZES[closest];
  return { name: lang === 'fr' ? info.fr : info.en, size: info.size, weight: info.weight };
}

export function Pregnancy() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [entry, setEntry] = useState<PregnancyEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [lmp, setLmp] = useState('');
  const [weight, setWeight] = useState('');
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [newItem, setNewItem] = useState('');

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('pregnancy_entries').select('*').eq('is_active', true).maybeSingle();
    setLoading(false);
    if (data) {
      setEntry(data as PregnancyEntry);
      setChecklist((data as PregnancyEntry).checklist ?? {});
    } else {
      setEntry(null);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const flashToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const start = async () => {
    setBusy(true); setError(null);
    const dueDate = lmp ? new Date(new Date(lmp).getTime() + 280 * 86400000).toISOString().slice(0, 10) : null;
    const week = lmp ? Math.min(42, Math.floor((Date.now() - new Date(lmp).getTime()) / (7 * 86400000))) : 0;
    const initChecklist: Record<string, boolean> = {};
    DEFAULT_CHECKLIST.forEach((item) => { initChecklist[item] = false; });
    const { error: err } = await supabase.from('pregnancy_entries').insert({
      is_active: true, lmp_date: lmp || null, due_date: dueDate,
      current_week: week, current_weight_kg: weight ? parseFloat(weight) : null,
      checklist: initChecklist,
    }).select('*').maybeSingle();
    setBusy(false);
    if (err) { setError(t('preg.error')); return; }
    setShowForm(false); flashToast(t('preg.saved')); load();
  };

  const stop = async () => {
    if (!entry || !window.confirm(t('preg.confirmStop'))) return;
    await supabase.from('pregnancy_entries').update({ is_active: false }).eq('id', entry.id);
    setEntry(null); setChecklist({});
  };

  const toggleItem = async (item: string) => {
    if (!entry) return;
    const updated = { ...checklist, [item]: !checklist[item] };
    setChecklist(updated);
    await supabase.from('pregnancy_entries').update({ checklist: updated }).eq('id', entry.id);
  };

  const addItem = async () => {
    if (!entry || !newItem.trim()) return;
    const updated = { ...checklist, [newItem.trim()]: false };
    setChecklist(updated); setNewItem('');
    await supabase.from('pregnancy_entries').update({ checklist: updated }).eq('id', entry.id);
  };

  const removeItem = async (item: string) => {
    if (!entry) return;
    const updated = { ...checklist };
    delete updated[item];
    setChecklist(updated);
    await supabase.from('pregnancy_entries').update({ checklist: updated }).eq('id', entry.id);
  };

  if (loading) {
    return <div className="flex items-center justify-center gap-2 py-20 text-sm text-neutral"><Loader2 size={16} className="animate-spin" /> {t('preg.error')}</div>;
  }

  if (!entry) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-aubergine-700 dark:text-sable-100">{t('preg.title')}</h1>
          <p className="mt-1 text-sm text-neutral">{t('preg.subtitle')}</p>
        </div>
        <div className="card flex flex-col items-center gap-4 p-10 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-rose-100 text-rose-500 dark:bg-rose-500/20 dark:text-rose-200">
            <Baby size={30} />
          </div>
          <p className="max-w-xs text-sm text-neutral">{t('preg.noActive')}</p>
          <button onClick={() => setShowForm(true)} className="btn-primary px-4 py-2.5 text-sm">
            <Plus size={16} /> {t('preg.start')}
          </button>
        </div>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
            <div className="absolute inset-0 bg-aubergine-900/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
            <div className="relative m-0 w-full max-w-md rounded-t-3xl bg-sable-50 p-6 shadow-soft-lg sm:m-4 sm:rounded-3xl dark:bg-indigo-300">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-aubergine-700 dark:text-sable-100">{t('preg.start')}</h3>
                <button onClick={() => setShowForm(false)} className="grid h-8 w-8 place-items-center rounded-full text-neutral hover:bg-aubergine-50 dark:hover:bg-white/5"><X size={18} /></button>
              </div>
              <p className="mb-4 text-xs text-neutral">{t('preg.startDesc')}</p>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-aubergine-700 dark:text-sable-100">{t('preg.lmp')}</label>
                  <input type="date" value={lmp} onChange={(e) => setLmp(e.target.value)} className="w-full rounded-xl border border-aubergine-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-aubergine-700 dark:text-sable-100">{t('preg.weight')}</label>
                  <input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} className="w-full rounded-xl border border-aubergine-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100" placeholder="62" />
                </div>
                <button onClick={start} disabled={busy} className="btn-primary w-full py-2.5 text-sm">
                  {busy ? <Loader2 size={16} className="animate-spin" /> : null} {t('preg.save')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const week = entry.current_week ?? 0;
  const trimester = week <= 13 ? 1 : week <= 27 ? 2 : 3;
  const baby = babyInfo(week, lang);
  const daysRemaining = entry.due_date ? Math.max(0, Math.ceil((new Date(entry.due_date).getTime() - Date.now()) / 86400000)) : 0;
  const checkedCount = Object.values(checklist).filter(Boolean).length;
  const totalItems = Object.keys(checklist).length;
  const progress = totalItems > 0 ? (checkedCount / totalItems) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-aubergine-700 dark:text-sable-100">{t('preg.title')}</h1>
          <p className="mt-1 text-sm text-neutral">{t('preg.active')}</p>
        </div>
        <button onClick={stop} className="btn-outline px-4 py-2.5 text-sm text-terre-600 dark:text-terre-200">
          {t('preg.stop')}
        </button>
      </div>

      {error && <div className="rounded-xl bg-terre-50 px-4 py-3 text-sm text-terre-600 dark:bg-terre-500/15 dark:text-terre-200">{error}</div>}

      {/* Week progress */}
      <div className="card overflow-hidden p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-neutral">{t('preg.trimester', { n: trimester })}</p>
            <p className="mt-1 text-3xl font-bold text-rose-500">{t('preg.week', { n: week })}</p>
            {entry.due_date && <p className="mt-1 flex items-center gap-1 text-xs text-neutral"><Calendar size={12} /> {fmtDate(entry.due_date, lang)}</p>}
          </div>
          <div className="relative grid h-24 w-24 place-items-center">
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#E5E7EB" strokeWidth="8" className="dark:stroke-white/10" />
              <circle cx="50" cy="50" r="42" fill="none" stroke="#F0509C" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(week / 40) * 264} 264`} className="transition-all duration-700" />
            </svg>
            <span className="tnum text-sm font-bold text-rose-500">{Math.round((week / 40) * 100)}%</span>
          </div>
        </div>
        {daysRemaining > 0 && <p className="mt-3 text-xs text-neutral">{t('preg.remaining', { n: daysRemaining })}</p>}
      </div>

      {/* Baby development */}
      <div className="card p-6">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-aubergine-700 dark:text-sable-100">
          <Baby size={16} className="text-rose-500" /> {t('preg.development')}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl bg-rose-50 p-4 dark:bg-rose-500/10">
            <p className="text-xs text-neutral">{t('preg.babySize')}</p>
            <p className="mt-1 text-lg font-bold text-rose-500">{baby.name}</p>
            <p className="tnum mt-0.5 text-xs text-neutral">{baby.size}</p>
          </div>
          <div className="rounded-2xl bg-emeraude-50 p-4 dark:bg-emeraude-700/20">
            <p className="text-xs text-neutral">{t('preg.babyWeight')}</p>
            <p className="mt-1 text-lg font-bold text-emeraude-600 dark:text-emeraude-200">{baby.weight}</p>
          </div>
        </div>
        {entry.current_weight_kg && (
          <p className="mt-3 text-xs text-neutral">{t('preg.weight')}: <span className="tnum font-semibold text-aubergine-700 dark:text-sable-100">{entry.current_weight_kg} kg</span></p>
        )}
      </div>

      {/* Checklist */}
      <div className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-aubergine-700 dark:text-sable-100">
            <ShoppingBag size={16} className="text-rose-500" /> {t('preg.checklist')}
          </div>
          <span className="tnum text-xs text-neutral">{checkedCount}/{totalItems}</span>
        </div>
        <div className="mb-4 h-2 overflow-hidden rounded-full bg-aubergine-100 dark:bg-white/5">
          <div className="h-full rounded-full bg-rose-500 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <ul className="space-y-2">
          {Object.entries(checklist).map(([item, done]) => (
            <li key={item} className="flex items-center gap-3">
              <button
                onClick={() => toggleItem(item)}
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 transition-all ${
                  done ? 'border-emeraude-500 bg-emeraude-500 text-white' : 'border-aubergine-200 hover:border-rose-400 dark:border-white/20'
                }`}
              >
                {done && <Check size={14} />}
              </button>
              <span className={`flex-1 text-sm ${done ? 'text-neutral line-through' : 'text-aubergine-700 dark:text-sable-100'}`}>{item}</span>
              <button onClick={() => removeItem(item)} className="grid h-7 w-7 place-items-center rounded-full text-neutral hover:bg-terre-50 hover:text-terre-500 dark:hover:bg-terre-500/10">
                <Trash2 size={13} />
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex gap-2">
          <input
            type="text" value={newItem} onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addItem()}
            placeholder={t('preg.itemPlaceholder')}
            className="flex-1 rounded-xl border border-aubergine-200 bg-white px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100"
          />
          <button onClick={addItem} className="btn-primary px-3 py-2 text-sm"><Plus size={16} /></button>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-fade-up">
          <div className="flex items-center gap-2 rounded-full bg-emeraude-500 px-5 py-2.5 text-sm font-medium text-white shadow-soft-lg">
            <Baby size={16} /> {toast}
          </div>
        </div>
      )}
    </div>
  );
}
