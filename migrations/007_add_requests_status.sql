-- Add status object to requests table
-- Run with: psql $DATABASE_URL -f migrations/007_add_requests_status.sql
--
-- status: { received, inreply, replied, closed } — all booleans, default false

ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS status JSONB NOT NULL DEFAULT '{"received":false,"inreply":false,"replied":false,"closed":false}'::jsonb;

COMMENT ON COLUMN requests.status IS 'Request lifecycle: received, inreply, replied, closed (all booleans).';
