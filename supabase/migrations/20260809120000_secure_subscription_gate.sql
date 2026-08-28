/*
# Secure subscription gate (server-side enforcement)

## Problem
Previously the subscription gate was enforced ONLY in the React frontend
(SubscriptionContext.hasAccess). That is trivially bypassable: a user with a
valid auth session can call the Supabase REST API directly (with their anon +
JWT) and read/write ALL their feature data (cycle_entries, journal_entries,
medications, appointments, documents, ai_conversations, health_records,
pregnancy_entries, symptom_entries) regardless of subscription status.

Worse, the `subscriptions` and `profiles` RLS policies let any authenticated
user INSERT/UPDATE their own rows with arbitrary values — so a user could:
  - set subscriptions.status = 'active', current_period_end = '2099-01-01'
    (self-grant permanent paid access)
  - delete their subscription row then start a fresh trial (infinite trials)
  - set profiles.is_admin = true (self-promote to SuperAdmin)
  - set profiles.subscription_plan = 'premium_plus'

This migration closes every one of those holes server-side, so the gate holds
even when the frontend is bypassed entirely.

## Changes
1. `private.is_subscribed()` — SQL function returning whether the calling user
   has a currently-valid subscription (active/trialing/past_due AND not expired).
2. All feature data tables: append `AND private.is_subscribed()` to every
   SELECT/INSERT/UPDATE/DELETE policy. Expired/free users get zero rows and
   cannot write.
3. `subscriptions`: remove user INSERT/UPDATE/DELETE. Keep SELECT (own or
   admin). Only admins (is_admin) and the service_role (webhooks, bypasses RLS)
   can mutate. Trials are started via the new `public.start_trial()` RPC.
4. `public.start_trial(plan_id, cycle)` — SECURITY DEFINER RPC. Inserts a
   trialing row ONLY if the user has no existing subscription row, preventing
   infinite trials. Returns the new row.
5. `profiles`: split user vs admin update scope. Users may only update
   non-privileged columns (onboarding, lang, cycle data, etc.); is_admin and
   subscription_plan are writable only by admins. Achieved with two UPDATE
   policies + column-level protection via a trigger that rejects privileged
   writes from non-admins.

## Security
- SECURITY DEFINER functions run as the database owner and contain their own
  authorization logic; they never expose unscoped mutations.
- The service_role key (used by Stripe/Flutterwave webhooks and edge functions)
  bypasses RLS entirely, so PSP activation is unaffected.
- No USING(true) shortcuts added anywhere.
*/

-- ============================================================================
-- 1. Subscription status helper (used by every feature-data RLS policy)
-- ============================================================================
-- Returns true when auth.uid() has a subscription whose status grants access
-- AND whose trial/period end (if set) is still in the future.
CREATE OR REPLACE FUNCTION private.is_subscribed()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1
    FROM subscriptions
    WHERE user_id = auth.uid()
      AND status IN ('active', 'trialing', 'past_due')
      AND (trial_ends_at IS NULL OR trial_ends_at > now())
      AND (current_period_end IS NULL OR current_period_end > now())
  );
$$;

-- SECURITY DEFINER changes what the function body runs as, not who may call
-- it — every role that queries a gated table (via RLS) needs EXECUTE here.
GRANT EXECUTE ON FUNCTION private.is_subscribed() TO authenticated, anon;

-- ============================================================================
-- 2. Gate every feature-data table with private.is_subscribed()
-- ============================================================================
-- We DROP the existing owner-scoped policies and recreate them with the added
-- subscription check on USING (reads) and WITH CHECK (writes). This means an
-- expired user receives an empty result set and any insert/update/delete is
-- rejected — even via direct API calls.

-- helper to (re)define the 4 policies for a gated table
DO $$
DECLARE
  t text;
  tbls text[] := ARRAY[
    'cycle_entries','symptom_entries','journal_entries','medications',
    'appointments','documents','ai_conversations','health_records',
    'pregnancy_entries'
  ];
  sel_name text; ins_name text; upd_name text; del_name text;
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    sel_name := 'select_own_' || t;
    ins_name := 'insert_own_' || t;
    upd_name := 'update_own_' || t;
    del_name := 'delete_own_' || t;

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', sel_name, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', ins_name, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', upd_name, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', del_name, t);

    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT TO authenticated
       USING (auth.uid() = user_id AND private.is_subscribed())', sel_name, t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR INSERT TO authenticated
       WITH CHECK (auth.uid() = user_id AND private.is_subscribed())', ins_name, t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR UPDATE TO authenticated
       USING (auth.uid() = user_id AND private.is_subscribed())
       WITH CHECK (auth.uid() = user_id AND private.is_subscribed())', upd_name, t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR DELETE TO authenticated
       USING (auth.uid() = user_id AND private.is_subscribed())', del_name, t);
  END LOOP;
END $$;

