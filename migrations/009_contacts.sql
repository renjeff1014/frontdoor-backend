-- Contacts table: per-user contact list
-- Run with: psql $DATABASE_URL -f migrations/009_contacts.sql

CREATE TABLE IF NOT EXISTS contacts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name       VARCHAR(255) NOT NULL,
  email      VARCHAR(255),
  phone      VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contacts_owner_id ON contacts (owner_id);

COMMENT ON TABLE contacts IS 'User-owned contacts (name, email, phone).';
COMMENT ON COLUMN contacts.owner_id IS 'User who owns this contact (users.id).';
