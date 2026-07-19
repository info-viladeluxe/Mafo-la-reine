/*
# Create cycle_entries table for period logging

## Purpose
First health-data module of the Mafo Health Workspace. Stores each menstrual period
start date the user logs, enabling cycle history, average length computation, trend
visualization, and period predictions. Each row belongs to exactly one user (tenant).

## New Tables
- `cycle_entries`
  - `id` (uuid, PK) — row identifier.
  - `user_id` (uuid, NOT NULL, DEFAULT auth.uid(), FK to auth.users ON DELETE CASCADE) — owner/tenant.
  - `start_date` (date, NOT NULL) — first day of the logged period.
  - `flow` (text, nullable) — flow intensity: 'light' | 'medium' | 'heavy'.
  - `notes` (text, nullable) — free-text note for this period.
  - `created_at` (timestamptz, DEFAULT now()).
  - `updated_at` (timestamptz, DEFAULT now()).

## Indexes
- `idx_cycle_entries_user_start` on (user_id, start_date DESC) — fast per-user history listing.

## Security
- RLS enabled on `cycle_entries`.
- 4 owner-scoped policies (SELECT/INSERT/UPDATE/DELETE) restricted to `authenticated`,
  scoped via `auth.uid() = user_id`. No cross-tenant access possible.
- `user_id` defaults to `auth.uid()` so inserts that omit it still satisfy the WITH CHECK.

## Important Notes
1. This is the canonical period log. Future symptom/pregnancy tables will reference
   the same `user_id` tenant boundary.
2. Predictions are derived client-side from the latest entry + averages, not stored.
3. No `USING (true)` shortcuts — every policy enforces real ownership.
*/

CREATE TABLE IF NOT EXISTS cycle_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  flow text CHECK (flow IN ('light', 'medium', 'heavy')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cycle_entries_user_start
  ON cycle_entries (user_id, start_date DESC);

ALTER TABLE cycle_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_cycle_entries" ON cycle_entries;
CREATE POLICY "select_own_cycle_entries" ON cycle_entries FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_cycle_entries" ON cycle_entries;
CREATE POLICY "insert_own_cycle_entries" ON cycle_entries FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_cycle_entries" ON cycle_entries;
CREATE POLICY "update_own_cycle_entries" ON cycle_entries FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_cycle_entries" ON cycle_entries;
CREATE POLICY "delete_own_cycle_entries" ON cycle_entries FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
