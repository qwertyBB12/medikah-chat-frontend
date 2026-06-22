-- =====================================================
-- Phase 22 — Provider-agnostic Cue foundation
-- Migration 029: cue_feature_flags + cue_usage_daily + increment_cue_usage RPC
-- =====================================================
-- CUE-04a: Kill-switch flag store. The gate envelope (Plan 22-05) reads
--   cue_feature_flags WHERE key = 'cue:kill_switch' on EVERY request.
--   A NULL value (or missing row) = serving normally (default OFF).
--   value = 'soft' or 'hard' = tripped → gate returns 503 (fail-CLOSED per PATCH-02).
--   On ANY flag-store read error, the gate also fails CLOSED (PATCH-02 fix —
--   BeNeXT chat.ts:100-101 fails open; we do not).
--
-- CUE-06: Daily token-budget table + RPC. Keyed on physician_id (NOT
--   supabase_user_id — Medikah uses physician_id as the canonical identity
--   anchor per migration 027_identity_spine.sql). Physicians are NEVER charged.
--   Tiers gate model quality/quota only.
--
-- CUE-10: All objects are cue_-namespaced; they reside in Medikah's EXISTING
--   Supabase (not a separate project). The separation from BeNeXT is physical:
--   Medikah has its own Supabase project, its own token namespace, its own
--   cue_feature_flags. See .planning/cue-port/MIGRATION-NUMBERING-DECISION.md
--   for the full rationale.
--
-- Threat mitigations (T-22-02-01 through T-22-02-04):
--   cue_feature_flags: NO physician RLS policy — service_role/admin only.
--     Physicians CANNOT read, trip, or inspect the kill-switch.
--   cue_usage_daily: physicians may SELECT their OWN row (own-data-only,
--     scoped via 027 identity spine); INSERT/UPDATE/DELETE denied to physicians.
--     Only increment_cue_usage (SECURITY DEFINER, granted to service_role only)
--     writes this table.
--
-- RLS + UTC + GRANT pattern mirrors 025_workspace_activation.sql and
-- 027_identity_spine.sql exactly.
--
-- Migration number rationale: 029 is next-sequential after 028_session_revocation.
--   Phase 26's CERT-07 (029_credit_hours.sql) and INTEL-02 (030_cue_product_signals.sql)
--   were planner-reserved, but Cue ships BEFORE the credit path per Hector's order
--   (Phases 22–25 precede Phase 26). Those Phase-26 files SHIFT to 030/031 when written.
--   See .planning/cue-port/MIGRATION-NUMBERING-DECISION.md for the full record.
-- =====================================================

-- =====================================================
-- PART 1: cue_feature_flags (CUE-04a)
-- =====================================================
--
-- Lightweight key/value flag store. Only the kill-switch lives here in Phase 22.
-- Future flags (e.g. cue:maintenance_mode, cue:tool_use_enabled) follow the same
-- shape. value semantics: NULL = OFF (normal serving), 'soft' = tripped (graceful
-- degradation), 'hard' = tripped (hard stop).
--
-- Admin/service_role ONLY — physicians cannot read, insert, update, or delete.
-- This enforces T-22-02-01: no physician can flip the kill-switch.

