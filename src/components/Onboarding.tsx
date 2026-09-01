import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Calendar, HeartPulse, Baby, Sparkles, Smile } from 'lucide-react';
import { useAuth, type Goal } from '../auth/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { todayISOLocal } from '../lib/dateUtils';
import { Logo } from './Logo';
import { LanguageToggle } from './LanguageToggle';
import { ThemeToggle } from './ThemeToggle';

const AFRICAN_COUNTRIES: { code: string; fr: string; en: string }[] = [
  { code: 'DZ', fr: 'Algérie', en: 'Algeria' },
  { code: 'AO', fr: 'Angola', en: 'Angola' },
  { code: 'BJ', fr: 'Bénin', en: 'Benin' },
  { code: 'BW', fr: 'Botswana', en: 'Botswana' },
  { code: 'BF', fr: 'Burkina Faso', en: 'Burkina Faso' },
  { code: 'BI', fr: 'Burundi', en: 'Burundi' },
  { code: 'CM', fr: 'Cameroun', en: 'Cameroon' },
  { code: 'CV', fr: 'Cap-Vert', en: 'Cape Verde' },
  { code: 'CF', fr: 'Centrafrique', en: 'Central African Republic' },
  { code: 'TD', fr: 'Tchad', en: 'Chad' },
  { code: 'KM', fr: 'Comores', en: 'Comoros' },
  { code: 'CG', fr: 'Congo', en: 'Congo' },
  { code: 'CD', fr: 'Congo (RDC)', en: 'DR Congo' },
  { code: 'CI', fr: "Côte d'Ivoire", en: "Côte d'Ivoire" },
  { code: 'DJ', fr: 'Djibouti', en: 'Djibouti' },
  { code: 'EG', fr: 'Égypte', en: 'Egypt' },
  { code: 'GQ', fr: 'Guinée équatoriale', en: 'Equatorial Guinea' },
  { code: 'ER', fr: 'Érythrée', en: 'Eritrea' },
  { code: 'SZ', fr: 'Eswatini', en: 'Eswatini' },
  { code: 'ET', fr: 'Éthiopie', en: 'Ethiopia' },
  { code: 'GA', fr: 'Gabon', en: 'Gabon' },
  { code: 'GM', fr: 'Gambie', en: 'Gambia' },
  { code: 'GH', fr: 'Ghana', en: 'Ghana' },
  { code: 'GN', fr: 'Guinée', en: 'Guinea' },
  { code: 'GW', fr: 'Guinée-Bissau', en: 'Guinea-Bissau' },
  { code: 'KE', fr: 'Kenya', en: 'Kenya' },
  { code: 'LS', fr: 'Lesotho', en: 'Lesotho' },
  { code: 'LR', fr: 'Libéria', en: 'Liberia' },
  { code: 'LY', fr: 'Libye', en: 'Libya' },
  { code: 'MG', fr: 'Madagascar', en: 'Madagascar' },
  { code: 'MW', fr: 'Malawi', en: 'Malawi' },
  { code: 'ML', fr: 'Mali', en: 'Mali' },
  { code: 'MR', fr: 'Mauritanie', en: 'Mauritania' },
  { code: 'MU', fr: 'Maurice', en: 'Mauritius' },
  { code: 'MA', fr: 'Maroc', en: 'Morocco' },
  { code: 'MZ', fr: 'Mozambique', en: 'Mozambique' },
  { code: 'NA', fr: 'Namibie', en: 'Namibia' },
  { code: 'NE', fr: 'Niger', en: 'Niger' },
  { code: 'NG', fr: 'Nigéria', en: 'Nigeria' },
  { code: 'RW', fr: 'Rwanda', en: 'Rwanda' },
  { code: 'ST', fr: 'São Tomé-et-Príncipe', en: 'São Tomé and Príncipe' },
  { code: 'SN', fr: 'Sénégal', en: 'Senegal' },
  { code: 'SC', fr: 'Seychelles', en: 'Seychelles' },
  { code: 'SL', fr: 'Sierra Leone', en: 'Sierra Leone' },
  { code: 'SO', fr: 'Somalie', en: 'Somalia' },
  { code: 'ZA', fr: 'Afrique du Sud', en: 'South Africa' },
  { code: 'SS', fr: 'Soudan du Sud', en: 'South Sudan' },
  { code: 'SD', fr: 'Soudan', en: 'Sudan' },
  { code: 'TZ', fr: 'Tanzanie', en: 'Tanzania' },
  { code: 'TG', fr: 'Togo', en: 'Togo' },
  { code: 'TN', fr: 'Tunisie', en: 'Tunisia' },
  { code: 'UG', fr: 'Ouganda', en: 'Uganda' },
  { code: 'EH', fr: 'Sahara occidental', en: 'Western Sahara' },
  { code: 'ZM', fr: 'Zambie', en: 'Zambia' },
  { code: 'ZW', fr: 'Zimbabwe', en: 'Zimbabwe' },
];

