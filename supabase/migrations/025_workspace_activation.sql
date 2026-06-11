-- =====================================================
-- Phase 17 — Workspace Activation Flow
-- Migration 025: physician_activation_tokens + totp/activation columns
-- =====================================================
-- Per D-01: single-use tokens for workspace activation magic-link.
-- Append-only RLS: service_role INSERT + SELECT + UPDATE (consumed_at mark).
-- No DELETE policy — append-only audit trail per T-17-01-04.
--
-- Also adds the four activation-gate columns to physician_workspace_accounts:
--   mailbox_password_set — already exists from 017_practikah.sql (ADD COLUMN IF NOT EXISTS is a no-op)
--   totp_enrolled        — new in this migration
--   totp_secret          — new in this migration (AES-256-GCM ciphertext only)
--   activation_complete  — new in this migration (D-01 atomic gate)
--
-- Pattern: mirrors 022_auth_probe_attempts.sql (append-only RLS, COMMENT ON).
-- =====================================================

-- -----------------------------------------------------
-- PART 1: physician_activation_tokens
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS physician_activation_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign key to physicians.id — token is physician-scoped.
  physician_id UUID NOT NULL REFERENCES physicians(id),

  -- SHA-256 hex digest of the raw JWT magic-link token.
  -- NEVER store the raw token here.
  token_hash   TEXT NOT NULL UNIQUE,

  -- Server-assigned expiry: 30 minutes from generation (D-01).
  expires_at   TIMESTAMPTZ NOT NULL,

  -- Null until consumed. Set at the START of the set-password step
  -- (Pitfall 4: consume before calling Mailcow API, not after).
  consumed_at  TIMESTAMPTZ NULL,

  -- Server-assigned creation timestamp. Immutable (no UPDATE needed for this column).
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index on physician_id for lookups like "does this physician have an active token?"
CREATE INDEX IF NOT EXISTS idx_pat_physician_id
  ON physician_activation_tokens(physician_id);

-- Index on token_hash for O(log n) lookup during activation verify step.
CREATE INDEX IF NOT EXISTS idx_pat_token_hash
  ON physician_activation_tokens(token_hash);

ALTER TABLE physician_activation_tokens ENABLE ROW LEVEL SECURITY;

-- Service role can INSERT activation tokens (send-link flow).
CREATE POLICY "Service role can insert activation tokens"
  ON physician_activation_tokens
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Service role can SELECT activation tokens (verify-token flow).
CREATE POLICY "Service role can select activation tokens"
  ON physician_activation_tokens
  FOR SELECT
  USING (auth.role() = 'service_role');

-- Service role can UPDATE activation tokens (mark consumed_at — Pitfall 4).
-- This is the ONLY mutation allowed on this table; no DELETE policy exists.
CREATE POLICY "Service role can update activation tokens"
  ON physician_activation_tokens
  FOR UPDATE
  USING (auth.role() = 'service_role');

-- NO DELETE policy — append-only audit trail (T-17-01-04).

COMMENT ON TABLE physician_activation_tokens IS 'Phase 17 D-01: single-use magic-link tokens for workspace activation. Append-only. token_hash is SHA-256 of the raw JWT — the raw token is never stored here. consumed_at is set at the START of the password-set step (Pitfall 4). No DELETE policy — immutable audit trail.';

COMMENT ON COLUMN physician_activation_tokens.token_hash IS 'SHA-256 of the raw single-use JWT. NEVER store the raw token. See lib/auth/activationTokens.ts hashToken().';

COMMENT ON COLUMN physician_activation_tokens.consumed_at IS 'Set on first use — D-01 single-use enforcement. Marked at the START of set-password, before the Mailcow API call (Pitfall 4). NULL means the token has not been used yet.';

COMMENT ON COLUMN physician_activation_tokens.expires_at IS '30-minute expiry from generation. Downstream verify-token route checks: consumed_at IS NULL AND expires_at > NOW().';

-- -----------------------------------------------------
-- PART 2: Activation-gate columns on physician_workspace_accounts
-- -----------------------------------------------------
-- ADD COLUMN IF NOT EXISTS is idempotent — safe to run on a DB where some
-- of these already exist from a prior migration.
--
-- mailbox_password_set already exists in 017_practikah.sql — this ADD COLUMN
-- will be a no-op. The others are new in this migration.

ALTER TABLE physician_workspace_accounts
  ADD COLUMN IF NOT EXISTS mailbox_password_set BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS totp_enrolled        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS totp_secret          TEXT    NULL,
  ADD COLUMN IF NOT EXISTS activation_complete  BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN physician_workspace_accounts.totp_secret IS 'AES-256-GCM ciphertext of the TOTP secret — NEVER store plaintext. Encrypted with TOTP_ENCRYPTION_KEY Netlify env var. NULL until TOTP enrollment is confirmed (totp_enrolled = true). See lib/auth/activationTokens.ts.';

COMMENT ON COLUMN physician_workspace_accounts.totp_enrolled IS 'True once the physician has verified a TOTP code during activation. D-01: must be true alongside mailbox_password_set before activation_complete can be set.';

COMMENT ON COLUMN physician_workspace_accounts.activation_complete IS 'D-01 atomic gate: set to true ONLY when both mailbox_password_set AND totp_enrolled are true. The mailcowImapAuthorize() gate checks this column — a false value routes to infra_error and sends the physician back to the activation page.';

COMMENT ON COLUMN physician_workspace_accounts.mailbox_password_set IS 'True once the physician has set their Mailcow mailbox password via the activation flow (POST /api/auth/activate/set-password). Already existed from 017_practikah.sql — column definition here is a no-op ADD COLUMN IF NOT EXISTS.';
