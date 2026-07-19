import { useMemo, useState } from 'react';
import { Sparkles, Calendar, TrendingUp, Info, Baby, ShieldCheck } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { useCycleState } from '../lib/cycle';

type FertMode = 'track' | 'conceive' | 'avoid';

const PROB_COLORS = ['#E5E7EB', '#FBCFE8', '#F472B6', '#F0509C', '#BE185D'];

function probabilityForDay(dayOfCycle: number, fertileStart: number, ovulationDay: number): number {
  if (dayOfCycle === ovulationDay) return 1;
  const dist = Math.abs(dayOfCycle - ovulationDay);
  if (dist === 1) return 0.85;
  if (dist === 2) return 0.6;
  if (dist === 3) return 0.4;
  if (dist === 4) return 0.25;
  if (dist === 5) return 0.15;
  if (dist > 5) return 0.05;
  return 0.05;
}

export function Fertility() {
  const { t } = useI18n();
  const cycleState = useCycleState();
  const [mode, setMode] = useState<FertMode>('track');

  const days = useMemo(() => {
    if (!cycleState) return [];
    const arr: { day: number; prob: number; isToday: boolean }[] = [];
    for (let d = 1; d <= cycleState.cycleLength; d++) {
      arr.push({
        day: d,
        prob: probabilityForDay(d, cycleState.fertileStart, cycleState.ovulationDay),
        isToday: d === cycleState.dayOfCycle,
      });
    }
    return arr;
  }, [cycleState]);

  if (!cycleState) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-aubergine-700 dark:text-sable-100">{t('fert.title')}</h1>
          <p className="mt-1 text-sm text-neutral">{t('fert.subtitle')}</p>
        </div>
        <div className="card flex flex-col items-center gap-4 p-10 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-rose-100 text-rose-500 dark:bg-rose-500/20 dark:text-rose-200">
            <Sparkles size={26} />
          </div>
          <p className="max-w-xs text-sm text-neutral">{t('fert.noData')}</p>
        </div>
      </div>
    );
  }

  const todayProb = probabilityForDay(cycleState.dayOfCycle, cycleState.fertileStart, cycleState.ovulationDay);
  const daysToOvulation = Math.max(0, cycleState.ovulationDay - cycleState.dayOfCycle);
  const probLevel = todayProb >= 0.85 ? 4 : todayProb >= 0.5 ? 3 : todayProb >= 0.3 ? 2 : todayProb >= 0.15 ? 1 : 0;
  const probLabel = probLevel >= 4 ? t('fert.peak') : probLevel === 3 ? t('fert.high') : probLevel === 2 ? t('fert.medium') : t('fert.low');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-aubergine-700 dark:text-sable-100">{t('fert.title')}</h1>
        <p className="mt-1 text-sm text-neutral">{t('fert.subtitle')}</p>
      </div>

      {/* Mode selector */}
      <div className="card p-5">
        <p className="mb-3 text-xs font-medium text-neutral">{t('fert.mode')}</p>
        <div className="grid grid-cols-3 gap-2">
          {(['track', 'conceive', 'avoid'] as FertMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-xl border-2 py-2.5 text-xs font-medium transition-all ${
                mode === m
                  ? 'border-rose-500 bg-rose-50 text-rose-600 dark:border-rose-400 dark:bg-rose-500/15 dark:text-rose-200'
                  : 'border-aubergine-100 bg-white text-aubergine-600 hover:border-aubergine-200 dark:border-white/10 dark:bg-indigo-200 dark:text-sable-100/80'
              }`}
            >
              {t(`fert.mode.${m}` as never)}
            </button>
          ))}
        </div>
        {mode === 'conceive' && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-emeraude-50 p-3 text-xs text-emeraude-700 dark:bg-emeraude-700/20 dark:text-emeraude-200">
            <Baby size={14} className="mt-0.5 shrink-0" />
            <span>{t('fert.tryBabyDesc')}</span>
          </div>
        )}
        {mode === 'avoid' && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-ocre-50 p-3 text-xs text-ocre-700 dark:bg-ocre-400/15 dark:text-ocre-200">
            <ShieldCheck size={14} className="mt-0.5 shrink-0" />
            <span>{t('fert.tipText')}</span>
          </div>
        )}
      </div>

      {/* Today's probability */}
      <div className="card overflow-hidden p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-neutral">{t('fert.cycleDay', { n: cycleState.dayOfCycle })}</p>
            <p className="mt-1 text-3xl font-bold text-aubergine-700 dark:text-sable-100">{probLabel}</p>
          </div>
          <div className="relative grid h-24 w-24 place-items-center">
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#E5E7EB" strokeWidth="8" className="dark:stroke-white/10" />
              <circle
                cx="50" cy="50" r="42" fill="none" stroke={PROB_COLORS[probLevel]} strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${todayProb * 264} 264`}
                className="transition-all duration-700"
              />
            </svg>
            <span className="tnum text-lg font-bold" style={{ color: PROB_COLORS[probLevel] }}>
              {Math.round(todayProb * 100)}%
            </span>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          {daysToOvulation === 0 ? (
            <span className="chip bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-200">{t('fert.ovulationToday')}</span>
          ) : (
            <span className="chip bg-ocre-50 text-ocre-700 dark:bg-ocre-400/15 dark:text-ocre-200">
              {t('fert.ovulationIn', { n: daysToOvulation })}
            </span>
          )}
          <span className="chip bg-emeraude-50 text-emeraude-700 dark:bg-emeraude-700/20 dark:text-emeraude-200">
            {t('fert.fertileWindow')}: {cycleState.fertileStart}–{cycleState.fertileEnd}
          </span>
        </div>
      </div>

      {/* Cycle probability chart */}
      <div className="card p-6">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-aubergine-700 dark:text-sable-100">
          <TrendingUp size={16} className="text-rose-500" />
          {t('fert.probability')}
        </div>
        <div className="flex items-end gap-1" style={{ height: 140 }}>
          {days.map((d) => (
            <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={`w-full rounded-t-md transition-all duration-500 ${d.isToday ? 'ring-2 ring-aubergine-400' : ''}`}
                style={{ height: `${Math.max(4, d.prob * 100)}%`, backgroundColor: PROB_COLORS[d.prob >= 0.85 ? 4 : d.prob >= 0.5 ? 3 : d.prob >= 0.3 ? 2 : d.prob >= 0.15 ? 1 : 0] }}
                title={`J${d.day}: ${Math.round(d.prob * 100)}%`}
              />
              {d.day % 5 === 0 && <span className="text-[9px] text-neutral">{d.day}</span>}
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-center gap-4 text-[10px] text-neutral">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: PROB_COLORS[0] }} />{t('fert.low')}</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: PROB_COLORS[2] }} />{t('fert.medium')}</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: PROB_COLORS[4] }} />{t('fert.peak')}</span>
        </div>
      </div>

      {/* Tip */}
      <div className="card flex items-start gap-3 p-5">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-rose-100 text-rose-500 dark:bg-rose-500/15 dark:text-rose-200">
          <Info size={16} />
        </div>
        <div>
          <p className="text-xs font-semibold text-aubergine-700 dark:text-sable-100">{t('fert.tip')}</p>
          <p className="mt-0.5 text-xs text-neutral">{t('fert.tipText')}</p>
        </div>
      </div>
    </div>
  );
}
