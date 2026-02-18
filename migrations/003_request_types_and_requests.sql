-- Request types and requests tables
-- Run with: psql $DATABASE_URL -f migrations/003_request_types_and_requests.sql
--
-- request_types: id, type (label)
-- requests: id, from (email), to (user id), type (request_type id), received, is_verified, message, attachment

-- Request types lookup table
CREATE TABLE IF NOT EXISTS request_types (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(255) NOT NULL UNIQUE
);

COMMENT ON TABLE request_types IS 'Types of requests (e.g. meeting, call).';
COMMENT ON COLUMN request_types.type IS 'Human-readable type label.';

-- Requests table
-- "from" and "to" are reserved in PostgreSQL; quoted identifiers used.
CREATE TABLE IF NOT EXISTS requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "from"      VARCHAR(255) NOT NULL,
  "to"        UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  type        UUID NOT NULL REFERENCES request_types (id) ON DELETE RESTRICT,
  received    TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_verified BOOLEAN NOT NULL DEFAULT false,
  message     TEXT,
  attachment  TEXT
);

CREATE INDEX IF NOT EXISTS idx_requests_to ON requests ("to");
CREATE INDEX IF NOT EXISTS idx_requests_from ON requests ("from");
CREATE INDEX IF NOT EXISTS idx_requests_type ON requests (type);
CREATE INDEX IF NOT EXISTS idx_requests_received ON requests (received);

COMMENT ON TABLE requests IS 'Incoming requests (e.g. booking requests).';
COMMENT ON COLUMN requests."from" IS 'Sender email address (not user id).';
COMMENT ON COLUMN requests."to" IS 'Recipient user id.';
COMMENT ON COLUMN requests.type IS 'Request type id from request_types.';
COMMENT ON COLUMN requests.received IS 'When the request was received.';
COMMENT ON COLUMN requests.is_verified IS 'Whether the sender was verified.';
COMMENT ON COLUMN requests.message IS 'Request message body.';
COMMENT ON COLUMN requests.attachment IS 'Attachment reference or path.';
