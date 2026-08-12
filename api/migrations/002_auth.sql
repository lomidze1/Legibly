-- Legibly API — Phase 2 (Figma OAuth).
-- Apply with:  psql "$DATABASE_URL" -f migrations/002_auth.sql
-- Idempotent: safe to re-run.

-- The plugin polls for a token *and* its expiry, so the hand-off row has to
-- carry both. `expires_at` is how long the hand-off itself stays collectable
-- (5 minutes); `token_expires_at` is the life of the token inside it (30 days).
ALTER TABLE pending_auth ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ NOT NULL;

-- The CSRF state, parked between the redirect to Figma and the callback.
-- It has to survive the round trip on a different serverless instance, so it
-- cannot live in memory either.
CREATE TABLE IF NOT EXISTS oauth_states (
  state        TEXT PRIMARY KEY,
  plugin_nonce TEXT NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS oauth_states_expires_at_idx ON oauth_states (expires_at);
