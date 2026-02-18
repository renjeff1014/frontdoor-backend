-- Seed request_types with default values
-- Run with: psql $DATABASE_URL -f migrations/004_seed_request_types.sql

INSERT INTO request_types (type) VALUES
  ('Quick question'),
  ('Need a decision'),
  ('Schedule time'),
  ('FYI / info'),
  ('Emergency')
ON CONFLICT (type) DO NOTHING;
