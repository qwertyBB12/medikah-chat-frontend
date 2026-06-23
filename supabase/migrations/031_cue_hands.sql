-- =====================================================
-- Phase 23 — Slice-1 Hands: Voice Control of the Doctor's Own Calendar
-- Migration 031: cue_app_passwd_id column + cue_write_idempotency table
-- =====================================================
-- HANDS-01/08/09: physician_workspace_accounts gains a nullable
--   cue_app_passwd_id column that stores the Mailcow app-passwd ID (NOT the
--   secret value) for one-call revoke via DELETE /api/v1/delete/app-passwd.
--   NULL = no Cue credential minted yet (lazy-mint: issued on first hands use).
--
-- HANDS-04: cue_write_idempotency dedup ledger — a double-clicked or retried
--   "Confirm" in the UI must write exactly ONE block VEVENT.  The backend
--   checks this table before calling calendar_dav.block_time().  Holds NO PHI,
--   no secrets — only the action result (uid string, or {deleted,skipped}).
--
-- Migration numbering rationale:
--   029_cue_foundation.sql and 030_credit_hours.sql are applied to prod.
--   Phase 23 hands takes 031 (ships before Phase 26 INTEL).
--   INTEL-02 (formerly a candidate for 031) was re-numbered to 032 at source
--   in MIGRATION-NUMBERING-DECISION.md, REQUIREMENTS.md, and STATE.md (2026-06-23).
--   No future-planner hand-off needed — the collision is resolved at source.
--
-- Threat mitigations:
--   T-23-01-03: this migration is PURELY ADDITIVE — ADD COLUMN IF NOT EXISTS +
--     CREATE TABLE IF NOT EXISTS.  No existing column/table is altered or dropped.
--     The diff is designed to touch ONLY cue_app_passwd_id and cue_write_idempotency.
--   T-23-01-01: cue_app_passwd_id stores only the ID, never the secret value.
--
-- RLS pattern mirrors 029_cue_foundation.sql (service_role-only for sensitive
--   objects; physicians interact via the "Disconnect Cue" UI → DELETE /cue/credential).
-- =====================================================


-- =====================================================
-- PART 1: cue_app_passwd_id column on physician_workspace_accounts
-- =====================================================
--
-- physician_workspace_accounts already has service_role-only WRITE RLS from
-- 017_practikah.sql.  This column inherits that policy — no additional RLS
-- policy is needed for cue_app_passwd_id specifically.  The comment below
-- documents this explicitly so future reviewers do not add a redundant policy.
--
-- ADD COLUMN IF NOT EXISTS is idempotent — safe to re-run if the migration
-- was partially applied (matches the 025_workspace_activation.sql pattern).

ALTER TABLE physician_workspace_accounts
  ADD COLUMN IF NOT EXISTS cue_app_passwd_id TEXT NULL;

COMMENT ON COLUMN physician_workspace_accounts.cue_app_passwd_id IS
  'Phase 23 HANDS-01/09: Mailcow app-passwd ID for this physician''s Cue-scoped '
  'credential. NULL = no Cue credential has been minted yet (lazy-mint on first '
  'Cue hands use). NEVER stores the secret value — only the ID used as the payload '
  'for DELETE /api/v1/delete/app-passwd (one-call revoke, HANDS-09). '
  'Set on first Cue hands use; cleared to NULL on "Disconnect Cue" revoke. '
  'RLS: physician_workspace_accounts already has service_role-only write policy '
  'from 017_practikah.sql — this column inherits it; no additional policy needed. '
  'Physicians interact via the Disconnect Cue UI, which calls DELETE /cue/credential '
  'on the FastAPI backend (HANDS-09). The backend reads/writes via service_role key.';


