/*
# Create subscriptions table for Mafo

## Purpose
Tracks each user's subscription state: plan, billing cycle, trial, active status,
and payment provider. Drives the access gate (no free tier — without an active
subscription or trial, modules are blocked).

## New Tables
- `subscriptions`
  - `id` (uuid, PK)
  - `user_id` (uuid, NOT NULL, DEFAULT auth.uid(), FK to auth.users ON DELETE CASCADE) — owner/tenant
  - `plan_id` (text, NOT NULL) — 'premium' | 'family' | 'premium_plus'
  - `cycle` (text, NOT NULL) — 'monthly' | 'yearly'
  - `provider` (text, nullable) — 'stripe' | 'flutterwave'
  - `status` (text, NOT NULL, DEFAULT 'trialing') — 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired'
  - `trial_ends_at` (timestamptz, nullable) — when the 3-day trial ends
  - `current_period_end` (timestamptz, nullable) — end of the current billing period
  - `cancel_at_period_end` (boolean, DEFAULT false)
  - `stripe_customer_id` (text, nullable)
  - `stripe_subscription_id` (text, nullable)
  - `created_at` (timestamptz, DEFAULT now())
  - `updated_at` (timestamptz, DEFAULT now())

## Security
- RLS enabled on `subscriptions`.
- 4 owner-scoped policies (SELECT/INSERT/UPDATE/DELETE) restricted to `authenticated`,
  scoped via `auth.uid() = user_id`.

## Important Notes
1. A user gets a 'trialing' row on sign-up (created by the frontend after auth).
2. The gate checks `status IN ('trialing','active')` AND trial/period not ended.
3. Stripe/Flutterwave webhooks (future) will update status + period_end.
4. No `USING (true)` — every policy enforces real ownership.
*/

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id text NOT NULL,
  cycle text NOT NULL,
  provider text,
  status text NOT NULL DEFAULT 'trialing',
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions (user_id);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_subscription" ON subscriptions;
CREATE POLICY "select_own_subscription" ON subscriptions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_subscription" ON subscriptions;
CREATE POLICY "insert_own_subscription" ON subscriptions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_subscription" ON subscriptions;
CREATE POLICY "update_own_subscription" ON subscriptions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_subscription" ON subscriptions;
CREATE POLICY "delete_own_subscription" ON subscriptions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
