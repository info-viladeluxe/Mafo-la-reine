/*
# Create the missing `private` schema

## Bug
`20260809100000_psp_subscription_sync.sql` and `20260809120000_secure_
subscription_gate.sql` both create functions in a `private` schema
(`private.is_subscribed()`, `private.subscription_plan_for()`,
`private.sync_profile_subscription_plan()`, `private.guard_privileged_
profile_columns()`) and reference them from RLS policies and triggers —
but no migration ever ran `CREATE SCHEMA private`. On a fresh project
without that schema pre-existing, every migration from
`20260809100000` onward fails with `ERROR: 3F000: schema "private" does
not exist`, and — critically — the subscription gate (`start_trial`,
every feature-data RLS policy) never gets created at all.

This migration must run BEFORE those two (hence the timestamp
`20260809095959`, one second earlier than the first file that needs it).

## Grants
`private.is_subscribed()` is `SECURITY DEFINER`, but SECURITY DEFINER only
changes what the function's *body* executes as — the calling role still
needs USAGE on the schema and EXECUTE on the function to invoke it at all,
including indirectly via an RLS policy expression. Without these grants,
every SELECT/INSERT/UPDATE/DELETE on a gated table would fail with a
permission-denied error for ordinary `authenticated` users.
*/

CREATE SCHEMA IF NOT EXISTS private;

GRANT USAGE ON SCHEMA private TO authenticated, anon;

-- Function-level EXECUTE grants for private.is_subscribed() are added in
-- 20260809120000_secure_subscription_gate.sql, right after the function is
-- created, since it doesn't exist yet at this point in migration order.
