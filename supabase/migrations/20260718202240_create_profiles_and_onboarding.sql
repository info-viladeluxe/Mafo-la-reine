/*
# Create profiles table for Mafo user workspace

## Purpose
Establishes the per-user private workspace foundation for the Mafo Health Workspace.
Each authenticated user is a tenant; all future health modules (cycles, symptoms,
pregnancy, documents, journal, etc.) will hang off this profile via user_id-scoped RLS.

## New Tables
- `profiles`
  - `id` (uuid, PK, FK to auth.users) — one row per authenticated user, serves as tenant_id.
  - `email` (text) — cached for display without an extra auth call.
  - `first_name` (text, nullable) — collected during onboarding.
  - `lang` (text, NOT NULL, default 'fr') — interface language preference (FR/EN now, ar/pt/sw later).
  - `country` (text, nullable) — African country code for localized payments/formats.
  - `goal` (text, nullable) — primary goal selected during onboarding (track_cycle, conceive, pregnancy, wellbeing).
  - `last_period_date` (date, nullable) — last menstrual period start, collected during onboarding.
  - `cycle_length_avg` (integer, nullable, default 28) — average cycle length in days.
  - `period_length_avg` (integer, nullable, default 5) — average period length in days.
  - `onboarding_completed` (boolean, NOT NULL, default false) — gates access to the app shell.
  - `created_at` (timestamptz, default now()).
  - `updated_at` (timestamptz, default now()) — bumped on profile updates.

## Security
- RLS enabled on `profiles`.
- 4 owner-scoped policies (SELECT/INSERT/UPDATE/DELETE) restricted to `authenticated`,
  scoped via `auth.uid() = id`. The id doubles as the tenant id; no cross-tenant access.
- INSERT policy allows a user to insert only their own profile row (id = auth.uid()).

## Important Notes
1. `profiles.id` is both PK and FK to auth.users, and doubles as the tenant_id referenced
   by all future module tables — keeping the multi-tenant isolation boundary in one place.
2. Email confirmation stays OFF (per spec) so sign-up immediately yields a session.
3. No `USING (true)` shortcuts — every policy enforces real ownership.
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  first_name text,
  lang text NOT NULL DEFAULT 'fr',
  country text,
  goal text,
  last_period_date date,
  cycle_length_avg integer DEFAULT 28,
  period_length_avg integer DEFAULT 5,
  onboarding_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);
