/*
# Fix missing ON DELETE CASCADE on stripe_customers.user_id

## Bug
Every other user-scoped table's `user_id` FK to `auth.users(id)` has
`ON DELETE CASCADE` — this one (from the original Stripe integration
migration) doesn't. Deleting an auth user who has ever paid via Stripe
would fail with a foreign-key-violation error instead of cascading,
which matters now that account deletion is actually implemented (see the
delete-account edge function) rather than being a fake "sign out"
button.

Postgres auto-names an unnamed column FK as `<table>_<column>_fkey`, so
that's the constraint being dropped and recreated here.
*/

ALTER TABLE stripe_customers DROP CONSTRAINT IF EXISTS stripe_customers_user_id_fkey;
ALTER TABLE stripe_customers
  ADD CONSTRAINT stripe_customers_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
