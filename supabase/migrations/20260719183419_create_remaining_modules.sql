/*
# Create tables for remaining Mafo modules

## Purpose
Adds persistence for Journal, Medications, Appointments, Documents, AI conversations,
Health records, and Pregnancy tracking. Each table is owner-scoped via user_id with RLS.

## New Tables
- journal_entries: private diary (mood, stress, title, content)
- medications: pill/vitamins with schedule, reminders, history
- appointments: doctors, consultations, teleconsultation placeholder
- documents: secure storage references (prescriptions, labs, imaging, invoices, vaccine card)
- ai_conversations: AI assistant chat threads + messages (no medical diagnosis)
- health_records: medical history, vaccines, allergies, treatments, doctors, insurance
- pregnancy_entries: pregnancy mode (week, due date, weight, checklist, vaccines)

## Security
- RLS enabled on every table.
- 4 owner-scoped policies per table (SELECT/INSERT/UPDATE/DELETE), TO authenticated, auth.uid() = user_id.
- user_id defaults to auth.uid() on insert.
- No USING(true) shortcuts.

## Important Notes
1. All tables reference auth.users(id) ON DELETE CASCADE so account deletion cleans up data.
2. AI conversations store messages as jsonb; no medical diagnosis is ever produced — guardrail lives in the UI.
3. Documents table stores metadata + R2/storage path only (no binary in DB).
4. Pregnancy entries: one active row per user (is_active flag) to support mode switching.
*/

-- Journal
CREATE TABLE IF NOT EXISTS journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  mood smallint CHECK (mood BETWEEN 0 AND 4),
  stress smallint CHECK (stress BETWEEN 0 AND 3),
  title text,
  content text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_journal_user_date ON journal_entries (user_id, entry_date DESC);
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_journal" ON journal_entries;
CREATE POLICY "select_own_journal" ON journal_entries FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_journal" ON journal_entries;
CREATE POLICY "insert_own_journal" ON journal_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_journal" ON journal_entries;
CREATE POLICY "update_own_journal" ON journal_entries FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_journal" ON journal_entries;
CREATE POLICY "delete_own_journal" ON journal_entries FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Medications
CREATE TABLE IF NOT EXISTS medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text,
  dosage text,
  frequency text,
  time_of_day jsonb DEFAULT '[]'::jsonb,
  start_date date,
  end_date date,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_meds_user ON medications (user_id, is_active);
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_meds" ON medications;
CREATE POLICY "select_own_meds" ON medications FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_meds" ON medications;
CREATE POLICY "insert_own_meds" ON medications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_meds" ON medications;
CREATE POLICY "update_own_meds" ON medications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_meds" ON medications;
CREATE POLICY "delete_own_meds" ON medications FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Appointments
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  doctor_name text,
  specialty text,
  location text,
  appointment_date date NOT NULL,
  appointment_time time,
  is_teleconsult boolean DEFAULT false,
  status text DEFAULT 'upcoming',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_appts_user_date ON appointments (user_id, appointment_date DESC);
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_appts" ON appointments;
CREATE POLICY "select_own_appts" ON appointments FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_appts" ON appointments;
CREATE POLICY "insert_own_appts" ON appointments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_appts" ON appointments;
CREATE POLICY "update_own_appts" ON appointments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_appts" ON appointments;
CREATE POLICY "delete_own_appts" ON appointments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Documents
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text,
  storage_path text,
  file_url text,
  mime_type text,
  file_size bigint,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_docs_user_date ON documents (user_id, created_at DESC);
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_docs" ON documents;
CREATE POLICY "select_own_docs" ON documents FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_docs" ON documents;
CREATE POLICY "insert_own_docs" ON documents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_docs" ON documents;
CREATE POLICY "update_own_docs" ON documents FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_docs" ON documents;
CREATE POLICY "delete_own_docs" ON documents FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- AI conversations
CREATE TABLE IF NOT EXISTS ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text,
  messages jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_user_date ON ai_conversations (user_id, updated_at DESC);
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_ai" ON ai_conversations;
CREATE POLICY "select_own_ai" ON ai_conversations FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_ai" ON ai_conversations;
CREATE POLICY "insert_own_ai" ON ai_conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_ai" ON ai_conversations;
CREATE POLICY "update_own_ai" ON ai_conversations FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_ai" ON ai_conversations;
CREATE POLICY "delete_own_ai" ON ai_conversations FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Health records
CREATE TABLE IF NOT EXISTS health_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  record_type text NOT NULL,
  title text NOT NULL,
  description text,
  date_recorded date,
  doctor_name text,
  is_resolved boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_health_user_type ON health_records (user_id, record_type, date_recorded DESC);
ALTER TABLE health_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_health" ON health_records;
CREATE POLICY "select_own_health" ON health_records FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_health" ON health_records;
CREATE POLICY "insert_own_health" ON health_records FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_health" ON health_records;
CREATE POLICY "update_own_health" ON health_records FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_health" ON health_records;
CREATE POLICY "delete_own_health" ON health_records FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Pregnancy entries
CREATE TABLE IF NOT EXISTS pregnancy_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  lmp_date date,
  due_date date,
  current_week integer,
  current_weight_kg numeric(5,1),
  notes text,
  checklist jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pregnancy_active_user ON pregnancy_entries (user_id) WHERE is_active = true;
ALTER TABLE pregnancy_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_pregnancy" ON pregnancy_entries;
CREATE POLICY "select_own_pregnancy" ON pregnancy_entries FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_pregnancy" ON pregnancy_entries;
CREATE POLICY "insert_own_pregnancy" ON pregnancy_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_pregnancy" ON pregnancy_entries;
CREATE POLICY "update_own_pregnancy" ON pregnancy_entries FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_pregnancy" ON pregnancy_entries;
CREATE POLICY "delete_own_pregnancy" ON pregnancy_entries FOR DELETE TO authenticated USING (auth.uid() = user_id);
