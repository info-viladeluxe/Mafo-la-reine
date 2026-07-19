import { useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';

export interface CycleState {
  dayOfCycle: number;
  cycleLength: number;
  periodLength: number;
  fertileStart: number;
  fertileEnd: number;
  ovulationDay: number;
  daysUntilPeriod: number;
  isFertile: boolean;
  isPeriod: boolean;
}

export function computeCycleState(
  lastPeriodDate: string | null,
  cycleLength: number,
  periodLength: number,
): CycleState | null {
  if (!lastPeriodDate) return null;
  const last = new Date(lastPeriodDate);
  if (Number.isNaN(last.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  last.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((today.getTime() - last.getTime()) / 86400000);
  const dayOfCycle = (diffDays % cycleLength) + 1;
  const ovulationDay = cycleLength - 14;
  const fertileStart = ovulationDay - 5;
  const fertileEnd = ovulationDay + 1;
  const daysUntilPeriod = cycleLength - dayOfCycle;

  return {
    dayOfCycle,
    cycleLength,
    periodLength,
    fertileStart,
    fertileEnd,
    ovulationDay,
    daysUntilPeriod,
    isFertile: dayOfCycle >= fertileStart && dayOfCycle <= fertileEnd,
    isPeriod: dayOfCycle <= periodLength,
  };
}

export function useCycleState(): CycleState | null {
  const { profile } = useAuth();
  return useMemo(
    () =>
      computeCycleState(
        profile?.last_period_date ?? null,
        profile?.cycle_length_avg ?? 28,
        profile?.period_length_avg ?? 5,
      ),
    [profile?.last_period_date, profile?.cycle_length_avg, profile?.period_length_avg],
  );
}