export function Onboarding() {
  const { t, lang } = useI18n();
  const { profile, updateProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState(profile?.first_name ?? '');
  const [goal, setGoal] = useState<Goal | null>(null);
  const [lastPeriod, setLastPeriod] = useState('');
  const [skipPeriod, setSkipPeriod] = useState(false);
  const [cycleLength, setCycleLength] = useState(profile?.cycle_length_avg ?? 28);
  const [periodLength, setPeriodLength] = useState(profile?.period_length_avg ?? 5);
  const [country, setCountry] = useState(profile?.country ?? '');

  const totalSteps = 5;

  const goals: { id: Goal; icon: typeof HeartPulse; titleKey: string; descKey: string; accent: string }[] = [
    { id: 'track_cycle', icon: HeartPulse, titleKey: 'onb.goal.track', descKey: 'onb.goal.trackDesc', accent: 'cycle' },
    { id: 'conceive', icon: Sparkles, titleKey: 'onb.goal.conceive', descKey: 'onb.goal.conceiveDesc', accent: 'emeraude' },
    { id: 'pregnancy', icon: Baby, titleKey: 'onb.goal.pregnancy', descKey: 'onb.goal.pregnancyDesc', accent: 'ocre' },
    { id: 'wellbeing', icon: Smile, titleKey: 'onb.goal.wellbeing', descKey: 'onb.goal.wellbeingDesc', accent: 'terre' },
  ];

  const accentBg: Record<string, string> = {
    cycle: 'border-cycle bg-cycle/10 text-cycle',
    emeraude: 'border-emeraude-500 bg-emeraude-50 text-emeraude-600 dark:bg-emeraude-700/20 dark:text-emeraude-200',
    ocre: 'border-ocre-400 bg-ocre-50 text-ocre-600 dark:bg-ocre-400/15 dark:text-ocre-200',
    terre: 'border-terre-500 bg-terre-50 text-terre-500 dark:bg-terre-500/15 dark:text-terre-200',
  };

  const canNext = (): boolean => {
    switch (step) {
      case 0: return firstName.trim().length > 0;
      case 1: return goal !== null;
      case 2: return skipPeriod || lastPeriod !== '';
      case 3: return cycleLength > 0 && periodLength > 0;
      case 4: return country !== '';
      default: return true;
    }
  };

  const finish = async () => {
    setBusy(true);
    setError(null);
    const patch: Record<string, unknown> = {
      first_name: firstName.trim(),
      goal,
      last_period_date: skipPeriod ? null : lastPeriod || null,
      cycle_length_avg: cycleLength,
      period_length_avg: periodLength,
      country,
      onboarding_completed: true,
      lang,
    };
    // FIX: on protège l'appel réseau avec try/catch/finally.
    // Avant, si updateProfile rejetait/throwait (erreur réseau, exception),
    // setBusy(false) n'était jamais exécuté : le bouton "Terminer" restait
    // bloqué en état "chargement" indéfiniment et l'utilisateur semblait
    // coincé sur la dernière étape de l'onboarding.
    try {
      const { error: err } = await updateProfile(patch as never);
      if (err) setError(err);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('onb.genericError'));
    } finally {
      setBusy(false);
    }
  };

  const next = () => setStep((s) => Math.min(s + 1, totalSteps - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <div className="relative min-h-screen overflow-hidden bg-sable-100 dark:bg-indigo-400">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-gradient-to-br from-ocre-100/50 via-aubergine-50 to-emeraude-50/30 blur-3xl dark:from-ocre-400/10 dark:via-aubergine-700/20" />

      <div className="relative flex items-center justify-between px-4 pt-5 sm:px-6">
        <Logo />
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>

      <div className="relative mx-auto max-w-xl px-4 py-8 sm:px-6">
        {/* Progress */}
        <div className="mb-8">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-aubergine-700 dark:text-sable-100">
              {t('onb.step', { n: step + 1, total: totalSteps })}
            </span>
            <span className="text-neutral">{t('onb.title')}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-aubergine-100 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-aubergine-600 to-ocre-400 transition-all duration-500"
              style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        <div className="card p-7 shadow-soft-lg">
          {/* Step 0: name */}
          {step === 0 && (
            <div className="animate-fade-up">
              <h2 className="text-xl font-bold text-aubergine-700 dark:text-sable-100">
                {t('onb.firstNameLabel')}
              </h2>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={t('onb.firstNamePlaceholder')}
                autoFocus
                className="mt-4 w-full rounded-xl border border-aubergine-200 bg-white px-4 py-3 text-sm text-aubergine-900 outline-none transition-all placeholder:text-neutral/60 focus:border-ocre-400 focus:ring-2 focus:ring-ocre-200 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100 dark:placeholder:text-sable-100/40"
              />
            </div>
          )}

          {/* Step 1: goal */}
          {step === 1 && (
            <div className="animate-fade-up">
              <h2 className="text-xl font-bold text-aubergine-700 dark:text-sable-100">
                {t('onb.goalLabel')}
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {goals.map((g) => {
                  const active = goal === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setGoal(g.id)}
                      className={`flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition-all ${
                        active
                          ? accentBg[g.accent]
                          : 'border-aubergine-100 bg-white hover:border-aubergine-200 dark:border-white/10 dark:bg-indigo-200 dark:hover:border-white/20'
                      }`}
                    >
                      <g.icon size={22} className="mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold text-aubergine-700 dark:text-sable-100">{t(g.titleKey as never)}</p>
                        <p className="mt-0.5 text-xs text-neutral">{t(g.descKey as never)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: last period */}
          {step === 2 && (
            <div className="animate-fade-up">
              <h2 className="text-xl font-bold text-aubergine-700 dark:text-sable-100">
                {t('onb.periodLabel')}
              </h2>
              <div className="relative mt-4">
                <Calendar size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral" />
                <input
                  type="date"
                  value={lastPeriod}
                  onChange={(e) => { setLastPeriod(e.target.value); setSkipPeriod(false); }}
                  max={todayISOLocal()}
                  disabled={skipPeriod}
                  className={`w-full rounded-xl border bg-white py-3 pl-10 pr-3 text-sm text-aubergine-900 outline-none transition-all focus:border-ocre-400 focus:ring-2 focus:ring-ocre-200 dark:bg-indigo-200 dark:text-sable-100 ${
                    skipPeriod ? 'opacity-50 border-aubergine-100 dark:border-white/10 cursor-not-allowed' : 'border-aubergine-200 dark:border-white/10'
                  }`}
                />
              </div>
              <label className="mt-3 flex items-center gap-2.5 text-sm text-aubergine-700 dark:text-sable-100">
                <input
                  type="checkbox"
                  checked={skipPeriod}
                  onChange={(e) => { setSkipPeriod(e.target.checked); if (e.target.checked) setLastPeriod(''); }}
                  className="h-4 w-4 rounded border-aubergine-200 text-ocre-500 focus:ring-ocre-300"
                />
                {t('onb.periodSkip')}
              </label>
            </div>
          )}

          {/* Step 3: cycle lengths */}
          {step === 3 && (
            <div className="animate-fade-up space-y-6">
              <div>
                <h2 className="text-xl font-bold text-aubergine-700 dark:text-sable-100">
                  {t('onb.cycleLabel')}
                </h2>
                <div className="mt-4 flex items-center gap-4">
                  <input
                    type="range"
                    min={21}
                    max={40}
                    value={cycleLength}
                    onChange={(e) => setCycleLength(Number(e.target.value))}
                    className="flex-1 accent-ocre-500"
                  />
                  <span className="tnum w-20 text-right text-lg font-bold text-aubergine-700 dark:text-sable-100">
                    {cycleLength} <span className="text-sm font-medium text-neutral">{t('onb.cycleUnit')}</span>
                  </span>
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold text-aubergine-700 dark:text-sable-100">
                  {t('onb.periodLengthLabel')}
                </h2>
                <div className="mt-4 flex items-center gap-4">
                  <input
                    type="range"
                    min={2}
                    max={10}
                    value={periodLength}
                    onChange={(e) => setPeriodLength(Number(e.target.value))}
                    className="flex-1 accent-ocre-500"
                  />
                  <span className="tnum w-20 text-right text-lg font-bold text-aubergine-700 dark:text-sable-100">
                    {periodLength} <span className="text-sm font-medium text-neutral">{t('onb.cycleUnit')}</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: country */}
          {step === 4 && (
            <div className="animate-fade-up">
              <h2 className="text-xl font-bold text-aubergine-700 dark:text-sable-100">
                {t('onb.countryLabel')}
              </h2>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="mt-4 w-full rounded-xl border border-aubergine-200 bg-white px-4 py-3 text-sm text-aubergine-900 outline-none transition-all focus:border-ocre-400 focus:ring-2 focus:ring-ocre-200 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100"
              >
                <option value="">{t('onb.countryPlaceholder')}</option>
                {AFRICAN_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {lang === 'fr' ? c.fr : c.en}
                  </option>
                ))}
              </select>
              <p className="mt-3 text-xs text-neutral">
                {t('africa.countriesDesc')}
              </p>
            </div>
          )}

          {error && (
            <div className="mt-4 animate-fade-in rounded-xl bg-terre-50 px-4 py-3 text-sm text-terre-600 dark:bg-terre-500/15 dark:text-terre-200">
              {error}
            </div>
          )}

          {/* Nav */}
          <div className="mt-7 flex items-center justify-between">
            <button
              type="button"
              onClick={back}
              disabled={step === 0 || busy}
              className="btn-ghost text-sm disabled:opacity-40"
            >
              <ArrowLeft size={16} /> {t('onb.back')}
            </button>
            {step < totalSteps - 1 ? (
              <button type="button" onClick={next} disabled={!canNext()} className="btn-primary px-5 py-2.5 text-sm">
                {t('onb.next')} <ArrowRight size={16} />
              </button>
            ) : (
              <button type="button" onClick={finish} disabled={busy || !canNext()} className="btn-ocre px-5 py-2.5 text-sm">
                {busy ? null : <Check size={16} />}
                {t('onb.finish')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
