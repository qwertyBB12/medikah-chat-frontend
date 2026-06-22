-- =====================================================
-- Phase 26 — CONACEM-native credit / certification model
-- Migration 030: physician_credit_logs + physician_certification_progress +
--                physician_credit_summary VIEW + award_credit RPC +
--                award_cdmx_attendance RPC
-- =====================================================
-- CERT-01: physician_credit_logs — immutable credit ledger. pass_flag gates
--   whether a row counts toward any total (CERT-03). All writes via RPC /
--   service_role only — physicians READ their own ledger, never write (CERT-04).
--
-- CERT-02: physician_certification_progress — per-physician running total +
--   target (~40 credit-hours for first certificate). aval_issuer / co_issuer
--   scaffolded for future CMGO co-issue; no workflow built here (CERT-02).
--   certificate_level is cumulative (stackable) per CERT-06 design decision.
--
-- CERT-03: physician_credit_summary VIEW — enforces the pass-assessment gate.
--   total_credit_hours = SUM(credit_hours) FILTER (WHERE pass_flag). The gate
--   lives here and in the award path, NEVER in the UI.
--
-- CERT-04: award_credit RPC — SECURITY DEFINER, service_role ONLY. Inserts a
--   credit_logs row and upserts certification_progress.total_credit_hours.
--   Physicians CANNOT call this function (REVOKE from public/anon/authenticated).
--
-- CERT-05: award_cdmx_attendance RPC — calls award_credit with CDMX-attendance
--   params. IDEMPOTENT: a partial unique index on physician_credit_logs guards
--   against double-awards; a second call returns the existing row, no double-count.
--
-- HAB-03: physician_credit_summary VIEW (data layer for the credits gauge and the
--   summary view; bySource aggregation also pass-gated).
--
-- RLS + UTC + GRANT pattern mirrors 029_cue_foundation.sql exactly:
--   - Physicians may SELECT their OWN rows (via 027 identity spine auth_user_id join).
--   - INSERT / UPDATE / DELETE denied to physician role on both tables.
--   - RPCs are SECURITY DEFINER; REVOKE ALL from public/anon/authenticated;
--     GRANT EXECUTE to service_role ONLY.
--
-- CONACEM note: 1 punto = 1 hora académica. Rates are computed at award time by
--   the caller — NOT hardcoded in the table. The migration enforces the data shape;
--   business-rule rate math belongs in the awarding service.
--
-- Migration number: 030 (next-sequential after 029_cue_foundation.sql).
--   CERT-07 originally reserved 029 for this migration; Cue took 029 per Hector's
--   override (see .planning/cue-port/MIGRATION-NUMBERING-DECISION.md).
-- =====================================================

-- =====================================================
-- PART 1: physician_credit_logs (CERT-01)
-- =====================================================
--
-- Immutable credit-award ledger. Each row represents ONE award event.
-- Physicians read their own rows (filtered to pass_flag=true in the summary
-- view); no physician can write any row. All writes are via RPC or direct
-- service_role call (e.g. admin scripts, future batch imports).
--
-- Key design choices:
--   - raw_hours / puntos: nullable because some sources (e.g. online modules)
--     may not have a distinct raw-hour / punto concept. credit_hours is the
--     normalized unit and is always required.
--   - 1 punto = 1 hora: callers must compute this equivalence before calling
--     award_credit. The table stores the values as provided; rate logic is
--     external.
--   - pass_flag: the GATE. A row with pass_flag=false does NOT count toward
--     any total in physician_credit_summary. Only a service_role caller sets
--     this; physicians cannot self-assert a pass.
--   - verified: secondary flag for cross-referencing against a third-party
--     registry (e.g. CONACEM database). Defaults false; set true after
--     external verification. Scaffolded for future automation; no workflow here.
--   - awarded_at: the authoritative timestamp of the credit-granting event
--     (e.g. CDMX event date). created_at is the DB insertion timestamp and
--     may differ from awarded_at for retroactive grants.
--
-- Append-only by policy (no DELETE policy, no UPDATE policy for physicians).

