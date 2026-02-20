-- Add reply array to requests table
-- Run with: psql $DATABASE_URL -f migrations/008_requests_reply.sql

ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS reply JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN requests.reply IS 'Array of reply messages (strings or objects).';
