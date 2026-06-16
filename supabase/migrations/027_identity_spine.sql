-- =====================================================
-- Phase 18 — Bootstrap Identity Rationalization & Recovery
-- Migration 027: identity spine + recovery tokens + TOTP reset queue
-- =====================================================
-- Per D-07/D-08/D-09: one human = one canonical physician record.
-- physician_email_aliases: maps every bootstrap email to a canonical physician_id.
-- physician_recovery_tokens: signed single-use 30-min recovery magic-links (D-03).
-- physician_totp_resets: self-service lost-2FA request queue (D-06).
--
-- RLS posture: service_role-only INSERT + SELECT on all three tables.
-- physician_recovery_tokens and physician_totp_resets also allow service_role UPDATE
-- (consumed_at and status mutations). NO DELETE policy on any table (append-only audit
-- semantics per D-09, mirroring 025_workspace_activation.sql T-17-01-04 pattern).
--
-- D-11 dedup seed appended at the bottom of this file: collapses the founder's
-- three physician records into the canonical 7f8a308f binding via alias rows only.
-- The ghost physician rows are NOT deleted (they carry verified/audit history).
-- =====================================================

-- -----------------------------------------------------
-- PART 1: physician_email_aliases
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS physician_email_aliases (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The canonical physician record this alias belongs to.
  physician_id UUID        NOT NULL REFERENCES physicians(id),

  -- The alternate email (gmail, nxtglobal, benextglobal, etc.).
  -- UNIQUE enforces that each email maps to exactly one canonical record (D-09).
  email        TEXT        NOT NULL UNIQUE,

  -- Who created this mapping (e.g. 'system', 'migration-d11', 'admin').
  created_by   TEXT        NOT NULL DEFAULT 'system',

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index on physician_id for "all aliases for this physician" lookups.
CREATE INDEX IF NOT EXISTS idx_pea_physician_id
  ON physician_email_aliases(physician_id);

-- Index on email for O(log n) lookup in create.ts dedup guard (D-09 funneling).
CREATE INDEX IF NOT EXISTS idx_pea_email
  ON physician_email_aliases(email);

ALTER TABLE physician_email_aliases ENABLE ROW LEVEL SECURITY;

-- Only service_role can insert alias rows (API routes, migration scripts — never client).
CREATE POLICY "Service role can insert aliases"
  ON physician_email_aliases
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Only service_role can read alias rows.
CREATE POLICY "Service role can select aliases"
  ON physician_email_aliases
  FOR SELECT
  USING (auth.role() = 'service_role');

-- NO DELETE policy — alias rows are append-only (D-09 audit trail).
-- NO UPDATE policy — email funneling is immutable once established.

COMMENT ON TABLE physician_email_aliases IS 'Phase 18 D-09: maps a person''s alternate bootstrap emails (gmail, nxtglobal, benextglobal, etc.) to their ONE canonical physician record. Lookup in create.ts prevents ghost rows on re-registration with a different email. Append-only — no DELETE or UPDATE policy.';

COMMENT ON COLUMN physician_email_aliases.physician_id IS 'The canonical physician record that owns this email alias. All auth paths reaching this email should resolve to this physician_id (D-09 funneling).';

COMMENT ON COLUMN physician_email_aliases.email IS 'The alternate login email (bootstrap email). Must be UNIQUE across all aliases — each email belongs to exactly one canonical physician.';

COMMENT ON COLUMN physician_email_aliases.created_by IS 'Who created this alias row: ''system'', ''migration-d11'', or an admin email. Immutable — set on insert.';

-- -----------------------------------------------------
-- PART 2: physician_recovery_tokens
-- -----------------------------------------------------
-- Mirrors physician_activation_tokens shape exactly (025_workspace_activation.sql).
-- Single-use 30-minute tokens for the password-recovery magic-link flow (D-03).

CREATE TABLE IF NOT EXISTS physician_recovery_tokens (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign key to physicians.id — token is physician-scoped.
  physician_id UUID        NOT NULL REFERENCES physicians(id),

  -- SHA-256 hex digest of the raw JWT magic-link token.
  -- NEVER store the raw token here (mirrors T-17-01-04).
  token_hash   TEXT        NOT NULL UNIQUE,

  -- Server-assigned expiry: 30 minutes from generation (D-03).
  expires_at   TIMESTAMPTZ NOT NULL,

  -- Null until consumed. Set at the START of the set-password step
  -- (mirrors Pitfall 4 from activation: consume before Mailcow API call).
  consumed_at  TIMESTAMPTZ NULL,

  -- Server-assigned creation timestamp. Immutable.
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index on physician_id for "does this physician have an active recovery token?" lookups.
CREATE INDEX IF NOT EXISTS idx_prt_physician_id
  ON physician_recovery_tokens(physician_id);

-- Index on token_hash for O(log n) lookup during recovery verify step.
CREATE INDEX IF NOT EXISTS idx_prt_token_hash
  ON physician_recovery_tokens(token_hash);

ALTER TABLE physician_recovery_tokens ENABLE ROW LEVEL SECURITY;

-- Service role can INSERT recovery tokens (request-link flow).
CREATE POLICY "Service role can insert recovery tokens"
  ON physician_recovery_tokens
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Service role can SELECT recovery tokens (set-password verify step).
CREATE POLICY "Service role can select recovery tokens"
  ON physician_recovery_tokens
  FOR SELECT
  USING (auth.role() = 'service_role');

-- Service role can UPDATE recovery tokens (mark consumed_at — mirrors Pitfall 4).
-- This is the ONLY mutation allowed; no DELETE policy exists.
CREATE POLICY "Service role can update recovery tokens"
  ON physician_recovery_tokens
  FOR UPDATE
  USING (auth.role() = 'service_role');

-- NO DELETE policy — append-only audit trail (mirrors T-17-01-04).

COMMENT ON TABLE physician_recovery_tokens IS 'Phase 18 D-03: single-use 30-minute recovery magic-link tokens. Mirrors physician_activation_tokens shape. token_hash is SHA-256 of the raw JWT — raw token never stored. consumed_at is set at the START of the set-password step. Append-only — no DELETE policy.';

COMMENT ON COLUMN physician_recovery_tokens.token_hash IS 'SHA-256 of the raw single-use recovery JWT. NEVER store the raw token. See lib/auth/recoveryTokens.ts hashToken().';

COMMENT ON COLUMN physician_recovery_tokens.consumed_at IS 'Set on first use — D-03 single-use enforcement. Marked at the START of set-password before the Mailcow API call (mirrors Pitfall 4). NULL means the token has not been used yet.';

COMMENT ON COLUMN physician_recovery_tokens.expires_at IS '30-minute expiry from generation. The set-password route checks: consumed_at IS NULL AND expires_at > NOW().';

-- -----------------------------------------------------
-- PART 3: physician_totp_resets
-- -----------------------------------------------------
-- Self-service lost-2FA request queue (D-06).
-- Append-only: requests are filed; admin approves/denies; no rows deleted.

CREATE TABLE IF NOT EXISTS physician_totp_resets (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The physician who filed the lost-2FA request.
  physician_id  UUID        NOT NULL REFERENCES physicians(id),

  -- Lifecycle state. CHECK constraint enforces valid transitions.
  status        TEXT        NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'approved', 'denied')),

  -- When the physician filed the request.
  requested_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Admin email who approved or denied (populated on status change).
  actioned_by   TEXT        NULL,

  -- When the admin took action.
  actioned_at   TIMESTAMPTZ NULL
);