CREATE TABLE IF NOT EXISTS physician_credit_logs (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- FK to the canonical physician record (027 identity spine).
  -- ON DELETE NO ACTION: credit rows are audit data; retain even if the
  -- physician record is somehow removed (mirrors cue_usage_daily pattern).
  physician_id   UUID        NOT NULL REFERENCES physicians(id) ON DELETE NO ACTION,

  -- Source identifier (human-readable slug).
  -- Examples: 'cdmx-attendance', 'online-module', 'congress-2026',
  --           'peer-reviewed-publication', 'live-patient-care'.
  -- No foreign-key constraint — sources are not pre-registered (open set).
  source         TEXT        NOT NULL,

  -- Raw input from the certifying body. Nullable because not all award paths
  -- have a distinct raw-hour field separate from credit_hours.
  raw_hours      NUMERIC     NULL,

  -- CONACEM puntos awarded. Nullable for same reason as raw_hours.
  -- 1 punto = 1 hora académica — computed by the awarding service.
  puntos         NUMERIC     NULL,

  -- The normalized credit-hour count that feeds into totals.
  -- This is the canonical value. Callers must set this correctly.
  credit_hours   NUMERIC     NOT NULL,

  -- Pass-assessment gate (CERT-03).
  -- TRUE: this row counts toward totals in physician_credit_summary.
  -- FALSE: the row is recorded (for audit/dispute) but excluded from totals.
  -- Only service_role callers set this — physicians cannot self-attest a pass.
  pass_flag      BOOLEAN     NOT NULL DEFAULT false,

  -- Human-readable label for the activity that generated this credit.
  -- E.g. 'CDMX inaugural attendance', 'Cardiology update module Q1 2026'.
  activity       TEXT        NULL,

  -- Whether this row has been cross-referenced against the CONACEM registry.
  -- Defaults false. Future automation will set this via a verification job.
  verified       BOOLEAN     NOT NULL DEFAULT false,

  -- Authoritative timestamp of the credit-granting event (UTC).
  -- May differ from created_at for retroactive grants (e.g. day-of-event awards).
  awarded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- DB insertion timestamp (UTC). Immutable.
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common access patterns.

-- "All credit rows for this physician" (physician_credit_summary aggregation).
CREATE INDEX IF NOT EXISTS idx_pcl_physician_id
  ON physician_credit_logs(physician_id);

-- "All pass_flag=true rows for a physician" (filtered totals).
CREATE INDEX IF NOT EXISTS idx_pcl_physician_pass
  ON physician_credit_logs(physician_id, pass_flag);

-- "All awards from a given source" (admin reporting / CDMX idempotency check).
CREATE INDEX IF NOT EXISTS idx_pcl_source
  ON physician_credit_logs(source);

-- -------------------------------------------------------
-- CERT-05 idempotency guard for CDMX attendance award.
-- A physician may receive the cdmx-attendance award EXACTLY ONCE.
-- A second call to award_cdmx_attendance is a no-op (existence check in RPC).
-- -------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_pcl_cdmx_attendance_per_physician
  ON physician_credit_logs(physician_id)
  WHERE source = 'cdmx-attendance';

ALTER TABLE physician_credit_logs ENABLE ROW LEVEL SECURITY;

-- Physicians may SELECT their OWN credit log rows.
-- Uses the 027 identity spine: match auth.uid() → physicians.auth_user_id → physician_id.
-- Service_role reads all rows (for admin queries and RPC internals).
CREATE POLICY "Physicians can select own credit logs"
  ON physician_credit_logs
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR physician_id IN (
      SELECT id FROM physicians WHERE auth_user_id = auth.uid()
    )
  );

