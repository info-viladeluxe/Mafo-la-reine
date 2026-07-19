import { Calendar, Droplets, Moon, Scale, Thermometer, Plus, HeartPulse, Sparkles } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { useAuth } from '../auth/AuthContext';
import { useCycleState } from '../lib/cycle';
import { ProgressRing } from './ProgressRing';

export function Dashboard() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const cycle = useCycleState();

  const firstName = profile?.first_name || profile?.email?.split('@')[0] || '—';

  return (
    <div className="space-y-6">
      {/* Greeting + day */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-aubergine-700 dark:text-sable-100">
            {t('dash.hello', { name: firstName })}
          </h1>
          <p className="mt-1 text-sm text-neutral">
            {cycle ? t('dash.day', { n: cycle.dayOfCycle }) : t('dash.noPeriod')}
          </p>
        </div>
        {cycle && (
          <span
            className={`chip w-fit ${
              cycle.isFertile
                ? 'bg-emeraude-100 text-emeraude-700 dark:bg-emeraude-700/20 dark:text-emeraude-200'
                : cycle.isPeriod
                  ? 'bg-cycle/15 text-cycle'
                  : 'bg-aubergine-50 text-aubergine-600 dark:bg-white/5 dark:text-sable-100/80'
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {cycle.isFertile ? t('dash.fertile') : cycle.isPeriod ? t('dash.today') : t('dash.upcoming')}
          </span>
        )}
      </div>

      {/* Cycle hero card */}
      <div className="card overflow-hidden p-6 shadow-soft">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-aubergine-700 dark:text-sable-100">
              <HeartPulse size={16} className="text-cycle" />
              {t('app.cycle')}
            </div>
            {cycle ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="tnum text-5xl font-bold text-aubergine-700 dark:text-sable-100">
                    {cycle.daysUntilPeriod > 0 ? cycle.daysUntilPeriod : 0}
                  </span>
                  <span className="text-sm text-neutral">
                    {cycle.daysUntilPeriod > 0
                      ? t('dash.periodIn', { n: cycle.daysUntilPeriod })
                      : t('dash.periodToday')}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-xs">
                  <span className="chip bg-emeraude-50 text-emeraude-700 dark:bg-emeraude-700/20 dark:text-emeraude-200">
                    <Sparkles size={12} />
                    {t('dash.fertileWindowDesc', { start: cycle.fertileStart, end: cycle.fertileEnd })}
                  </span>
                  <span className="chip bg-ocre-50 text-ocre-700 dark:bg-ocre-400/15 dark:text-ocre-200">
                    {t('dash.ovulation')} · {t('dash.ovulationIn', { n: Math.max(0, cycle.ovulationDay - cycle.dayOfCycle) })}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-sm text-neutral">{t('dash.noPeriod')}</p>
            )}
          </div>

          {/* Cycle day ring */}
          {cycle && (
            <ProgressRing
              label={t('dash.day', { n: cycle.dayOfCycle })}
              value={cycle.dayOfCycle}
              max={cycle.cycleLength}
              unit=""
              color="#C97A87"
              track="#EAD9E3"
              size={120}
              display={`${cycle.dayOfCycle}`}
            />
          )}
        </div>
      </div>

      {/* Rings grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <RingCard icon={Droplets} label={t('dash.hydration')} value={1.6} max={2} unit="L" color="#12A76B" track="#C2ECD8" />
        <RingCard icon={Moon} label={t('dash.sleep')} value={7.2} max={8} unit="h" color="#D69A2D" track="#FAE9C2" />
        <RingCard icon={Scale} label={t('dash.weight')} value={62} max={70} unit="kg" color="#5C2A4D" track="#EAD9E3" />
        <RingCard icon={Thermometer} label={t('dash.temperature')} value={36.6} max={37.5} unit="°C" color="#A8461E" track="#F4D2C0" />
      </div>

      {/* Quick add */}
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-aubergine-700 dark:text-sable-100">{t('dash.quickAdd')}</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { icon: Calendar, label: t('dash.logPeriod'), accent: 'cycle' },
            { icon: Plus, label: t('dash.logSymptom'), accent: 'terre' },
            { icon: Sparkles, label: t('dash.logMood'), accent: 'ocre' },
            { icon: Scale, label: t('dash.logWeight'), accent: 'emeraude' },
          ].map((q) => (
            <button
              key={q.label}
              className={`flex flex-col items-center gap-2 rounded-2xl border border-aubergine-100 p-4 text-center transition-all hover:-translate-y-0.5 hover:shadow-soft dark:border-white/10 ${
                q.accent === 'cycle' ? 'bg-cycle/5 text-cycle hover:bg-cycle/10'
                  : q.accent === 'terre' ? 'bg-terre-50 text-terre-500 hover:bg-terre-100 dark:bg-terre-500/10'
                  : q.accent === 'ocre' ? 'bg-ocre-50 text-ocre-600 hover:bg-ocre-100 dark:bg-ocre-400/10'
                  : 'bg-emeraude-50 text-emeraude-600 hover:bg-emeraude-100 dark:bg-emeraude-700/15'
              }`}
            >
              <q.icon size={20} />
              <span className="text-xs font-medium">{q.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Mini trend */}
      <div className="card p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-aubergine-700 dark:text-sable-100">
            {t('dash.temperature')} · 7 {t('onb.cycleUnit')}
          </h2>
          <span className="tnum text-xs font-semibold text-aubergine-700 dark:text-sable-100">36.6 °C</span>
        </div>
        <svg viewBox="0 0 320 64" className="w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="dashTrend" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#A8461E" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#A8461E" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0,44 C40,42 60,34 90,32 C120,30 140,38 175,34 C210,30 235,22 270,18 L320,16"
            fill="none"
            stroke="#A8461E"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M0,44 C40,42 60,34 90,32 C120,30 140,38 175,34 C210,30 235,22 270,18 L320,16 L320,64 L0,64 Z"
            fill="url(#dashTrend)"
          />
        </svg>
      </div>
    </div>
  );
}

function RingCard({
  icon: Icon,
  label,
  value,
  max,
  unit,
  color,
  track,
}: {
  icon: typeof Droplets;
  label: string;
  value: number;
  max: number;
  unit: string;
  color: string;
  track: string;
}) {
  return (
    <div className="card flex flex-col items-center gap-3 p-5 transition-all hover:-translate-y-0.5 hover:shadow-soft-lg">
      <div className="flex w-full items-center gap-2 text-xs font-medium text-neutral">
        <Icon size={14} style={{ color }} />
        {label}
      </div>
      <ProgressRing label="" value={value} max={max} unit={unit} color={color} track={track} size={92} />
    </div>
  );
}
