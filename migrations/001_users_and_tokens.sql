-- Users and tokens schema for local development
-- Run with: psql $DATABASE_URL -f migrations/001_users_and_tokens.sql
-- Or from container: docker compose exec db psql -U frontdoor -d frontdoor -f /path/to/001_users_and_tokens.sql
--
-- Minimal design you asked for (id + user):
--   CREATE TABLE users (
--     id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     "user" VARCHAR(255) NOT NULL UNIQUE  -- "user" is reserved in PostgreSQL, hence quotes
--   );
-- Below is the full schema with email + password_hash for auth and a tokens table.

-- User table
-- Note: "user" is reserved in PostgreSQL; we use "email" as the login identifier.
CREATE TABLE IF NOT EXISTS users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email          VARCHAR(255) NOT NULL UNIQUE,
  password_hash  VARCHAR(255) NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (LOWER(TRIM(email)));

COMMENT ON TABLE users IS 'App users; email is the login identifier.';
COMMENT ON COLUMN users.password_hash IS 'Bcrypt hash of the password.';

-- Token table (e.g. password reset tokens)
CREATE TABLE IF NOT EXISTS tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token      VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tokens_token ON tokens (token);
CREATE INDEX IF NOT EXISTS idx_tokens_expires_at ON tokens (expires_at);

COMMENT ON TABLE tokens IS 'Short-lived tokens (e.g. password reset).';
COMMENT ON COLUMN tokens.expires_at IS 'Token is valid only before this time.';