CREATE TABLE IF NOT EXISTS cue_feature_flags (
  key        TEXT        PRIMARY KEY,

  -- NULL = OFF / not tripped (default). 'soft' | 'hard' = tripped.
  -- The gate reads this on every /cue request and fails CLOSED if tripped
  -- OR if the flag store is unreachable (PATCH-02).
  value      TEXT        NULL
               CHECK (value IS NULL OR value IN ('soft', 'hard')),

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index on key is covered by the primary key; no additional index needed.

ALTER TABLE cue_feature_flags ENABLE ROW LEVEL SECURITY;

-- Service role can SELECT flags (kill-switch gate reads on every request).
CREATE POLICY "Service role can select cue feature flags"
  ON cue_feature_flags
  FOR SELECT
  USING (auth.role() = 'service_role');

-- Service role can INSERT flags (initial seed, new flag registration).
CREATE POLICY "Service role can insert cue feature flags"
  ON cue_feature_flags
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Service role can UPDATE flags (trip / clear the kill-switch).
CREATE POLICY "Service role can update cue feature flags"
  ON cue_feature_flags
  FOR UPDATE
  USING (auth.role() = 'service_role');

-- NO DELETE policy — flags are never deleted (only nulled/updated).
-- NO physician SELECT policy — physicians have zero visibility into this table.

COMMENT ON TABLE cue_feature_flags IS
  'Phase 22 CUE-04a: Cue feature flags / kill-switch store. '
  'Keyed on a short text identifier (e.g. ''cue:kill_switch''). '
  'value=NULL means OFF (normal serving); ''soft''/''hard'' means tripped → gate returns 503. '
  'The gate (Plan 22-05) fails CLOSED on any read error (PATCH-02 fix). '
  'Service_role/admin only — physicians cannot read or trip this table (T-22-02-01). '
  'CUE-10: cue_-namespaced, Medikah''s own Supabase.';

COMMENT ON COLUMN cue_feature_flags.value IS
  'NULL = OFF (Cue is serving normally). '
  '''soft'' = kill-switch tripped, soft stop (graceful degradation, 503 returned). '
  '''hard'' = kill-switch tripped, hard stop (immediate 503 returned). '
  'The gate treats ANY non-NULL value as tripped.';

COMMENT ON COLUMN cue_feature_flags.updated_at IS
  'Last time this flag was modified. Automatically set to NOW() on insert. '
  'Update via a trigger or explicit SET updated_at=NOW() in the UPDATE statement.';

-- Seed the kill-switch flag row (value=NULL = OFF by default).
-- ON CONFLICT DO NOTHING makes this migration idempotent.
INSERT INTO cue_feature_flags (key, value)
VALUES ('cue:kill_switch', NULL)
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- PART 2: cue_usage_daily (CUE-06)
-- =====================================================
--
-- Per-physician per-day token counter. Keyed on (physician_id, usage_date).
-- Ported from BeNeXT budget.ts, adapted for Medikah:
--   - Key is physician_id (uuid FK to physicians.id), NOT supabase_user_id.
--     Medikah's canonical identity anchor is physician_id (027_identity_spine.sql).
--   - Date column uses the `date` type (UTC day boundary — Postgres stores no tz).
--   - Columns: input_tokens, output_tokens only (BeNeXT extras tts_chars /
--     stt_minutes / session_count are Phase 23+ scope; start minimal per CUE-10).
--
-- RLS: physicians may SELECT their OWN row (own-data-only via physician_id match).
-- INSERT/UPDATE/DELETE are denied to the physician role — only the
-- increment_cue_usage RPC (SECURITY DEFINER, service_role grant) writes this table.
-- This enforces T-22-02-02: physicians cannot inflate or zero their own usage.
--
-- Tier union (CUE-06): physician / trial.
-- Physicians are NEVER charged — tiers gate quality/quota only.
-- The tier column records the tier at time of usage for audit/analytics.

CREATE TABLE IF NOT EXISTS cue_usage_daily (
  -- FK to the canonical physician record (027 identity spine).
  -- On physician delete the usage rows are retained for audit (RESTRICT would
  -- block physician deletion; we use NO ACTION here — orphan rows are acceptable
  -- since usage rows are audit data, not live operational state).
  physician_id   UUID        NOT NULL REFERENCES physicians(id) ON DELETE NO ACTION,

  -- UTC day boundary (Postgres `date` type, no time component).
  -- The RPC always inserts CURRENT_DATE (UTC) so no client-supplied dates.
  usage_date     DATE        NOT NULL DEFAULT CURRENT_DATE,

  -- Token counters — bigint to avoid overflow on long-lived rows.
  input_tokens   BIGINT      NOT NULL DEFAULT 0,
  output_tokens  BIGINT      NOT NULL DEFAULT 0,

  -- Tier at time of usage (audit/analytics). NOT enforced here — the RPC writes
  -- it; the gate derives it from the physician record at request time.
  -- 'physician' is the standard tier; 'trial' for pre-activation access.
  tier           TEXT        NOT NULL DEFAULT 'physician'
                   CHECK (tier IN ('physician', 'trial')),

  -- Row creation timestamp for audit. Immutable (only INSERT sets it).
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Last increment timestamp (updated on every RPC call for this row).
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (physician_id, usage_date)
);

-- Index on physician_id for "all daily rows for this physician" queries.
CREATE INDEX IF NOT EXISTS idx_cud_physician_id
  ON cue_usage_daily(physician_id);

-- Index on usage_date for admin aggregate queries.
CREATE INDEX IF NOT EXISTS idx_cud_usage_date
  ON cue_usage_daily(usage_date);

ALTER TABLE cue_usage_daily ENABLE ROW LEVEL SECURITY;

-- Physicians may SELECT their OWN usage row (own-data-only).
-- Uses the 027 identity spine pattern: scope to auth.uid() via the
-- physician_workspace_accounts join is acceptable, but the simplest
-- and most direct route is to match against the physicians table FK.
-- Here we allow service_role OR the authenticated physician whose
-- supabase auth.uid() matches the physician record's auth_user_id.
-- The gate always reads via service_role (backend), so this policy
-- is primarily for future physician-facing budget display in the UI.
CREATE POLICY "Physicians can select own usage"
  ON cue_usage_daily
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR physician_id IN (
      SELECT id FROM physicians WHERE auth_user_id = auth.uid()
    )
  );

