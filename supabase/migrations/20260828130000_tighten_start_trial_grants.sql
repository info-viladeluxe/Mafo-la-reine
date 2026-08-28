/*
# Tighten start_trial() grants — remove implicit PUBLIC access

## Bug
`20260809120000_secure_subscription_gate.sql` does:
  REVOKE ALL ON FUNCTION public.start_trial(text, text) FROM anon, service_role;
  GRANT EXECUTE ON FUNCTION public.start_trial(text, text) TO authenticated;

...but never revokes from PUBLIC. In Postgres, PUBLIC is a pseudo-role
meaning "every role" — every function gets EXECUTE granted to PUBLIC by
default at creation time unless explicitly revoked. Since every real role
(including anon) implicitly inherits PUBLIC's privileges, the REVOKE ...
FROM anon above doesn't actually stop anon from calling the function: it
can still reach it through PUBLIC. Confirmed live via:
  SELECT grantee, privilege_type FROM information_schema.role_routine_grants
  WHERE routine_name = 'start_trial';
which returned PUBLIC / EXECUTE alongside authenticated / EXECUTE.

The function itself is not directly exploitable (it keys everything off
auth.uid(), which is null for anon — see the function body), but this is
still not least-privilege, so we close it explicitly rather than rely on
that being the only thing standing in the way.
*/

REVOKE EXECUTE ON FUNCTION public.start_trial(text, text) FROM PUBLIC;

-- Re-assert intent explicitly (idempotent, matches the original migration).
REVOKE ALL ON FUNCTION public.start_trial(text, text) FROM anon, service_role;
GRANT EXECUTE ON FUNCTION public.start_trial(text, text) TO authenticated;
