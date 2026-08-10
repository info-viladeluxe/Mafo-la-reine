import { useEffect, useState } from 'react';
import { FolderLock, Plus, X, Loader2, Trash2, FileText, TestTube, Image, Receipt, Syringe, File } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/I18nContext';

interface DocRecord {
  id: string;
  title: string;
  category: string | null;
  notes: string | null;
  created_at: string;
}

const CAT_ICONS: Record<string, typeof FileText> = {
  prescription: FileText, lab: TestTube, imaging: Image, invoice: Receipt, vaccine: Syringe, other: File,
};
const CAT_COLORS: Record<string, string> = {
  prescription: 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-200',
  lab: 'bg-emeraude-50 text-emeraude-600 dark:bg-emeraude-700/20 dark:text-emeraude-200',
  imaging: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-200',
  invoice: 'bg-ocre-50 text-ocre-600 dark:bg-ocre-400/15 dark:text-ocre-200',
  vaccine: 'bg-aubergine-50 text-aubergine-600 dark:bg-white/5 dark:text-sable-100/80',
  other: 'bg-neutral-100 text-neutral dark:bg-white/5 dark:text-sable-100/60',
};

function fmtDate(iso: string, lang: 'fr' | 'en') {
  return new Date(iso).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function Documents() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [docs, setDocs] = useState<DocRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('prescription');
  const [notes, setNotes] = useState('');

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
    setLoading(false);
    setDocs((data as DocRecord[]) ?? []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const flashToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const save = async () => {
    setBusy(true); setError(null);
    const { error: err } = await supabase.from('documents').insert({
      title: title.trim(), category, notes: notes.trim() || null,
    });
    setBusy(false);
    if (err) { setError(t('docs.error')); return; }
    setShowForm(false); setTitle(''); setNotes('');
    flashToast(t('docs.saved')); load();
  };

  const remove = async (id: string) => {
    if (!window.confirm(t('docs.confirmDelete'))) return;
    await supabase.from('documents').delete().eq('id', id);
    load();
  };

  const cats = ['prescription', 'lab', 'imaging', 'invoice', 'vaccine', 'other'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-aubergine-700 dark:text-sable-100">{t('docs.title')}</h1>
          <p className="mt-1 text-sm text-neutral">{t('docs.subtitle')}</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary px-4 py-2.5 text-sm">
          <Plus size={16} /> {t('docs.add')}
        </button>
      </div>

      <div className="flex items-start gap-2 rounded-xl bg-ocre-50 p-3 text-xs text-ocre-700 dark:bg-ocre-400/10 dark:text-ocre-200">
        <File size={14} className="mt-0.5 shrink-0" />
        <span>{t('docs.uploadSoon')}</span>
      </div>

      {error && <div className="rounded-xl bg-terre-50 px-4 py-3 text-sm text-terre-600 dark:bg-terre-500/15 dark:text-terre-200">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-neutral"><Loader2 size={16} className="animate-spin" /> {t('docs.loading')}</div>
      ) : docs.length === 0 ? (
        <div className="card flex flex-col items-center gap-4 p-10 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-rose-100 text-rose-500 dark:bg-rose-500/20 dark:text-rose-200"><FolderLock size={26} /></div>
          <p className="max-w-xs text-sm text-neutral">{t('docs.empty')}</p>
          <button onClick={() => setShowForm(true)} className="btn-primary px-4 py-2.5 text-sm"><Plus size={16} /> {t('docs.emptyCta')}</button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {docs.map((d) => {
            const Icon = CAT_ICONS[d.category ?? 'other'] ?? File;
            return (
              <div key={d.id} className="card p-4">
                <div className="flex items-start gap-3">
                  <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${CAT_COLORS[d.category ?? 'other']}`}>
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-semibold text-aubergine-700 dark:text-sable-100">{d.title}</span>
                    <span className="block text-[11px] font-medium text-neutral">{t(`docs.cat.${d.category ?? 'other'}` as never)}</span>
                    {d.notes && <p className="mt-1 text-xs text-neutral">{d.notes}</p>}
                    <span className="mt-2 block text-[11px] text-neutral">{fmtDate(d.created_at, lang)}</span>
                  </div>
                  <button onClick={() => remove(d.id)} className="btn-icon btn-icon-sm btn-icon-danger"><Trash2 size={13} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-aubergine-900/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative m-0 w-full max-w-md rounded-t-3xl bg-sable-50 p-6 shadow-soft-lg sm:m-4 sm:rounded-3xl dark:bg-indigo-300">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-aubergine-700 dark:text-sable-100">{t('docs.add')}</h3>
              <button onClick={() => setShowForm(false)} className="btn-icon btn-icon-md"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-aubergine-700 dark:text-sable-100">{t('docs.category')}</label>
                <div className="grid grid-cols-3 gap-2">
                  {cats.map((c) => (
                    <button key={c} onClick={() => setCategory(c)} className={`rounded-xl border-2 py-2 text-xs font-medium transition-all ${category === c ? 'border-rose-500 bg-rose-50 text-rose-600 dark:border-rose-400 dark:bg-rose-500/15 dark:text-rose-200' : 'border-aubergine-100 bg-white text-aubergine-600 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100/80'}`}>
                      {t(`docs.cat.${c}` as never)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-aubergine-700 dark:text-sable-100">{t('docs.title_field')}</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-aubergine-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-aubergine-700 dark:text-sable-100">{t('docs.notes')}</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full resize-none rounded-xl border border-aubergine-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100" />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowForm(false)} className="btn-outline flex-1 py-2.5 text-sm">{t('docs.cancel')}</button>
                <button onClick={save} disabled={busy || !title.trim()} className="btn-primary flex-1 py-2.5 text-sm">
                  {busy ? <Loader2 size={16} className="animate-spin" /> : null} {t('docs.save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-fade-up">
          <div className="flex items-center gap-2 rounded-full bg-emeraude-500 px-5 py-2.5 text-sm font-medium text-white shadow-soft-lg"><FolderLock size={16} /> {toast}</div>
        </div>
      )}
    </div>
  );
}