-- NO INSERT policy for authenticated role — only service_role (via SECURITY DEFINER RPC).
-- The RPC increment_cue_usage handles all writes atomically.

-- Service role INSERT (backup path — the RPC is SECURITY DEFINER, but service_role
-- direct access is preserved for admin/migration scripts).
CREATE POLICY "Service role can insert usage"
  ON cue_usage_daily
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Service role UPDATE (backup path — same rationale as INSERT above).
CREATE POLICY "Service role can update usage"
  ON cue_usage_daily
  FOR UPDATE
  USING (auth.role() = 'service_role');

-- NO DELETE policy — usage rows are append-only audit data (mirrors T-17-01-04 pattern).

COMMENT ON TABLE cue_usage_daily IS
  'Phase 22 CUE-06: per-physician per-day token usage counters. '
  'Keyed on (physician_id, usage_date) — physician_id is the 027 identity spine anchor. '
  'Physicians are NEVER charged; tiers gate quality/quota only. '
  'Written exclusively by the increment_cue_usage SECURITY DEFINER RPC (T-22-02-02). '
  'Physicians may SELECT their own row; INSERT/UPDATE/DELETE denied to physician role. '
  'CUE-10: cue_-namespaced, Medikah''s own Supabase. Port of BeNeXT budget.ts.';

COMMENT ON COLUMN cue_usage_daily.physician_id IS
  '027 identity spine FK. The canonical physician record for this usage row. '
  'Always derived from the verified session (CUE-11 — never from a client-supplied value).';

COMMENT ON COLUMN cue_usage_daily.usage_date IS
  'UTC day boundary (Postgres date type). The RPC writes CURRENT_DATE (UTC). '
  'Resets to 0 the following UTC day (a new row is inserted; the old row is retained).';

COMMENT ON COLUMN cue_usage_daily.input_tokens IS
  'Cumulative input (prompt) tokens consumed today by this physician. '
  'Incremented atomically by increment_cue_usage RPC.';

COMMENT ON COLUMN cue_usage_daily.output_tokens IS
  'Cumulative output (completion) tokens consumed today by this physician. '
  'Incremented atomically by increment_cue_usage RPC.';