-- Composite index on (status, physician_id) for admin queue queries
-- ("show me all pending requests") and physician-scoped lookups.
CREATE INDEX IF NOT EXISTS idx_ptr_status_physician
  ON physician_totp_resets(status, physician_id);

ALTER TABLE physician_totp_resets ENABLE ROW LEVEL SECURITY;

-- Service role can INSERT reset requests (lost-2fa-request.ts route).
CREATE POLICY "Service role can insert totp resets"
  ON physician_totp_resets
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Service role can SELECT reset requests (admin queue + totp-reset-approve.ts).
CREATE POLICY "Service role can select totp resets"
  ON physician_totp_resets
  FOR SELECT
  USING (auth.role() = 'service_role');

-- Service role can UPDATE reset requests (mark approved/denied + actioned_by/at).
CREATE POLICY "Service role can update totp resets"
  ON physician_totp_resets
  FOR UPDATE
  USING (auth.role() = 'service_role');

-- NO DELETE policy — lost-2FA requests are an immutable audit trail (D-06).

COMMENT ON TABLE physician_totp_resets IS 'Phase 18 D-06: self-service lost-2FA request queue. A physician files a request; an admin approves/denies it. Approval clears totp_enrolled+totp_secret in physician_workspace_accounts so re-enrollment happens on next login. Append-only — no DELETE policy. Human-in-the-loop approval is the security guarantee (D-06).';