-- =====================================================
-- PART 2: cue_write_idempotency table (HANDS-04 dedup ledger)
-- =====================================================
--
-- Stores the result of a Cue confirm-write operation (block_time or clear_range)
-- keyed on (physician_id, idempotency_token).  The frontend sends a unique token
-- per Confirm click; the backend checks for an existing row before calling the
-- CalDAV write.  A duplicate token = return the cached result_json immediately,
-- writing nothing to the calendar.
--
-- PRIMARY KEY is (physician_id, idempotency_token) — token is scoped PER physician.
-- A global PK (token alone) would allow one physician's token to collide with
-- another's (across-physician information leak risk); the composite PK eliminates
-- this.  The token is therefore only unique within a single physician's scope.
--
-- This table holds NO PHI and NO secrets:
--   result_json contains only the action result:
--     {uid: "<cue-uuid>"}     — for a successful block_time
--     {deleted: N, skipped: M} — for a successful clear_range
--   No patient names, no message bodies, no health data.
--
-- physicians.id is TEXT (see 027_identity_spine.sql), so FK is TEXT here too.

CREATE TABLE IF NOT EXISTS cue_write_idempotency (
  -- FK to the canonical physician record (027 identity spine).
  -- ON DELETE CASCADE: if the physician is deleted, their dedup rows go too.
  -- These are transient operation receipts, not audit data — cascade is correct.
  physician_id        TEXT        NOT NULL REFERENCES physicians(id) ON DELETE CASCADE,

  -- Client-supplied token (UUID recommended; validated at the route layer).
  -- Scoped per physician — not globally unique.
  idempotency_token   TEXT        NOT NULL,

  -- Cached result of the operation.  Shape:
  --   block_time:   {"uid": "<cue-uuid>"}
  --   clear_range:  {"deleted": N, "skipped": M}
  -- Never contains PHI, secrets, or message bodies.
  result_json         JSONB       NOT NULL,

  -- Server-assigned creation timestamp.  Rows may be pruned after a TTL
  -- (e.g. 24h) by a future maintenance job — created_at enables the WHERE clause.
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Composite PK: token is scoped per physician (never a global PK).
  PRIMARY KEY (physician_id, idempotency_token)
);

ALTER TABLE cue_write_idempotency ENABLE ROW LEVEL SECURITY;

-- Service role can SELECT (backend reads to check for existing result).
CREATE POLICY "Service role can select cue write idempotency"
  ON cue_write_idempotency
  FOR SELECT
  USING (auth.role() = 'service_role');

-- Service role can INSERT (backend writes the result after the first successful write).
CREATE POLICY "Service role can insert cue write idempotency"
  ON cue_write_idempotency
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- NO UPDATE policy — result_json is immutable once written (dedup ledger is append-only).
-- NO DELETE policy — rows are retained for TTL-based pruning by a future job.
-- NO physician SELECT policy — physicians have no direct visibility into this table.

COMMENT ON TABLE cue_write_idempotency IS
  'Phase 23 HANDS-04: Cue confirm-write dedup ledger. '
  'Keyed on (physician_id, idempotency_token) — token is physician-scoped, never global. '
  'The FastAPI backend checks this table before calling calendar_dav.block_time() or '
  'clear_range(); a duplicate token returns the cached result_json immediately, '
  'ensuring a double-clicked or retried Confirm writes exactly ONE VEVENT (D-03). '
  'result_json holds ONLY the action result (uid or {deleted,skipped}). '
  'NO PHI, NO secrets, NO message bodies. '
  'Service_role-only read/write (backend uses the service-role key). '
  'physicians have zero direct visibility (T-22-02-01 mirror for Cue objects). '
  'CUE-10: cue_-namespaced, Medikah''s own Supabase project.';

COMMENT ON COLUMN cue_write_idempotency.idempotency_token IS
  'Client-supplied unique token per Confirm click (UUID recommended). '
  'Scoped per physician_id — not globally unique across physicians. '
  'The composite PK enforces uniqueness within a single physician''s scope.';

COMMENT ON COLUMN cue_write_idempotency.result_json IS
  'Cached operation result. '
  'block_time:   {"uid": "<cue-<uuid>>"}. '
  'clear_range:  {"deleted": N, "skipped": M}. '
  'Never contains PHI, credentials, or message content. '
  'Immutable once written — no UPDATE policy exists on this table.';

COMMENT ON COLUMN cue_write_idempotency.created_at IS
  'Server-assigned write timestamp (UTC). '
  'Used as the TTL filter when a future maintenance job prunes old rows.';
