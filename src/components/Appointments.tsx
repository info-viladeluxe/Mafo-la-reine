import { useEffect, useState } from 'react';
import { CalendarClock, Plus, X, Loader2, Trash2, Calendar, Clock, MapPin, Video, Stethoscope } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { todayISOLocal } from '../lib/dateUtils';

interface Appt {
  id: string;
  title: string;
  doctor_name: string | null;
  specialty: string | null;
  location: string | null;
  appointment_date: string;
  appointment_time: string | null;
  is_teleconsult: boolean;
  status: string;
  notes: string | null;
}

function fmtDate(iso: string, lang: 'fr' | 'en') {
  return new Date(iso + 'T00:00:00').toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export function Appointments() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [appts, setAppts] = useState<Appt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [doctor, setDoctor] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(todayISOLocal());
  const [time, setTime] = useState('');
  const [teleconsult, setTeleconsult] = useState(false);
  const [notes, setNotes] = useState('');

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('appointments').select('*').order('appointment_date', { ascending: true });
    setLoading(false);
    setAppts((data as Appt[]) ?? []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const flashToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const save = async () => {
    setBusy(true); setError(null);
    const { error: err } = await supabase.from('appointments').insert({
      title: title.trim(), doctor_name: doctor.trim() || null, specialty: specialty.trim() || null,
      location: location.trim() || null, appointment_date: date, appointment_time: time || null,
      is_teleconsult: teleconsult, notes: notes.trim() || null,
    });
    setBusy(false);
    if (err) { setError(t('appt.error')); return; }
    setShowForm(false); setTitle(''); setDoctor(''); setSpecialty(''); setLocation(''); setTime(''); setTeleconsult(false); setNotes('');
    flashToast(t('appt.saved')); load();
  };

  const remove = async (id: string) => {
    if (!window.confirm(t('appt.confirmDelete'))) return;
    await supabase.from('appointments').delete().eq('id', id);
    load();
  };

  const today = todayISOLocal();
  const upcoming = appts.filter((a) => a.appointment_date >= today);
  const past = appts.filter((a) => a.appointment_date < today);

  const renderAppt = (a: Appt) => (
    <div key={a.id} className="card p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-rose-100 text-rose-500 dark:bg-rose-500/15 dark:text-rose-200">
          <CalendarClock size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-aubergine-700 dark:text-sable-100">{a.title}</span>
            {a.is_teleconsult && <span className="chip bg-indigo-50 px-2 py-0.5 text-[10px] text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-200"><Video size={10} /> {t('appt.teleconsult')}</span>}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-neutral">
            <span className="flex items-center gap-1"><Calendar size={10} /> {fmtDate(a.appointment_date, lang)}</span>
            {a.appointment_time && <span className="flex items-center gap-1"><Clock size={10} /> {a.appointment_time}</span>}
            {a.doctor_name && <span className="flex items-center gap-1"><Stethoscope size={10} /> {a.doctor_name}</span>}
            {a.location && <span className="flex items-center gap-1"><MapPin size={10} /> {a.location}</span>}
          </div>
          {a.specialty && <span className="mt-1 block text-[11px] font-medium text-neutral">{a.specialty}</span>}
          {a.notes && <p className="mt-1.5 text-xs text-neutral">{a.notes}</p>}
        </div>
        <button onClick={() => remove(a.id)} className="btn-icon btn-icon-sm btn-icon-danger"><Trash2 size={13} /></button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-aubergine-700 dark:text-sable-100">{t('appt.title')}</h1>
          <p className="mt-1 text-sm text-neutral">{t('appt.subtitle')}</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary px-4 py-2.5 text-sm"><Plus size={16} /> {t('appt.add')}</button>
      </div>

      <div className="flex items-start gap-2 rounded-xl bg-indigo-50 p-3 text-xs text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-200">
        <Video size={14} className="mt-0.5 shrink-0" />
        <span>{t('appt.teleconsultSoon')}</span>
      </div>

      {error && <div className="rounded-xl bg-terre-50 px-4 py-3 text-sm text-terre-600 dark:bg-terre-500/15 dark:text-terre-200">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-neutral"><Loader2 size={16} className="animate-spin" /> {t('appt.loading')}</div>
      ) : appts.length === 0 ? (
        <div className="card flex flex-col items-center gap-4 p-10 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-rose-100 text-rose-500 dark:bg-rose-500/20 dark:text-rose-200"><CalendarClock size={26} /></div>
          <p className="max-w-xs text-sm text-neutral">{t('appt.empty')}</p>
          <button onClick={() => setShowForm(true)} className="btn-primary px-4 py-2.5 text-sm"><Plus size={16} /> {t('appt.emptyCta')}</button>
        </div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold text-aubergine-700 dark:text-sable-100">{t('appt.upcoming')}</h2>
              <div className="grid gap-3 sm:grid-cols-2">{upcoming.map(renderAppt)}</div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold text-neutral">{t('appt.past')}</h2>
              <div className="grid gap-3 opacity-70 sm:grid-cols-2">{past.map(renderAppt)}</div>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-aubergine-900/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative m-0 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-sable-50 p-6 shadow-soft-lg sm:m-4 sm:rounded-3xl dark:bg-indigo-300">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-aubergine-700 dark:text-sable-100">{t('appt.add')}</h3>
              <button onClick={() => setShowForm(false)} className="btn-icon btn-icon-md"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-aubergine-700 dark:text-sable-100">{t('appt.title_field')}</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-aubergine-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-aubergine-700 dark:text-sable-100">{t('appt.doctor')}</label>
                  <input type="text" value={doctor} onChange={(e) => setDoctor(e.target.value)} className="w-full rounded-xl border border-aubergine-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-aubergine-700 dark:text-sable-100">{t('appt.specialty')}</label>
                  <input type="text" value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="w-full rounded-xl border border-aubergine-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-aubergine-700 dark:text-sable-100">{t('appt.location')}</label>
                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full rounded-xl border border-aubergine-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-aubergine-700 dark:text-sable-100">{t('appt.date')}</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl border border-aubergine-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-aubergine-700 dark:text-sable-100">{t('appt.time')}</label>
                  <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full rounded-xl border border-aubergine-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-aubergine-700 dark:text-sable-100">
                <input type="checkbox" checked={teleconsult} onChange={(e) => setTeleconsult(e.target.checked)} className="h-4 w-4 rounded border-aubergine-200 text-rose-500 focus:ring-rose-400" />
                {t('appt.teleconsult')}
              </label>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-aubergine-700 dark:text-sable-100">{t('appt.notes')}</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full resize-none rounded-xl border border-aubergine-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100" />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowForm(false)} className="btn-outline flex-1 py-2.5 text-sm">{t('appt.cancel')}</button>
                <button onClick={save} disabled={busy || !title.trim()} className="btn-primary flex-1 py-2.5 text-sm">{busy ? <Loader2 size={16} className="animate-spin" /> : null} {t('appt.save')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-fade-up">
          <div className="flex items-center gap-2 rounded-full bg-emeraude-500 px-5 py-2.5 text-sm font-medium text-white shadow-soft-lg"><CalendarClock size={16} /> {toast}</div>
        </div>
      )}
    </div>
  );
}
