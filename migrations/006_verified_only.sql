-- Replace users.accessibility with users.verified_only (boolean, default false)
-- Run with: psql $DATABASE_URL -f migrations/006_verified_only.sql

-- Add new column with default
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS verified_only BOOLEAN NOT NULL DEFAULT false;

-- Migrate existing accessibility: true -> verified_only true, else false
UPDATE users
SET verified_only = COALESCE(accessibility, false)
WHERE accessibility IS NOT NULL;

-- Drop old column
ALTER TABLE users DROP COLUMN IF EXISTS accessibility;

COMMENT ON COLUMN users.verified_only IS 'If true, only verified senders can reach this user.';
