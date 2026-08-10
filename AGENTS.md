# Mafo — Repository Knowledge

## Stack
- Frontend: Vite + React + TypeScript, Tailwind, lucide-react
- Backend: Supabase (Postgres + Auth + Edge Functions)
- i18n: hand-rolled in `src/i18n/translations.ts` (fr + en); `TranslationKey` type is derived from the `fr` object's keys, so **adding a key requires adding it to both `fr` and `en`** or typecheck fails.

## Commands
- `npm run dev` — Vite dev server (port 12000 on work hosts)
- `npm run build` — production build (runs after typecheck)
- `npm run typecheck` — `tsc --noEmit -p tsconfig.app.json` (this is the gate; build does NOT typecheck)
- `npm run lint` — eslint, 0 errors expected (24 warnings are pre-existing fast-refresh/exhaustive-deps)

## Payments (PSP) — how it's wired
Two providers: **Stripe** and **Flutterwave**. Plan IDs: `premium | family | premium_plus`. Cycles: `monthly | yearly`.

### Frontend (`src/lib/payments.ts`)
- Provider availability is config-driven: set `VITE_STRIPE_ENABLED=true` / `VITE_FLUTTERWAVE_ENABLED=true` to show the provider card in `SubscriptionGate`.
- `startCheckout(providerId, params)` calls the matching edge function; does **not** pre-reject when unavailable — it lets the edge function return a clear 503 with guidance.
- `verifyFlutterwaveTransaction(txId, txRef)` calls the FLW webhook edge function (GET) to verify+activate after the browser redirect.

### Edge functions (`supabase/functions/`)
- `stripe-checkout` — accepts `{ plan_id, cycle, email, user_id, is_trial }`, maps plan→price via env `STRIPE_PRICE_<PLAN>_<CYCLE>`, builds success/cancel URLs (`/?checkout=success&provider=stripe`), upserts a pending `subscriptions` row, returns `{ url }`.
- `stripe-webhook` — verifies Stripe signature, syncs `stripe_subscriptions` **and** bridges into the `subscriptions` table via `syncMafoSubscription()` (this is what opens the app gate).
- `flutterwave-checkout` — creates a FLW payment, records a pending `subscriptions` row, redirect URL includes `transaction_id`/`tx_ref` for frontend verification.
- `flutterwave-webhook` — handles both server webhooks (POST) and browser redirect verification (GET `?transaction_id=...`); re-verifies with FLW `/transactions/:id/verify` and upserts `subscriptions` (active).

### Required secrets (set via `supabase secrets set`)
See `.env.example`. Frontend vars: `VITE_*`. Edge function secrets: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*` (6 price IDs), `FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_PUBLIC_KEY`.

### Database
- `profiles.subscription_plan` (text, default 'free') mirrors the latest `subscriptions` row via trigger `subscriptions_sync_profile` + `private.sync_profile_subscription_plan()` / `private.subscription_plan_for()`.
- `subscriptions` has a **unique constraint on `user_id`** (`idx_subscriptions_user_unique`) so checkout/webhooks can `upsert(..., { onConflict: 'user_id' })`.
- Migration `20260809100000_psp_subscription_sync.sql` adds the column, constraint, trigger, and functions (idempotent).

## Subscription gate — server-side enforcement (security critical)
Migration `20260809120000_secure_subscription_gate.sql` makes the paywall enforceable server-side, not just in the React frontend:

- **`private.is_subscribed()`** — returns true when `auth.uid()` has a subscription with `status IN ('active','trialing','past_due')` AND `trial_ends_at`/`current_period_end` (if set) are still in the future. All feature-data RLS policies (`cycle_entries`, `symptom_entries`, `journal_entries`, `medications`, `appointments`, `documents`, `ai_conversations`, `health_records`, `pregnancy_entries`) append `AND private.is_subscribed()` to SELECT/INSERT/UPDATE/DELETE — so an expired user gets **zero rows** and cannot write, even via direct REST API calls.
- **`subscriptions` is locked down** — users can only SELECT their own row; INSERT/UPDATE/DELETE are **admin-only** (`is_admin` check). Webhooks use the service_role key and bypass RLS, so PSP activation is unaffected. This blocks self-granting `status='active'` and the delete+re-trial loop.
- **`public.start_trial(p_plan, p_cycle)`** — SECURITY DEFINER RPC, the ONLY way a non-admin creates a subscription. Enforces **one trial per user ever** (rejects if any row exists). Frontend `SubscriptionContext.startTrial` calls this via `supabase.rpc('start_trial', ...)`. The RPC's 3-day trial length is hardcoded server-side.
- **`profiles` privileged columns protected** — a BEFORE UPDATE trigger (`private.guard_privileged_profile_columns()`) blocks non-admins from changing `is_admin` or `subscription_plan` (self-promotion / plan inflation). The internal sync trigger sets `app.mafo_system_sync` so its own updates are exempted. Admins can still update any profile.

**Never** add a feature-data table without gating it with `private.is_subscribed()`. **Never** give users direct INSERT/UPDATE/DELETE on `subscriptions` or on `profiles.is_admin`/`subscription_plan`.

## Supabase auto-pause prevention
Free-tier Supabase projects pause after 7 days of inactivity. A daily keepalive pings the DB:
- `supabase/functions/keepalive/index.ts` — edge function doing a trivial `head: true` SELECT (service_role). Deploy with `supabase functions deploy keepalive`.
- **GitHub Actions cron** — deploy `.github/workflows/keepalive.yml` (committed locally but NOT pushable with the current PAT, which lacks the `workflow` scope). Either push it with a token that has the `workflow` scope, or create the workflow manually in the repo UI, or use an external cron (cron-job.org, UptimeRobot) to POST once/day to `<SUPABASE_URL>/functions/v1/keepalive` with the anon key. Requires repo secrets `SUPABASE_URL` (or `VITE_SUPABASE_URL`) and `SUPABASE_ANON_KEY` (or `VITE_SUPABASE_ANON_KEY`). For production reliability, upgrade the Supabase project to the Pro plan (no auto-pause).

## Conventions
- Profile `subscription_plan` valid values: `'free' | 'premium' | 'family' | 'premium_plus' | null` (NOT 'pro' — legacy).
- Edge functions use `createClient` with `SUPABASE_SERVICE_ROLE_KEY` for DB writes that bypass RLS (webhooks); anon key + `auth.getUser` for user-scoped checkout.
- TypeScript strict; `any` is linted as error. Catch blocks use `error: unknown` + `instanceof Error` narrowing.
