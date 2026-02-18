-- Add profile and availability fields to users
-- Run with: psql $DATABASE_URL -f migrations/002_user_profile_fields.sql
--
-- New columns:
--   link_slug      - public profile URL slug (unique)
--   display_name   - display name
--   timezone       - IANA timezone (e.g. America/New_York)
--   windows        - availability per day: Sun..Sat, each array of {start, end}
--   accessibility  - who can book: anyone | verified
--   verify_method  - method used for verification
--   rate_limit     - rate limit configuration (JSON object)

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS link_slug     VARCHAR(255) UNIQUE,
  ADD COLUMN IF NOT EXISTS display_name  VARCHAR(255),
  ADD COLUMN IF NOT EXISTS timezone      VARCHAR(63),
  ADD COLUMN IF NOT EXISTS windows       JSONB NOT NULL DEFAULT '{"Sun":[],"Mon":[],"Tue":[],"Wed":[],"Thu":[],"Fri":[],"Sat":[]}',
  ADD COLUMN IF NOT EXISTS accessibility VARCHAR(20) CHECK (accessibility IN ('anyone', 'verified')),
  ADD COLUMN IF NOT EXISTS verify_method VARCHAR(255),
  ADD COLUMN IF NOT EXISTS rate_limit    JSONB NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_users_link_slug ON users (link_slug) WHERE link_slug IS NOT NULL;

COMMENT ON COLUMN users.link_slug      IS 'Public profile URL slug.';
COMMENT ON COLUMN users.display_name   IS 'Display name.';
COMMENT ON COLUMN users.timezone       IS 'IANA timezone (e.g. America/New_York).';
COMMENT ON COLUMN users.windows        IS 'Availability per day: Sun..Sat, each array of {start, end} time slots.';
COMMENT ON COLUMN users.accessibility  IS 'Who can book: anyone | verified.';
COMMENT ON COLUMN users.verify_method IS 'Method used for verification.';
COMMENT ON COLUMN users.rate_limit    IS 'Rate limit configuration (flexible JSON).';