COMMENT ON COLUMN physician_totp_resets.status IS 'Lifecycle state: pending (filed, awaiting admin action) → approved (TOTP enrollment cleared) or denied (request rejected). Updated only by admin via totp-reset-approve.ts.';

COMMENT ON COLUMN physician_totp_resets.actioned_by IS 'Admin email who approved or denied. Populated when status transitions from pending. NULL on insert.';

COMMENT ON COLUMN physician_totp_resets.actioned_at IS 'Timestamp of the admin action. NULL until the request is resolved.';

-- =====================================================
-- D-11: One-time founder dedup seed
-- =====================================================
-- Canonical physician record: 7f8a308f-e753-4d54-bfe9-19f430ac3a89 (hhlopez@gmail.com)
--   → owns hector@medikah.health mailbox + re-keyed TOTP enrollment
--   → activation_complete = true in physician_workspace_accounts
--
-- Ghost physician records (NOT deleted — they carry verified/audit history):
--   7f0b88a2-649f-43f2-9425-9abe59654086 (hector@benextglobal.com, verified, no mailbox)
--   884ce7f9-ea05-4403-b9c6-992703e99f1c (hector@nxtglobal.org, pending, no mailbox)
--
-- This seed maps both ghost bootstrap emails to the canonical 7f8a308f record via
-- alias rows. After this migration, create.ts D-09 funneling will route any
-- registration attempt with hector@benextglobal.com or hector@nxtglobal.org to
-- the canonical record (resolvedViaAlias: true), preventing additional ghost rows.
--
-- The 7f8a308f mailbox/TOTP binding is NEVER modified here. The ghost physician
-- rows remain intact. A full merge console is explicitly deferred (D-11 — not
-- enough duplicate volume pre-CDMX to justify engineering cost; one-time migration
-- is sufficient for the known cases).
-- =====================================================

INSERT INTO physician_email_aliases (physician_id, email, created_by)
VALUES
  ('7f8a308f-e753-4d54-bfe9-19f430ac3a89', 'hector@benextglobal.com', 'migration-d11'),
  ('7f8a308f-e753-4d54-bfe9-19f430ac3a89', 'hector@nxtglobal.org',    'migration-d11')
ON CONFLICT (email) DO NOTHING;

-- NOTE: The ghost physician rows (7f0b88a2 and 884ce7f9) are intentionally NOT
-- deleted by this migration. They carry verification status and audit history.
-- The physician_email_aliases table is the forward guard. Any future merge of
-- the ghost rows into the canonical record is deferred to a dedicated merge
-- console (D-11). The canonical 7f8a308f mailbox + TOTP enrollment are untouched.
