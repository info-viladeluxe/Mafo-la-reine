/*
# Set specific users as admins

## Purpose
Grant Super Admin access to specific email addresses only.

## Security
- Only these 3 emails have is_admin = true.
- All other users remain is_admin = false.
- The frontend also checks email against an allowlist as a fallback.
*/

-- First, reset all admins to false (clean slate)
UPDATE profiles SET is_admin = false;

-- Promote only the authorized emails
UPDATE profiles
SET is_admin = true
WHERE email IN (
  'vincentnogue2@gmail.com',
  'vincentnogue@yahoo.com',
  'webdxb1@gmail.com'
);
