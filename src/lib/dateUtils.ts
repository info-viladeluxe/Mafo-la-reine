// Local-calendar-date utilities for YYYY-MM-DD strings (last_period_date,
// lmp_date, due_date, log_date, etc. throughout this app).
//
// Why this file exists: `new Date("2026-08-15")` (a bare date-only string,
// no time component) is parsed by the JS spec as UTC midnight, not local
// midnight. For a user in a negative-UTC-offset timezone, that UTC instant
// falls on the *previous* local calendar day — so `new Date("2026-08-15")`
// silently becomes "2026-08-14" the moment you read back its local
// getDate()/getMonth()/getFullYear(), or compare it against `new Date()`
// (which IS local). The reverse problem exists on the way out:
// `date.toISOString().slice(0, 10)` reads the UTC calendar date of a Date
// object, which is wrong whenever the object represents local midnight in a
// positive-UTC-offset timezone (shifts a day earlier).
//
// Net effect if you don't use these helpers: cycle/fertility/pregnancy date
// math can be off by exactly one day, depending on the user's timezone —
// found and fixed in src/lib/cycle.ts and Pregnancy.tsx after noticing
// `new Date(iso + 'T00:00:00')` was already being used correctly in some
// places (Cycle.tsx, Pregnancy.tsx's date-display helper) but not others.

/** Parse a YYYY-MM-DD string as a LOCAL calendar date (never UTC). */
export function parseISODateLocal(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Format a Date back to YYYY-MM-DD using its LOCAL calendar date (never
 * `.toISOString().slice(0, 10)`, which reads the UTC calendar date). */
export function formatISODateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Add (or subtract, with a negative number) whole days to a YYYY-MM-DD
 * string, staying entirely in local-calendar-date arithmetic. */
export function addDaysISO(iso: string, days: number): string {
  const d = parseISODateLocal(iso);
  d.setDate(d.getDate() + days);
  return formatISODateLocal(d);
}

/** Whole days between "now" (local) and a YYYY-MM-DD string (local),
 * floored — negative if the date is in the past. */
export function daysUntilISO(iso: string): number {
  const target = parseISODateLocal(iso).getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((target - today.getTime()) / 86400000);
}
