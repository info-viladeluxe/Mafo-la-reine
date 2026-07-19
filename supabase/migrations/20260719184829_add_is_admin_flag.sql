/*
# Add is_admin flag to profiles

## Purpose
Enables a Super Admin dashboard. Only profiles with is_admin = true can access admin features.

## Security
- is_admin defaults to false for all existing and new users.
- RLS policies on all tables already scope by user_id; admin reads use the service role via edge functions (not the anon client).
- No policy changes needed here — admin access is enforced in the frontend + future edge function.
*/

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- Promote the first registered user to admin (bootstrap)
UPDATE profiles SET is_admin = true
WHERE id = (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1)
AND NOT EXISTS (SELECT 1 FROM profiles WHERE is_admin = true);