COMMENT ON COLUMN cue_usage_daily.tier IS
  '''physician'' (standard tier) or ''trial'' (pre-activation access). '
  'Physicians are NEVER charged — this column is for audit/analytics only.';

-- =====================================================
-- PART 3: increment_cue_usage RPC (CUE-06)
-- =====================================================
--
-- Atomic upsert-and-increment into cue_usage_daily for CURRENT_DATE (UTC).
-- Called by the gate envelope (Plan 22-05) after each successful /cue response
-- with the actual token counts from the Anthropic API usage object.
--
-- SECURITY DEFINER: the function runs as the Postgres role that CREATED it
-- (supabase_admin / postgres), bypassing RLS for its own internal writes.
-- This is safe because:
--   1. The function is GRANTED to service_role only — anon/authenticated cannot
--      call it directly (T-22-02-02 + T-22-02-03 enforcement).
--   2. physician_id is supplied by the backend gate (session-derived, CUE-11);
--      the backend uses service_role key, which means the caller IS the service_role.
--   3. The function does NOT accept a date argument — always uses CURRENT_DATE (UTC),
--      so a caller cannot back-fill or alter historical rows.
--   4. Increments are additive only — there is no zero/override code path.
--
-- Tier parameter: the backend gate passes the physician's tier ('physician' | 'trial')
-- resolved from the physicians table at request time. The RPC records it for audit.
--
-- Returns: void (the gate does not need the new totals; a separate budget-check
--          call reads them for the pre-request quota enforcement).

CREATE OR REPLACE FUNCTION increment_cue_usage(
  p_physician_id  UUID,
  p_input         BIGINT,
  p_output        BIGINT,
  p_tier          TEXT    DEFAULT 'physician'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO cue_usage_daily (
    physician_id,
    usage_date,
    input_tokens,
    output_tokens,
    tier,
    created_at,
    updated_at
  )
  VALUES (
    p_physician_id,
    CURRENT_DATE,           -- always UTC day boundary; no client-supplied date
    COALESCE(p_input, 0),
    COALESCE(p_output, 0),
    COALESCE(p_tier, 'physician'),
    NOW(),
    NOW()
  )
  ON CONFLICT (physician_id, usage_date)
  DO UPDATE SET
    input_tokens  = cue_usage_daily.input_tokens  + COALESCE(EXCLUDED.input_tokens, 0),
    output_tokens = cue_usage_daily.output_tokens + COALESCE(EXCLUDED.output_tokens, 0),
    -- Preserve the tier from the first row of the day (do not overwrite mid-day).
    -- If a tier change is needed (e.g. trial → physician), a new calendar day will
    -- reflect the updated tier naturally.
    tier          = cue_usage_daily.tier,
    updated_at    = NOW();
END;
$$;

-- Revoke broad grants before issuing scoped ones (defense in depth).
REVOKE ALL ON FUNCTION increment_cue_usage(UUID, BIGINT, BIGINT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION increment_cue_usage(UUID, BIGINT, BIGINT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION increment_cue_usage(UUID, BIGINT, BIGINT, TEXT) FROM authenticated;

-- Grant to service_role ONLY (T-22-02-02 / T-22-02-03).
-- The backend gate holds the SUPABASE_SERVICE_ROLE_KEY and is the only caller.
GRANT EXECUTE ON FUNCTION increment_cue_usage(UUID, BIGINT, BIGINT, TEXT) TO service_role;

COMMENT ON FUNCTION increment_cue_usage IS
  'Phase 22 CUE-06: atomic upsert/increment into cue_usage_daily for CURRENT_DATE (UTC). '
  'SECURITY DEFINER — runs as postgres/supabase_admin to bypass RLS for the increment. '
  'GRANT to service_role ONLY (T-22-02-02/03). '
  'Never accepts a date argument (always uses CURRENT_DATE) to prevent back-filling. '
  'physician_id must be session-derived by the backend gate (CUE-11 — never from a '
  'client-supplied value). Increments are additive-only; no zero/override path exists.';
