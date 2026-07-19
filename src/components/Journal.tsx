import { useEffect, useState } from 'react';
import { BookOpen, Plus, X, Loader2, Trash2, Lock, Smile } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/I18nContext';

interface JournalEntry {
  id: string;
  entry_date: string;
  mood: number | null;
  stress: number | null;
  title: string | null;
  content: string | null;
}

const MOOD_COLORS = ['#A8461E', '#D69A2D', '#8A7E74', '#12A76B', '#F0509C'];

function fmtDate(iso: string, lang: 'fr' | 'en') {
  return new Date(iso + 'T00:00:00').toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function Journal() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<number | null>(null);
  const [stress, setStress] = useState<number | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('journal_entries').select('*').order('entry_date', { ascending: false });
    setLoading(false);
    setEntries((data as JournalEntry[]) ?? []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const flashToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const save = async () => {
    setBusy(true); setError(null);
    const { error: err } = await supabase.from('journal_entries').insert({
      title: title.trim() || null, content: content.trim() || null,
      mood, stress,
    });
    setBusy(false);
    if (err) { setError(t('journal.error')); return; }
    setShowForm(false); setTitle(''); setContent(''); setMood(null); setStress(null);
    flashToast(t('journal.saved')); load();
  };

  const remove = async (id: string) => {
    if (!window.confirm(t('journal.confirmDelete'))) return;
    await supabase.from('journal_entries').delete().eq('id', id);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-aubergine-700 dark:text-sable-100">{t('journal.title')}</h1>
          <p className="mt-1 flex items-center gap-1 text-sm text-neutral"><Lock size={12} /> {t('journal.subtitle')}</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary px-4 py-2.5 text-sm">
          <Plus size={16} /> {t('journal.add')}
        </button>
      </div>

      {error && <div className="rounded-xl bg-terre-50 px-4 py-3 text-sm text-terre-600 dark:bg-terre-500/15 dark:text-terre-200">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-neutral"><Loader2 size={16} className="animate-spin" /> {t('journal.loading')}</div>
      ) : entries.length === 0 ? (
        <div className="card flex flex-col items-center gap-4 p-10 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-rose-100 text-rose-500 dark:bg-rose-500/20 dark:text-rose-200"><BookOpen size={26} /></div>
          <p className="max-w-xs text-sm text-neutral">{t('journal.empty')}</p>
          <button onClick={() => setShowForm(true)} className="btn-primary px-4 py-2.5 text-sm"><Plus size={16} /> {t('journal.emptyCta')}</button>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((e) => (
            <div key={e.id} className="card p-5">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-aubergine-700 dark:text-sable-100">{e.title ?? fmtDate(e.entry_date, lang)}</span>
                    {e.mood !== null && (
                      <span className="grid h-6 w-6 place-items-center rounded-full" style={{ backgroundColor: MOOD_COLORS[e.mood] + '22' }}>
                        <Smile size={12} style={{ color: MOOD_COLORS[e.mood] }} />
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-neutral">{fmtDate(e.entry_date, lang)}</span>
                  {e.content && <p className="mt-2 whitespace-pre-wrap text-sm text-aubergine-700/80 dark:text-sable-100/80">{e.content}</p>}
                  {e.stress !== null && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-[11px] text-neutral">{t('journal.stress')}</span>
                      <div className="flex gap-1">
                        {[0, 1, 2, 3].map((s) => (
                          <span key={s} className="h-1.5 w-4 rounded-full" style={{ backgroundColor: s <= e.stress! ? '#A8461E' : '#E5E7EB' }} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button onClick={() => remove(e.id)} className="grid h-7 w-7 place-items-center rounded-full text-neutral hover:bg-terre-50 hover:text-terre-500 dark:hover:bg-terre-500/10"><Trash2 size={13} /></button>
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
              <h3 className="text-lg font-bold text-aubergine-700 dark:text-sable-100">{t('journal.add')}</h3>
              <button onClick={() => setShowForm(false)} className="grid h-8 w-8 place-items-center rounded-full text-neutral hover:bg-aubergine-50 dark:hover:bg-white/5"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-aubergine-700 dark:text-sable-100">{t('journal.title_field')}</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-aubergine-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-aubergine-700 dark:text-sable-100">{t('journal.mood')}</label>
                <div className="flex gap-2">
                  {[0, 1, 2, 3, 4].map((m) => (
                    <button key={m} onClick={() => setMood(mood === m ? null : m)} className={`grid h-10 flex-1 place-items-center rounded-xl border-2 transition-all ${mood === m ? 'border-transparent' : 'border-aubergine-100 dark:border-white/10'}`} style={mood === m ? { backgroundColor: MOOD_COLORS[m] + '22', borderColor: MOOD_COLORS[m] } : {}}>
                      <Smile size={18} style={{ color: mood === m ? MOOD_COLORS[m] : '#8A7E74' }} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-aubergine-700 dark:text-sable-100">{t('journal.stress')}</label>
                <div className="flex gap-2">
                  {[0, 1, 2, 3].map((s) => (
                    <button key={s} onClick={() => setStress(stress === s ? null : s)} className={`h-10 flex-1 rounded-xl border-2 transition-all ${stress === s ? 'border-transparent' : 'border-aubergine-100 dark:border-white/10'}`} style={stress === s ? { backgroundColor: '#A8461E' } : {}} />
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-aubergine-700 dark:text-sable-100">{t('journal.content')}</label>
                <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} placeholder={t('journal.contentPlaceholder')} className="w-full resize-none rounded-xl border border-aubergine-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100" />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowForm(false)} className="btn-outline flex-1 py-2.5 text-sm">{t('journal.cancel')}</button>
                <button onClick={save} disabled={busy || (!content.trim() && !title.trim())} className="btn-primary flex-1 py-2.5 text-sm">
                  {busy ? <Loader2 size={16} className="animate-spin" /> : null} {t('journal.save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-fade-up">
          <div className="flex items-center gap-2 rounded-full bg-emeraude-500 px-5 py-2.5 text-sm font-medium text-white shadow-soft-lg"><BookOpen size={16} /> {toast}</div>
        </div>
      )}
    </div>
  );
}