-- Service role direct INSERT (admin scripts, migration back-fills).
-- Normal path is the award_credit SECURITY DEFINER RPC.
CREATE POLICY "Service role can insert credit logs"
  ON physician_credit_logs
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- NO UPDATE policy — credit log rows are immutable once written (CERT-04 audit integrity).
-- NO DELETE policy — ledger is append-only (credential-fraud surface: deletions would erase evidence).

COMMENT ON TABLE physician_credit_logs IS
  'Phase 26 CERT-01: immutable credit-award ledger. One row per credit event. '
  'pass_flag=true rows count toward totals (CERT-03 gate). Append-only — no UPDATE/DELETE. '
  'All writes via award_credit RPC (service_role ONLY) or direct service_role access. '
  'Physicians SELECT their own rows; no physician INSERT/UPDATE/DELETE. '
  '1 punto = 1 hora académica (CONACEM); rates computed at award time by the caller. '
  'award_cdmx_attendance is idempotent via uq_pcl_cdmx_attendance_per_physician (CERT-05).';

COMMENT ON COLUMN physician_credit_logs.physician_id IS
  '027 identity spine FK. Always derived from the verified physician record; '
  'never accepted from a client-supplied value.';

COMMENT ON COLUMN physician_credit_logs.source IS
  'Human-readable source slug. E.g. ''cdmx-attendance'', ''online-module'', '
  '''congress-2026''. The partial unique index on (physician_id) WHERE source=''cdmx-attendance'' '
  'enforces idempotency for the CDMX award (CERT-05).';

COMMENT ON COLUMN physician_credit_logs.raw_hours IS
  'Raw input from the certifying body. Nullable — not all award paths distinguish '
  'raw hours from credit hours. CONACEM: raw_hours = wall-clock activity time.';

COMMENT ON COLUMN physician_credit_logs.puntos IS
  'CONACEM puntos awarded. 1 punto = 1 hora académica. '
  'Computed by the awarding service before calling award_credit; not enforced here.';

COMMENT ON COLUMN physician_credit_logs.credit_hours IS
  'Normalized credit-hour count. This is the canonical value that feeds totals. '
  'For the CDMX inaugural award: 4.0.';

COMMENT ON COLUMN physician_credit_logs.pass_flag IS
  'TRUE = this row counts toward totals in physician_credit_summary (CERT-03 gate). '
  'FALSE = recorded for audit but excluded from all totals. '
  'Set ONLY by service_role callers — physicians cannot self-assert a pass.';

COMMENT ON COLUMN physician_credit_logs.verified IS
  'Whether cross-referenced against the CONACEM registry. Defaults false. '
  'Scaffolded for a future verification job; no automated workflow in Phase 26.';

COMMENT ON COLUMN physician_credit_logs.awarded_at IS
  'Authoritative timestamp of the credit-granting event (UTC). '
  'May differ from created_at for retroactive grants. For CDMX: event date.';

COMMENT ON COLUMN physician_credit_logs.created_at IS
  'DB insertion timestamp (UTC). Immutable — set on INSERT, never updated.';

-- =====================================================
-- PART 2: physician_certification_progress (CERT-02)
-- =====================================================
--
-- One row per physician. Accumulates total_credit_hours (pass_flag=true rows only)
-- and tracks certificate_state + certificate_level.
--
-- certificate_level uses a STACKABLE / CUMULATIVE model (CERT-06 design decision):
--   level increments as additional thresholds are crossed; it is NOT reset per cycle.
--   This allows multi-year cumulative recognition without losing prior credit.
--
-- aval_issuer / co_issuer: columns scaffolded for future CMGO co-issue (CERT-02
--   scope note: "columns only, no workflow"). These are present so the schema does
--   not need a migration later; they remain NULL until the co-issue workflow ships.
--
-- target: defaults to 40 (the first-certificate threshold per REQUIREMENTS.md CERT-05
--   note: "~40 credit-hours"). This is ~16% of a 5-year CONACEM 250-punto recert cycle.
--   Admins can update the target per-physician for different specialty requirements.
--
-- certificate_state transitions (enforced via CHECK, automated by award_credit RPC):
--   in_progress → eligible (when total_credit_hours >= target)
--   eligible    → issued   (when the certificate is formally issued — manual or automated)

CREATE TABLE IF NOT EXISTS physician_certification_progress (
  -- One row per physician. physician_id is both PK and FK.
  physician_id        UUID        PRIMARY KEY REFERENCES physicians(id) ON DELETE NO ACTION,

  -- Running total of pass_flag=true credit hours.
  -- Updated by award_credit RPC on every qualifying award.
  total_credit_hours  NUMERIC     NOT NULL DEFAULT 0,

  -- First-certificate target. Defaults 40 (CONACEM ~40 credit-hours for initial cert).
  -- Can be updated per-physician for specialty-specific requirements.
  target              NUMERIC     NOT NULL DEFAULT 40,

  -- Certificate lifecycle state.
  certificate_state   TEXT        NOT NULL DEFAULT 'in_progress'
                        CHECK (certificate_state IN ('in_progress', 'eligible', 'issued')),

  -- Cumulative certificate level (CERT-06 stackable model).
  -- 0 = no certificate yet. 1 = first certificate reached. 2 = second threshold crossed, etc.
  -- The award_credit RPC bumps this when a threshold is crossed.
  certificate_level   INT         NOT NULL DEFAULT 0,

  -- Certifying organization. Defaults to CONACEM (the CDMX launch issuer).
  -- Scaffolded for future CMGO co-issue — may become a different issuer per specialty.
  aval_issuer         TEXT        NULL,

  -- Co-issuing organization (e.g. CMGO for OB/GYN board co-certification).
  -- NULL until the co-issue workflow ships. Column present to avoid a later migration.
  co_issuer           TEXT        NULL,

  -- Last time this row was updated (UTC). Updated by award_credit on every call.
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index on certificate_state for admin queue queries
-- ("show me all physicians eligible for a certificate").
CREATE INDEX IF NOT EXISTS idx_pcp_certificate_state
  ON physician_certification_progress(certificate_state);

ALTER TABLE physician_certification_progress ENABLE ROW LEVEL SECURITY;

-- Physicians may SELECT their OWN progress row.
CREATE POLICY "Physicians can select own certification progress"
  ON physician_certification_progress
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR physician_id IN (
      SELECT id FROM physicians WHERE auth_user_id = auth.uid()
    )
  );

-- Service role direct INSERT (used by award_credit RPC on first-award upsert,
-- and by migration back-fills if needed).
CREATE POLICY "Service role can insert certification progress"
  ON physician_certification_progress
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Service role UPDATE (used by award_credit RPC to bump total_credit_hours,
-- certificate_state, certificate_level, and updated_at).
CREATE POLICY "Service role can update certification progress"
  ON physician_certification_progress
  FOR UPDATE
  USING (auth.role() = 'service_role');

-- NO DELETE policy — certification progress is an audit record (CERT-04).

COMMENT ON TABLE physician_certification_progress IS
  'Phase 26 CERT-02: per-physician running total of pass_flag=true credit hours '
  'and certificate lifecycle state. One row per physician (physician_id is PK). '
  'Updated atomically by award_credit RPC on every qualifying award. '
  'certificate_state: in_progress → eligible → issued. '
  'certificate_level: stackable/cumulative (CERT-06 design decision). '
  'aval_issuer / co_issuer: scaffolded for CMGO co-issue — columns only, no workflow. '
  'target defaults to 40 (CONACEM first-cert threshold per CERT-05). '
  'Physicians SELECT own row; no physician INSERT/UPDATE/DELETE.';

COMMENT ON COLUMN physician_certification_progress.total_credit_hours IS
  'Running total of credit_hours from physician_credit_logs WHERE pass_flag=true. '
  'Updated atomically by award_credit RPC. CERT-03 gate: only pass_flag rows count.';

COMMENT ON COLUMN physician_certification_progress.target IS
  'Credit-hour target for the next certificate. Defaults 40 (CONACEM first-cert). '
  'Can be updated per-physician for specialty-specific requirements (admin only).';

COMMENT ON COLUMN physician_certification_progress.certificate_state IS
  'Lifecycle state: in_progress (not yet at target), eligible (reached target, '
  'certificate not yet issued), issued (formally issued). '
  'award_credit advances to eligible when total_credit_hours >= target.';

COMMENT ON COLUMN physician_certification_progress.certificate_level IS
  'Cumulative stack level (CERT-06). 0 = no cert yet. Bumped by award_credit '
  'each time a new threshold is crossed. Never reset — cumulative model.';

COMMENT ON COLUMN physician_certification_progress.aval_issuer IS
  'Certifying body issuing the aval. NULL defaults to CONACEM for the CDMX launch. '
  'Scaffolded for future specialty board customization.';

COMMENT ON COLUMN physician_certification_progress.co_issuer IS
  'Co-issuing organization (e.g. CMGO for OB/GYN). NULL until co-issue workflow ships. '
  'Column present to avoid a future schema migration (CERT-02 scaffolding).';

-- =====================================================
-- PART 3: physician_credit_summary VIEW (HAB-03 + CERT-03)
-- =====================================================
--
-- Per-physician summary of pass_flag=true credit rows ONLY (CERT-03 gate).
-- This is the data layer for:
--   - The credits gauge UI (HAB-02 / HAB-03 — deferred to the rest of Phase 26).
--   - The admin endpoint summary (immediately useful for CDMX verification).
--   - Any physician-facing summary (future dashboard section per HAB-06).
--
-- The FILTER clause (WHERE pass_flag) is the authoritative pass-gate enforcement.
-- UI components MUST read from this view (or lib/credits.ts which reads this view);
-- they must NOT sum physician_credit_logs directly (which would bypass the gate).
--
-- bySource: JSONB aggregation keyed by source slug, also pass_flag-filtered.
-- Example: '{"cdmx-attendance": 4, "online-module": 2}'
-- The UI uses this for the per-source breakdown in the gauge.

CREATE OR REPLACE VIEW physician_credit_summary AS
SELECT
  p.id                                              AS physician_id,

  -- Total pass_flag=true credit hours (CERT-03 gate enforced here).
  COALESCE(
    SUM(pcl.credit_hours) FILTER (WHERE pcl.pass_flag),
    0
  )                                                 AS total_credit_hours,

  -- Pass_flag=true credits aggregated by source slug (HAB-03 bySource).
  -- NULL-safe: returns '{}' when no pass_flag rows exist.
  COALESCE(
    jsonb_object_agg(
      pcl.source,
      source_totals.hours
    ) FILTER (WHERE pcl.pass_flag AND source_totals.hours IS NOT NULL),
    '{}'::jsonb
  )                                                 AS by_source,

  -- Count of distinct pass_flag=true award events.
  COUNT(pcl.id) FILTER (WHERE pcl.pass_flag)       AS pass_award_count,

  -- Most recent awarded_at across all pass_flag=true rows (NULL if none).
  MAX(pcl.awarded_at) FILTER (WHERE pcl.pass_flag) AS last_awarded_at,

  -- Certification progress columns (denormalized for convenience).
  COALESCE(pcp.target, 40)                         AS target,
  COALESCE(pcp.certificate_state, 'in_progress')   AS certificate_state,
  COALESCE(pcp.certificate_level, 0)               AS certificate_level,
  pcp.aval_issuer,
  pcp.co_issuer

FROM
  physicians p
  LEFT JOIN physician_credit_logs pcl
    ON pcl.physician_id = p.id
  LEFT JOIN LATERAL (
    -- Per-source pass_flag totals (used in by_source aggregation above).
    SELECT
      pcl2.source,
      SUM(pcl2.credit_hours) AS hours
    FROM physician_credit_logs pcl2
    WHERE pcl2.physician_id = p.id
      AND pcl2.pass_flag
    GROUP BY pcl2.source
  ) source_totals ON source_totals.source = pcl.source
  LEFT JOIN physician_certification_progress pcp
    ON pcp.physician_id = p.id

GROUP BY
  p.id,
  pcp.target,
  pcp.certificate_state,
  pcp.certificate_level,
  pcp.aval_issuer,
  pcp.co_issuer;

COMMENT ON VIEW physician_credit_summary IS
  'Phase 26 HAB-03 + CERT-03: per-physician credit summary. '
  'total_credit_hours = SUM(credit_hours) FILTER (WHERE pass_flag) — '
  'the CERT-03 pass-assessment gate lives HERE, not in the UI. '
  'by_source = JSONB aggregation of pass_flag=true credits keyed by source slug. '
  'Includes certification_progress columns for convenience (target, state, level). '
  'UI components MUST read from this view, never sum physician_credit_logs directly.';

-- =====================================================
-- PART 4: award_credit RPC (CERT-04)
-- =====================================================
--
-- The canonical credit-award path. SECURITY DEFINER so it can write both
-- physician_credit_logs and physician_certification_progress while running
-- under postgres-owner privileges (bypassing RLS for its own writes).
--
-- GRANT to service_role ONLY — mirrors increment_cue_usage exactly (029).
-- Physicians CANNOT call this function.
--
-- What it does atomically:
--   1. INSERT a new physician_credit_logs row.
--   2. UPSERT physician_certification_progress: if a row exists, add
--      p_credit_hours to total_credit_hours and bump certificate_state to
--      'eligible' if the new total meets or exceeds target.
--      If no row exists, create one with total_credit_hours = p_credit_hours.
--   3. Bump certificate_level when crossing a threshold (CERT-06 stackable model).
--      Threshold = multiples of target (40, 80, 120, ...).
--
-- Parameters:
--   p_physician_id  uuid     — physician to award (must exist in physicians table)
--   p_source        text     — source slug (e.g. 'cdmx-attendance')
--   p_credit_hours  numeric  — normalized credit hours (e.g. 4.0)
--   p_puntos        numeric  — CONACEM puntos (nullable; pass NULL if not applicable)
--   p_pass_flag     boolean  — whether this award passes the assessment gate
--   p_activity      text     — human-readable activity label (nullable)
--
-- Returns: uuid of the new physician_credit_logs row.

CREATE OR REPLACE FUNCTION award_credit(
  p_physician_id  UUID,
  p_source        TEXT,
  p_credit_hours  NUMERIC,
  p_puntos        NUMERIC  DEFAULT NULL,
  p_pass_flag     BOOLEAN  DEFAULT false,
  p_activity      TEXT     DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id           UUID;
  v_current_total    NUMERIC;
  v_new_total        NUMERIC;
  v_current_target   NUMERIC;
  v_current_level    INT;
  v_new_level        INT;
  v_new_state        TEXT;
BEGIN
  -- Step 1: Insert the credit log row.
  INSERT INTO physician_credit_logs (
    physician_id,
    source,
    raw_hours,
    puntos,
    credit_hours,
    pass_flag,
    activity,
    verified,
    awarded_at,
    created_at
  )
  VALUES (
    p_physician_id,
    p_source,
    p_credit_hours,           -- raw_hours = credit_hours by default; callers may
                               -- override via a direct INSERT if raw_hours differs
    p_puntos,
    p_credit_hours,
    COALESCE(p_pass_flag, false),
    p_activity,
    false,                     -- verified defaults false; set by external verification job
    NOW(),                     -- awarded_at = now (callers may use a separate path for
                               -- retroactive grants, which would need a different RPC)
    NOW()
  )
  RETURNING id INTO v_log_id;

  -- Step 2: Upsert certification_progress (only if pass_flag is true — non-passing
  -- awards do not contribute to the running total or state transitions).
  IF COALESCE(p_pass_flag, false) THEN

    -- Lock the progress row for this physician (or create it).
    -- We use INSERT ... ON CONFLICT to handle the upsert atomically.
    INSERT INTO physician_certification_progress (
      physician_id,
      total_credit_hours,
      target,
      certificate_state,
      certificate_level,
      updated_at
    )
    VALUES (
      p_physician_id,
      p_credit_hours,
      40,                      -- default target (first certificate threshold)
      CASE
        WHEN p_credit_hours >= 40 THEN 'eligible'
        ELSE 'in_progress'
      END,
      CASE
        WHEN p_credit_hours >= 40 THEN 1
        ELSE 0
      END,
      NOW()
    )
    ON CONFLICT (physician_id) DO UPDATE SET
      total_credit_hours = physician_certification_progress.total_credit_hours + p_credit_hours,
      certificate_state  = CASE
        -- Once 'issued', state does not regress (the certificate was formally issued).
        WHEN physician_certification_progress.certificate_state = 'issued' THEN 'issued'
        -- Advance to eligible if the NEW total meets or exceeds the target.
        WHEN (physician_certification_progress.total_credit_hours + p_credit_hours)
             >= physician_certification_progress.target THEN 'eligible'
        -- Otherwise keep current state.
        ELSE physician_certification_progress.certificate_state
      END,
      certificate_level  = CASE
        -- Stackable / cumulative (CERT-06): level = floor(new_total / target).
        -- This allows multi-threshold recognition (e.g. 40, 80, 120 credit-hours = levels 1, 2, 3).
        WHEN physician_certification_progress.target > 0
        THEN GREATEST(
          physician_certification_progress.certificate_level,
          FLOOR(
            (physician_certification_progress.total_credit_hours + p_credit_hours)
            / physician_certification_progress.target
          )::INT
        )
        ELSE physician_certification_progress.certificate_level
      END,
      updated_at         = NOW();

  END IF;

  RETURN v_log_id;
END;
$$;

-- Revoke broad grants first (defense in depth — mirrors 029).
REVOKE ALL ON FUNCTION award_credit(UUID, TEXT, NUMERIC, NUMERIC, BOOLEAN, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION award_credit(UUID, TEXT, NUMERIC, NUMERIC, BOOLEAN, TEXT) FROM anon;
REVOKE ALL ON FUNCTION award_credit(UUID, TEXT, NUMERIC, NUMERIC, BOOLEAN, TEXT) FROM authenticated;

-- Grant to service_role ONLY (CERT-04).
GRANT EXECUTE ON FUNCTION award_credit(UUID, TEXT, NUMERIC, NUMERIC, BOOLEAN, TEXT) TO service_role;

COMMENT ON FUNCTION award_credit IS
  'Phase 26 CERT-04: canonical credit-award path. SECURITY DEFINER. '
  'GRANT to service_role ONLY — physicians cannot call this function. '
  'Atomically inserts a physician_credit_logs row and upserts '
  'physician_certification_progress (total_credit_hours, certificate_state, '
  'certificate_level). Only pass_flag=true awards advance the running total. '
  'certificate_level uses the CERT-06 stackable/cumulative model: '
  'level = floor(total / target). Returns the new log row uuid. '
  'Mirrors increment_cue_usage (029) in SECURITY DEFINER + GRANT pattern.';

-- =====================================================
-- PART 5: award_cdmx_attendance RPC (CERT-05)
-- =====================================================
--
-- Convenience wrapper for the CDMX inaugural-event attendance credit.
-- Hard-coded values per CERT-05:
--   source         = 'cdmx-attendance'
--   credit_hours   = 4
--   puntos         = 4  (1 punto = 1 hora; 4-hour event)
--   pass_flag      = true  (attendance = assessment passed)
--   activity       = bilingual label for the event
--
-- IDEMPOTENT: the partial unique index uq_pcl_cdmx_attendance_per_physician
-- (ON physician_credit_logs(physician_id) WHERE source='cdmx-attendance') prevents
-- a second INSERT from succeeding. This function catches the unique-violation
-- exception and returns the existing log row's id instead.
-- A second call is a no-op — it does NOT double-count and does NOT error.
--
-- GRANT to service_role ONLY (mirrors award_credit above).

CREATE OR REPLACE FUNCTION award_cdmx_attendance(
  p_physician_id  UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_log  UUID;
  v_new_log_id    UUID;
BEGIN
  -- Idempotency check: look for an existing cdmx-attendance row for this physician.
  SELECT id INTO v_existing_log
  FROM physician_credit_logs
  WHERE physician_id = p_physician_id
    AND source       = 'cdmx-attendance'
  LIMIT 1;

  -- If already awarded, return the existing record's metadata (no double-count).
  IF v_existing_log IS NOT NULL THEN
    RETURN jsonb_build_object(
      'awarded',         false,
      'already_awarded', true,
      'log_id',          v_existing_log,
      'credit_hours',    4,
      'source',          'cdmx-attendance'
    );
  END IF;

  -- Not yet awarded — call award_credit with CDMX parameters.
  -- award_credit handles the credit_logs INSERT and progress UPSERT atomically.
  v_new_log_id := award_credit(
    p_physician_id  => p_physician_id,
    p_source        => 'cdmx-attendance',
    p_credit_hours  => 4,
    p_puntos        => 4,
    p_pass_flag     => true,
    p_activity      => 'CDMX inaugural attendance / Asistencia inaugural CDMX'
  );

  RETURN jsonb_build_object(
    'awarded',         true,
    'already_awarded', false,
    'log_id',          v_new_log_id,
    'credit_hours',    4,
    'source',          'cdmx-attendance'
  );

EXCEPTION
  -- Catch any unique-violation that slipped past the existence check
  -- (race condition between two concurrent calls for the same physician).
  WHEN unique_violation THEN
    SELECT id INTO v_existing_log
    FROM physician_credit_logs
    WHERE physician_id = p_physician_id
      AND source       = 'cdmx-attendance'
    LIMIT 1;

    RETURN jsonb_build_object(
      'awarded',         false,
      'already_awarded', true,
      'log_id',          v_existing_log,
      'credit_hours',    4,
      'source',          'cdmx-attendance'
    );
END;
$$;

-- Revoke broad grants (mirrors award_credit pattern exactly).
REVOKE ALL ON FUNCTION award_cdmx_attendance(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION award_cdmx_attendance(UUID) FROM anon;
REVOKE ALL ON FUNCTION award_cdmx_attendance(UUID) FROM authenticated;

-- Grant to service_role ONLY (CERT-05).
GRANT EXECUTE ON FUNCTION award_cdmx_attendance(UUID) TO service_role;

COMMENT ON FUNCTION award_cdmx_attendance IS
  'Phase 26 CERT-05: convenience award for the CDMX inaugural-event attendance. '
  'SECURITY DEFINER. GRANT to service_role ONLY. '
  'Hard-coded: source=''cdmx-attendance'', credit_hours=4, puntos=4, pass_flag=true. '
  'IDEMPOTENT: a second call for the same physician_id is a no-op — returns '
  '{awarded: false, already_awarded: true, log_id: <existing>}. '
  'Double-award is prevented by both an existence check and the partial unique index '
  'uq_pcl_cdmx_attendance_per_physician. Race conditions handled via EXCEPTION block. '
  'Returns JSONB: {awarded, already_awarded, log_id, credit_hours, source}.';
