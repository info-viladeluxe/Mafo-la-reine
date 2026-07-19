/*
# Create symptom_entries table for daily symptom tracking

## Purpose
Second health-data module of the Mafo Health Workspace. Stores daily symptom logs:
fatigue, stress, acne, migraines, cramps, nausea, libido, digestion, mood, sleep,
weight, temperature. Each row is one day per user, enabling trend charts and history.

## New Tables
- `symptom_entries`
  - `id` (uuid, PK)
  - `user_id` (uuid, NOT NULL, DEFAULT auth.uid(), FK to auth.users ON DELETE CASCADE) — owner/tenant
  - `log_date` (date, NOT NULL) — the day this entry describes
  - `fatigue` (smallint, nullable, 0-3) — none/mild/moderate/severe
  - `stress` (smallint, nullable, 0-3)
  - `acne` (smallint, nullable, 0-3)
  - `migraine` (smallint, nullable, 0-3)
  - `cramps` (smallint, nullable, 0-3)
  - `nausea` (smallint, nullable, 0-3)
  - `libido` (smallint, nullable, 0-3)
  - `digestion` (smallint, nullable, 0-3)
  - `mood` (smallint, nullable, 0-4) — 5-level mood scale
  - `sleep_hours` (numeric(4,1), nullable) — hours slept
  - `weight_kg` (numeric(5,1), nullable) — body weight in kg
  - `temperature_c` (numeric(4,2), nullable) — basal body temperature in °C
  - `notes` (text, nullable) — free-text note for the day
  - `created_at` (timestamptz, DEFAULT now())
  - `updated_at` (timestamptz, DEFAULT now())

## Constraints
- `uniq_symptom_entries_user_date` — UNIQUE (user_id, log_date): one entry per user per day.
- CHECK constraints on severity columns enforce 0-3 (or 0-4 for mood).

## Indexes
- `idx_symptom_entries_user_date` on (user_id, log_date DESC) — fast history listing.

## Security
- RLS enabled on `symptom_entries`.
- 4 owner-scoped policies (SELECT/INSERT/UPDATE/DELETE) restricted to `authenticated`,
  scoped via `auth.uid() = user_id`. No cross-tenant access possible.
- `user_id` defaults to `auth.uid()` so inserts that omit it still satisfy WITH CHECK.

## Important Notes
1. One row per user per day (unique constraint). Upsert is used to update same-day logs.
2. Severity scale: 0 = none, 1 = mild, 2 = moderate, 3 = severe. Mood: 0 = very bad, 4 = very good.
3. Future modules (AI insights, predictions) will read this table via the same user_id boundary.
4. No `USING (true)` — every policy enforces real ownership.
*/

CREATE TABLE IF NOT EXISTS symptom_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date date NOT NULL,
  fatigue smallint CHECK (fatigue BETWEEN 0 AND 3),
  stress smallint CHECK (stress BETWEEN 0 AND 3),
  acne smallint CHECK (acne BETWEEN 0 AND 3),
  migraine smallint CHECK (migraine BETWEEN 0 AND 3),
  cramps smallint CHECK (cramps BETWEEN 0 AND 3),
  nausea smallint CHECK (nausea BETWEEN 0 AND 3),
  libido smallint CHECK (libido BETWEEN 0 AND 3),
  digestion smallint CHECK (digestion BETWEEN 0 AND 3),
  mood smallint CHECK (mood BETWEEN 0 AND 4),
  sleep_hours numeric(4,1),
  weight_kg numeric(5,1),
  temperature_c numeric(4,2),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT uniq_symptom_entries_user_date UNIQUE (user_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_symptom_entries_user_date
  ON symptom_entries (user_id, log_date DESC);

ALTER TABLE symptom_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_symptom_entries" ON symptom_entries;
CREATE POLICY "select_own_symptom_entries" ON symptom_entries FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_symptom_entries" ON symptom_entries;
CREATE POLICY "insert_own_symptom_entries" ON symptom_entries FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_symptom_entries" ON symptom_entries;
CREATE POLICY "update_own_symptom_entries" ON symptom_entries FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_symptom_entries" ON symptom_entries;
CREATE POLICY "delete_own_symptom_entries" ON symptom_entries FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
