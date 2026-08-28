/*
# Add profiles.currency (user-editable display currency)

## Why
The Settings screen lets users change `country`, but the country value is
read-only in the frontend today and there's no `currency` preference at all.
Platform pricing/PSP amounts stay authoritative in the edge functions (USD
list prices, converted per-PSP as required — e.g. PayUnit converts to XAF
server-side). `profiles.currency` is purely a *display* preference for
formatting amounts in the UI; it must never be trusted as a source of truth
for what a user is charged.

## Changes
- `profiles.currency` (text, default 'USD') — ISO 4217 code, nullable-free
  with a sane default so existing rows aren't NULL.
- No RLS changes needed: `currency`, like `country`, is an ordinary
  (non-privileged) profile column, already covered by the existing
  `update_own_profile` policy. Only `is_admin` and `subscription_plan` are
  blocked from self-edit by the guard trigger — this column is untouched by
  that trigger and remains user-editable, which is what we want here.
*/

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD';
