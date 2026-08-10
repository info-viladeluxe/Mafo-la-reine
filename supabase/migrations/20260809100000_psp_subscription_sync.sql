/*
# PSP integration: profiles.subscription_plan + sync trigger

## Purpose
The frontend `Profile` type and SuperAdmin reference `profiles.subscription_plan`,
but no prior migration created that column. Without it, every admin operation
(plan change, grant, cancel, stats) fails with a Postgres "column does not exist"
error. This migration:

1. Adds `subscription_plan` (text, default 'free') to `profiles`.
2. Adds a helper column `updated_at` trigger-free: we instead add a SECURITY
   DEFINER function + trigger so `profiles.subscription_plan` stays in sync with
   the latest `subscriptions` row for that user. When a webhook activates /
   cancels a subscription, the profile plan is updated automatically — so the
   admin dashboard and settings reflect reality without extra client writes.

## Security
- The sync function is SECURITY DEFINER so the trigger (fired on
  authenticated-owned rows) can UPDATE profiles even though RLS would otherwise
  scope writes to the owner. It only ever updates the matching user_id, so it
  cannot escalate across tenants.
- No new RLS bypass for end users: the function is invoked by the DB, not the
  anon key.
*/

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_plan text NOT NULL DEFAULT 'free';

-- Ensure one subscription row per user so webhooks/checkout can upsert safely.
-- We keep the existing non-unique index and add a unique constraint; duplicate
-- legacy rows (if any) are collapsed to the most recent first.
DELETE FROM subscriptions
  WHERE id NOT IN (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
      FROM subscriptions
    ) s WHERE rn = 1
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_user_unique ON subscriptions (user_id);

-- Map a subscriptions.status to a profiles.subscription_plan value.
-- active/trialing/past_due => the plan_id; canceled/expired/none => free.
CREATE OR REPLACE FUNCTION private.subscription_plan_for(p_status text, p_plan text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_status IN ('active', 'trialing', 'past_due') THEN COALESCE(p_plan, 'premium')
    ELSE 'free'
  END;
$$;

-- Refresh profiles.subscription_plan from the latest subscriptions row.
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

  UPDATE profiles
  SET subscription_plan = private.subscription_plan_for(COALESCE(v_status, 'none'), v_plan),
      updated_at = now()
  WHERE id = v_uid;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS subscriptions_sync_profile ON subscriptions;
CREATE TRIGGER subscriptions_sync_profile
  AFTER INSERT OR UPDATE OR DELETE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION private.sync_profile_subscription_plan();

-- Backfill existing profiles from any existing subscription rows.
UPDATE profiles p
SET subscription_plan = sub.plan_id, updated_at = now()
FROM subscriptions sub
WHERE sub.user_id = p.id
  AND sub.status IN ('active', 'trialing', 'past_due')
  AND p.subscription_plan = 'free';
