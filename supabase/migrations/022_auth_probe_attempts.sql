-- =====================================================
-- Phase 16 — Mailcow Auth Foundation
-- Migration 022: auth_probe_attempts (rate-limit ledger)
-- =====================================================
-- Per D-04: append-only ledger of every Mailcow IMAP probe attempt,
-- written BEFORE identity resolution. This is the source of truth for
-- the lockout query (D-05: ≥3 non-success outcomes from the same
-- source_ip within the last 5 minutes triggers the locked generic
-- error). NO physician_id column — rows are written before the email
-- is known to map to a physician (D-11). This is intentional schema
-- asymmetry vs workspace_audit_log per 16-PATTERNS.md note 3.
--
-- Append-only RLS: service_role INSERT + SELECT only. No UPDATE, no
-- DELETE policies; RLS denies by default. Mirrors the
-- practikah_provisioning_log shape from 017_practikah.sql PART 4
-- (lines 285-360).
--
-- Retention: 30 days. Post-launch archive job (deferred to Phase 17
-- or later) will purge rows older than 30 days; until then the table
-- grows unbounded but the (source_ip, attempted_at DESC) index keeps
-- the lockout query O(log n).
-- =====================================================

CREATE TABLE IF NOT EXISTS auth_probe_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- D-08: source IP captured from x-nf-client-connection-ip ->
  -- x-forwarded-for[0] -> socket.remoteAddress. Nullable because
  -- the header chain may be empty in edge / test environments.
  source_ip INET NULL,

  -- The email value submitted by the client. Nullable because the
  -- probe is logged even when the credentials object is missing the
  -- email field (unknown_user / bad_password outcomes).
  attempted_email TEXT NULL,

  -- D-07: outcome enumeration. CHECK constraint enforces the closed
  -- set so misspellings or new values cannot leak in without an
  -- explicit migration.
  outcome TEXT NOT NULL CHECK (outcome IN (
    'success',
    'bad_password',
    'unknown_user',
    'locked_out',
    'infra_error'
  )),

  user_agent TEXT NULL,

  -- Server-assigned timestamp. Immutable (no UPDATE policy).
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Per Discretion: the only runtime query path is
-- "give me failures from (source_ip, last 5 min)" so we index
-- (source_ip, attempted_at DESC) to keep the lockout check O(log n).
CREATE INDEX IF NOT EXISTS idx_auth_probe_attempts_source_ip_attempted_at
  ON auth_probe_attempts(source_ip, attempted_at DESC);

ALTER TABLE auth_probe_attempts ENABLE ROW LEVEL SECURITY;

-- Service role can INSERT only — append-only ledger.
-- Even service_role cannot UPDATE or DELETE because no matching
-- policy exists for those verbs and RLS denies by default. This is
-- the same append-only guarantee used by practikah_provisioning_log.
CREATE POLICY "Service role can insert auth probe attempts"
  ON auth_probe_attempts
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can select auth probe attempts"
  ON auth_probe_attempts
  FOR SELECT
  USING (auth.role() = 'service_role');

-- NO UPDATE policy — RLS denies
-- NO DELETE policy — RLS denies
-- These omissions are the append-only contract per T-16-01.

COMMENT ON TABLE auth_probe_attempts IS 'Phase 16 D-04: rate-limit / lockout ledger for Mailcow IMAP authorize() probes. Append-only. 30-day retention via post-launch archive job. NO physician_id — rows are written before identity resolution (see 16-PATTERNS.md note 3). Index (source_ip, attempted_at DESC) backs the 5-minute lockout query.';
COMMENT ON COLUMN auth_probe_attempts.outcome IS 'D-07 closed enum: success | bad_password | unknown_user | locked_out | infra_error. CHECK-constrained at the schema level.';
COMMENT ON COLUMN auth_probe_attempts.source_ip IS 'D-08: client IP captured server-side from x-nf-client-connection-ip first, then x-forwarded-for[0], then socket.remoteAddress. Nullable when no leg of the chain yields a value.';
