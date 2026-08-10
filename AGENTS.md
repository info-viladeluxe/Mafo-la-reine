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

## Conventions
- Profile `subscription_plan` valid values: `'free' | 'premium' | 'family' | 'premium_plus' | null` (NOT 'pro' — legacy).
- Edge functions use `createClient` with `SUPABASE_SERVICE_ROLE_KEY` for DB writes that bypass RLS (webhooks); anon key + `auth.getUser` for user-scoped checkout.
- TypeScript strict; `any` is linted as error. Catch blocks use `error: unknown` + `instanceof Error` narrowing.