-- ============================================================================
-- 3. Lock down `subscriptions` — users can only SELECT, never mutate
-- ============================================================================
-- Admins (is_admin) may INSERT/UPDATE/DELETE (SuperAdmin dashboard).
-- Webhooks use the service_role key and bypass RLS, so they are unaffected.
DROP POLICY IF EXISTS "select_own_subscription" ON subscriptions;
DROP POLICY IF EXISTS "insert_own_subscription" ON subscriptions;
DROP POLICY IF EXISTS "update_own_subscription" ON subscriptions;
DROP POLICY IF EXISTS "delete_own_subscription" ON subscriptions;

CREATE POLICY "select_subscription" ON subscriptions FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "admin_insert_subscription" ON subscriptions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "admin_update_subscription" ON subscriptions FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "admin_delete_subscription" ON subscriptions FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================================================
-- 4. start_trial RPC — the ONLY way a non-admin user can create a subscription
-- ============================================================================
-- SECURITY DEFINER so it can INSERT into subscriptions despite the admin-only
-- INSERT policy. It enforces "one trial per user ever": if a row already
-- exists (active, trialing, canceled, expired, anything) the call is rejected.
-- This prevents the infinite-trial bypass (delete + re-trial) because users
-- can no longer DELETE their row.
CREATE OR REPLACE FUNCTION public.start_trial(p_plan text, p_cycle text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  existing_count int;
  trial_ends timestamptz := now() + interval '3 days';
  new_row subscriptions;
BEGIN
  IF p_plan NOT IN ('premium', 'family', 'premium_plus') THEN
    RETURN json_build_object('error', 'invalid_plan');
  END IF;
  IF p_cycle NOT IN ('monthly', 'yearly') THEN
    RETURN json_build_object('error', 'invalid_cycle');
  END IF;

  SELECT count(*) INTO existing_count
  FROM subscriptions WHERE user_id = auth.uid();

  IF existing_count > 0 THEN
    RETURN json_build_object('error', 'trial_already_used');
  END IF;

  INSERT INTO subscriptions (user_id, plan_id, cycle, status, trial_ends_at)
  VALUES (auth.uid(), p_plan, p_cycle, 'trialing', trial_ends)
  RETURNING * INTO new_row;

  RETURN json_build_object('data', row_to_json(new_row));
END;
$$;

REVOKE ALL ON FUNCTION public.start_trial(text, text) FROM anon, service_role;
GRANT EXECUTE ON FUNCTION public.start_trial(text, text) TO authenticated;

-- ============================================================================
-- 5. Protect profiles privileged columns (is_admin, subscription_plan)
-- ============================================================================
-- The existing `update_own_profile` policy lets a user set ANY column on their
-- own row. We replace it with a policy that still lets users update ordinary
-- profile fields, but a BEFORE UPDATE trigger rejects any attempt by a
-- non-admin to change is_admin or subscription_plan.

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins may update any profile (including privileged columns).
DROP POLICY IF EXISTS "admin_update_profile" ON profiles;
CREATE POLICY "admin_update_profile" ON profiles FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true));

-- Trigger: block non-admins from touching is_admin / subscription_plan.
-- A user upserting { id, is_admin: true } will raise an exception here.
-- The internal sync_profile_subscription_plan() trigger also updates
-- subscription_plan; to avoid a chicken-and-egg block we use a session
-- variable that the sync function sets before its UPDATE.
CREATE OR REPLACE FUNCTION private.guard_privileged_profile_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  caller_is_admin boolean;
  system_sync boolean;
BEGIN
  SELECT COALESCE((
    SELECT is_admin FROM profiles WHERE id = auth.uid()
  ), false) INTO caller_is_admin;
  system_sync := current_setting('app.mafo_system_sync', true) = 'on';

  IF NOT caller_is_admin AND NOT system_sync THEN
    IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
      RAISE EXCEPTION 'Not allowed to modify is_admin' USING ERRCODE = '42501';
    END IF;
    IF NEW.subscription_plan IS DISTINCT FROM OLD.subscription_plan THEN
      RAISE EXCEPTION 'Not allowed to modify subscription_plan' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_privileged ON profiles;
-- Only enforce on UPDATE (INSERT defaults false/'free are safe and must not
-- block sign-up, where OLD is null and the distinct-from-null check would
-- otherwise reject the default values).
CREATE TRIGGER profiles_guard_privileged
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION private.guard_privileged_profile_columns();

-- Mark the existing sync function as a system operation so its profile UPDATE
-- is not blocked by the guard above.
CREATE OR REPLACE FUNCTION private.sync_profile_subscription_plan()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_uid uuid := COALESCE(NEW.user_id, OLD.user_id);
  v_plan text;
  v_status text;
BEGIN
  SELECT plan_id, status INTO v_plan, v_status
  FROM subscriptions
  WHERE user_id = v_uid
  ORDER BY created_at DESC
  LIMIT 1;

  PERFORM set_config('app.mafo_system_sync', 'on', true);
  UPDATE profiles
  SET subscription_plan = private.subscription_plan_for(COALESCE(v_status, 'none'), v_plan),
      updated_at = now()
  WHERE id = v_uid;

  RETURN COALESCE(NEW, OLD);
END;
$$;
