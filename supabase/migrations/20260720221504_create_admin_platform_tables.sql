/*
# Super Admin Platform: Staff, Roles, Commercial Codes, Audit Log

## Purpose
Transform the admin dashboard into a professional management platform with:
- Custom staff roles with granular permissions
- Commercial (sales) codes for sales reps
- Staff activity tracking (ins/outs)
- Detailed audit log of all admin actions
- Free subscription grants
- Subscription modifications

## New Tables
1. staff_roles — custom roles with granular JSONB permissions
2. user_roles — junction linking users to roles
3. commercial_codes — promo/sales codes for commercial reps
4. staff_activity_log — login/logout/admin_action tracking
5. admin_audit_log — accountability trail for all admin actions

## Security
- RLS enabled on all tables
- Admins (is_admin=true) get full CRUD via EXISTS subquery checks
- Regular users can read their own activity logs only
*/

-- 1. staff_roles
CREATE TABLE IF NOT EXISTS staff_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text DEFAULT '',
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE staff_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_staff_roles" ON staff_roles;
CREATE POLICY "admin_read_staff_roles" ON staff_roles FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "admin_write_staff_roles" ON staff_roles;
CREATE POLICY "admin_write_staff_roles" ON staff_roles FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "admin_update_staff_roles" ON staff_roles;
CREATE POLICY "admin_update_staff_roles" ON staff_roles FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "admin_delete_staff_roles" ON staff_roles;
CREATE POLICY "admin_delete_staff_roles" ON staff_roles FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

INSERT INTO staff_roles (name, description, permissions, is_system) VALUES
  ('super_admin', 'Full platform access', '{"can_manage_users":true,"can_manage_staff":true,"can_manage_roles":true,"can_manage_codes":true,"can_grant_subscriptions":true,"can_modify_subscriptions":true,"can_view_reports":true,"can_view_audit_log":true,"can_manage_admins":true}', true),
  ('staff', 'Basic staff access', '{"can_view_reports":true}', true),
  ('commercial', 'Sales rep with codes', '{"can_manage_codes":true,"can_view_reports":true}', true)
ON CONFLICT (name) DO NOTHING;

-- 2. user_roles
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES staff_roles(id) ON DELETE CASCADE,
  assigned_by uuid,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role_id)
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_user_roles" ON user_roles;
CREATE POLICY "admin_read_user_roles" ON user_roles FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "admin_write_user_roles" ON user_roles;
CREATE POLICY "admin_write_user_roles" ON user_roles FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "admin_delete_user_roles" ON user_roles;
CREATE POLICY "admin_delete_user_roles" ON user_roles FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- 3. commercial_codes
CREATE TABLE IF NOT EXISTS commercial_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  label text DEFAULT '',
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  discount_type text NOT NULL DEFAULT 'free_trial',
  discount_value integer NOT NULL DEFAULT 7,
  max_uses integer,
  uses_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE commercial_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_codes" ON commercial_codes;
CREATE POLICY "admin_read_codes" ON commercial_codes FOR SELECT
  TO authenticated USING (assigned_to = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "admin_write_codes" ON commercial_codes;
CREATE POLICY "admin_write_codes" ON commercial_codes FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "admin_update_codes" ON commercial_codes;
CREATE POLICY "admin_update_codes" ON commercial_codes FOR UPDATE
  TO authenticated USING (assigned_to = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "admin_delete_codes" ON commercial_codes;
CREATE POLICY "admin_delete_codes" ON commercial_codes FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- 4. staff_activity_log
CREATE TABLE IF NOT EXISTS staff_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE staff_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_activity" ON staff_activity_log;
CREATE POLICY "admin_read_activity" ON staff_activity_log FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "self_log_activity" ON staff_activity_log;
CREATE POLICY "self_log_activity" ON staff_activity_log FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- 5. admin_audit_log
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_user_id uuid,
  target_resource text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_audit" ON admin_audit_log;
CREATE POLICY "admin_read_audit" ON admin_audit_log FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "admin_write_audit" ON admin_audit_log;
CREATE POLICY "admin_write_audit" ON admin_audit_log FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_commercial_codes_assigned ON commercial_codes(assigned_to);
CREATE INDEX IF NOT EXISTS idx_staff_activity_user ON staff_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_activity_created ON staff_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_log(created_at DESC);
