-- Change users.accessibility from VARCHAR ('anyone'|'verified') to BOOLEAN (default false)
-- true = only verified senders, false = anyone
-- Run with: psql $DATABASE_URL -f migrations/005_accessibility_boolean.sql

-- Drop the CHECK constraint if it exists (from 002)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_accessibility_check;

-- Convert column: 'verified' -> true, anything else (including NULL) -> false, then set type and default
ALTER TABLE users
  ALTER COLUMN accessibility TYPE BOOLEAN
  USING (CASE WHEN accessibility::text = 'verified' THEN true ELSE false END);

ALTER TABLE users
  ALTER COLUMN accessibility SET DEFAULT false;

COMMENT ON COLUMN users.accessibility IS 'Who can send: true = only verified, false = anyone.';
