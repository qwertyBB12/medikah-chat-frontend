-- Migration 016: Verification Engine & Compliance (Phase 8)
-- Implements VERF-01 through VERF-05:
--   VERF-01: verification_records — timestamped raw API responses
--   VERF-02: expiration_flag trigger on licenses/certifications
--   VERF-03: consejo_recertification_thresholds — per-Consejo flexible fields
--   VERF-04: manual_review_required flag on licenses/certifications
--   VERF-05: credential_audit_log — append-only field-level change log
--
-- Complements existing physician_verification_results (tier-based, 003_verification.sql)
-- and physician_onboarding_audit (phase-level, 002_physicians.sql).

-- =====================================================
-- PART 1: VERIFICATION_RECORDS (VERF-01)
-- Append-only timestamped copies of external API lookup results.
-- Every NPI Registry, SEP Cedula, FSMB, state-board call writes one row here.
-- =====================================================

CREATE TABLE IF NOT EXISTS verification_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  physician_id UUID NOT NULL REFERENCES physicians(id) ON DELETE CASCADE,

  -- Which API produced this record
  source TEXT NOT NULL,
  -- Values: 'npi_registry', 'sep_cedula', 'fsmb', 'state_medical_board', 'cofepris_api', 'manual'

  -- What credential row this record relates to (polymorphic — physician_licenses OR physician_certifications)
  related_table TEXT,
  -- 'physician_licenses' | 'physician_certifications' | NULL
  related_id UUID,

  -- Input sent to the API (e.g., { npiNumber: "1234567890" } or { cedulaNumber: "1234567" })
  lookup_input JSONB NOT NULL,

  -- Raw API response body as returned by the external service
  raw_response JSONB NOT NULL,

  -- Derived classification computed at write-time by the service
  result_status TEXT NOT NULL,
  -- Values: 'found', 'not_found', 'error', 'timeout'

  -- Normalized summary (optional; convenience for admin UI in Phase 9)
  summary JSONB,

  -- Immutable timestamp (server-assigned)
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_records_physician_id
  ON verification_records(physician_id);
CREATE INDEX IF NOT EXISTS idx_verification_records_source
  ON verification_records(source);
CREATE INDEX IF NOT EXISTS idx_verification_records_recorded_at
  ON verification_records(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_verification_records_related
  ON verification_records(related_table, related_id);

ALTER TABLE verification_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Physicians can view own verification records"
  ON verification_records
  FOR SELECT
  USING (
    physician_id IN (
      SELECT id FROM physicians WHERE email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Service role can manage verification records"
  ON verification_records
  FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE verification_records IS 'VERF-01: Timestamped raw API responses for legal compliance. Every NPI/SEP/FSMB/state-board lookup writes one row.';
COMMENT ON COLUMN verification_records.source IS 'Which API produced this record: npi_registry | sep_cedula | fsmb | state_medical_board | cofepris_api | manual';
COMMENT ON COLUMN verification_records.result_status IS 'Derived result: found | not_found | error | timeout';
COMMENT ON COLUMN verification_records.raw_response IS 'Full untouched API response body — the legal evidence of what the external system returned at recorded_at';

-- =====================================================
-- PART 2: CREDENTIAL_AUDIT_LOG (VERF-05)
-- Append-only field-level change log for all credential mutations.
-- Every INSERT/UPDATE/DELETE on physician_licenses and physician_certifications writes here.
-- =====================================================

CREATE TABLE IF NOT EXISTS credential_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  physician_id UUID NOT NULL REFERENCES physicians(id) ON DELETE CASCADE,

  -- Who performed the change
  actor_email TEXT NOT NULL,
  -- session.user.email, or 'system' for automated writes, or 'admin:{user_id}' in Phase 9

  actor_role TEXT NOT NULL DEFAULT 'physician',
  -- 'physician' | 'system' | 'admin'

  -- What changed
  target_table TEXT NOT NULL CHECK (target_table IN ('physician_licenses', 'physician_certifications', 'physicians')),
  target_id UUID NOT NULL,
  field_name TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,

  -- Change classification
  change_type TEXT NOT NULL CHECK (change_type IN ('create', 'update', 'delete')),

  -- Immutable timestamp
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credential_audit_log_physician_id
  ON credential_audit_log(physician_id);
CREATE INDEX IF NOT EXISTS idx_credential_audit_log_target
  ON credential_audit_log(target_table, target_id);
CREATE INDEX IF NOT EXISTS idx_credential_audit_log_changed_at
  ON credential_audit_log(changed_at DESC);

ALTER TABLE credential_audit_log ENABLE ROW LEVEL SECURITY;

-- Physicians can SELECT their own audit history
CREATE POLICY "Physicians can view own audit log"
  ON credential_audit_log
  FOR SELECT
  USING (
    physician_id IN (
      SELECT id FROM physicians WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Service role can INSERT only — no UPDATE/DELETE policies granted at all
-- This enforces append-only: even the service role cannot modify past audit rows
-- (RLS denies by default when no matching policy exists)
CREATE POLICY "Service role can insert audit log"
  ON credential_audit_log
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can select audit log"
  ON credential_audit_log
  FOR SELECT
  USING (auth.role() = 'service_role');

-- NO UPDATE policy — RLS denies
-- NO DELETE policy — RLS denies
-- This is the append-only guarantee (T-08-01)

COMMENT ON TABLE credential_audit_log IS 'VERF-05: Append-only field-level credential change log. No UPDATE or DELETE policies — enforced immutable.';
COMMENT ON COLUMN credential_audit_log.actor_email IS 'Session email of the human who made the change, or "system" for automated writes';
COMMENT ON COLUMN credential_audit_log.actor_role IS 'physician | system | admin';
COMMENT ON COLUMN credential_audit_log.change_type IS 'create | update | delete';

-- =====================================================
-- PART 3: CONSEJO_RECERTIFICATION_THRESHOLDS (VERF-03)
-- Per-Consejo flexible point thresholds and recertification cycle years.
-- Zero hardcoded values: table is created empty; rows inserted per-Consejo as data becomes available.
-- =====================================================

CREATE TABLE IF NOT EXISTS consejo_recertification_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  consejo_name TEXT NOT NULL UNIQUE,
  -- e.g., 'Consejo Mexicano de Ginecología y Obstetricia' (COMEGO)

  -- Flexible threshold spec: points, time-in-practice, CME hours, etc.
  -- Example: { "points_required": 350, "cycle_years": 5, "cme_required_hours": 40 }
  threshold_spec JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Canonical cycle length in years (nullable — some Consejos are per-request not per-cycle)
  cycle_years INTEGER,

  source_url TEXT,
  -- Public URL where the threshold was documented (for admin audit)

  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consejo_thresholds_name
  ON consejo_recertification_thresholds(consejo_name);

ALTER TABLE consejo_recertification_thresholds ENABLE ROW LEVEL SECURITY;

-- All authenticated physicians can read the threshold reference table (public reference data)
CREATE POLICY "Any authenticated user can read consejo thresholds"
  ON consejo_recertification_thresholds
  FOR SELECT
  USING (auth.role() IN ('authenticated', 'service_role'));

-- Only service role writes (admin seeds in Phase 9)
CREATE POLICY "Service role can manage consejo thresholds"
  ON consejo_recertification_thresholds
  FOR ALL
  USING (auth.role() = 'service_role');

-- updated_at trigger (reuses existing function pattern)
CREATE OR REPLACE FUNCTION update_consejo_thresholds_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER consejo_thresholds_updated_at
  BEFORE UPDATE ON consejo_recertification_thresholds
  FOR EACH ROW
  EXECUTE FUNCTION update_consejo_thresholds_updated_at();

COMMENT ON TABLE consejo_recertification_thresholds IS 'VERF-03: Per-Consejo point threshold reference. Zero hardcoded values — rows added as Consejo data is gathered.';
COMMENT ON COLUMN consejo_recertification_thresholds.threshold_spec IS 'Flexible JSONB: { points_required, cycle_years, cme_required_hours, ... }';

-- =====================================================
-- PART 4: EXPIRATION_FLAG on physician_licenses (VERF-02)
-- Trigger-maintained boolean: TRUE when expiration_date is within 90 days of NOW() (and not already expired).
-- Implemented as a trigger (not generated column) because PG generated cols cannot reference NOW().
-- =====================================================

ALTER TABLE physician_licenses
  ADD COLUMN IF NOT EXISTS expiration_flag BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE physician_licenses
  ADD COLUMN IF NOT EXISTS manual_review_required BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN physician_licenses.expiration_flag IS 'VERF-02: TRUE when expiration_date is within 90 days of NOW(). Maintained by trigger.';
COMMENT ON COLUMN physician_licenses.manual_review_required IS 'VERF-04: TRUE when this credential could not be verified by API and requires human review.';

-- Function to recompute expiration_flag
CREATE OR REPLACE FUNCTION recompute_license_expiration_flag()
RETURNS TRIGGER AS $$
BEGIN
  NEW.expiration_flag := (
    NEW.expiration_date IS NOT NULL
    AND NEW.expiration_date >= CURRENT_DATE
    AND NEW.expiration_date <= (CURRENT_DATE + INTERVAL '90 days')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS physician_licenses_expiration_flag ON physician_licenses;
CREATE TRIGGER physician_licenses_expiration_flag
  BEFORE INSERT OR UPDATE OF expiration_date ON physician_licenses
  FOR EACH ROW
  EXECUTE FUNCTION recompute_license_expiration_flag();

-- Backfill existing rows (safe — CURRENT_DATE is deterministic at migration time)
UPDATE physician_licenses
  SET expiration_flag = (
    expiration_date IS NOT NULL
    AND expiration_date >= CURRENT_DATE
    AND expiration_date <= (CURRENT_DATE + INTERVAL '90 days')
  )
  WHERE expiration_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_physician_licenses_expiration_flag
  ON physician_licenses(expiration_flag) WHERE expiration_flag = TRUE;
CREATE INDEX IF NOT EXISTS idx_physician_licenses_manual_review
  ON physician_licenses(manual_review_required) WHERE manual_review_required = TRUE;

-- =====================================================
-- PART 5: EXPIRATION_FLAG on physician_certifications (VERF-02)
-- Same pattern applied to certifications.
-- =====================================================

ALTER TABLE physician_certifications
  ADD COLUMN IF NOT EXISTS expiration_flag BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE physician_certifications
  ADD COLUMN IF NOT EXISTS manual_review_required BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN physician_certifications.expiration_flag IS 'VERF-02: TRUE when expiration_date is within 90 days of NOW(). Maintained by trigger.';
COMMENT ON COLUMN physician_certifications.manual_review_required IS 'VERF-04: TRUE when this credential could not be verified by API and requires human review.';

CREATE OR REPLACE FUNCTION recompute_cert_expiration_flag()
RETURNS TRIGGER AS $$
BEGIN
  NEW.expiration_flag := (
    NEW.expiration_date IS NOT NULL
    AND NEW.expiration_date >= CURRENT_DATE
    AND NEW.expiration_date <= (CURRENT_DATE + INTERVAL '90 days')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS physician_certifications_expiration_flag ON physician_certifications;
CREATE TRIGGER physician_certifications_expiration_flag
  BEFORE INSERT OR UPDATE OF expiration_date ON physician_certifications
  FOR EACH ROW
  EXECUTE FUNCTION recompute_cert_expiration_flag();

UPDATE physician_certifications
  SET expiration_flag = (
    expiration_date IS NOT NULL
    AND expiration_date >= CURRENT_DATE
    AND expiration_date <= (CURRENT_DATE + INTERVAL '90 days')
  )
  WHERE expiration_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_physician_certifications_expiration_flag
  ON physician_certifications(expiration_flag) WHERE expiration_flag = TRUE;
CREATE INDEX IF NOT EXISTS idx_physician_certifications_manual_review
  ON physician_certifications(manual_review_required) WHERE manual_review_required = TRUE;

-- =====================================================
-- PART 6: RECERTIFICATION_DUE_FLAG helper function (VERF-03)
-- Computed helper — not a stored column (because the cycle_years varies per Consejo).
-- Admin dashboard (Phase 9) can call this function to check if a Consejo cert is due for recertification.
-- =====================================================

CREATE OR REPLACE FUNCTION is_consejo_recertification_due(
  p_cert_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_recert_year INTEGER;
  v_cycle_years INTEGER;
  v_consejo_name TEXT;
BEGIN
  SELECT c.recertification_year, c.certifying_body
    INTO v_recert_year, v_consejo_name
    FROM physician_certifications c
    WHERE c.id = p_cert_id AND c.certification_type = 'consejo';

  IF v_recert_year IS NULL OR v_consejo_name IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT t.cycle_years INTO v_cycle_years
    FROM consejo_recertification_thresholds t
    WHERE t.consejo_name = v_consejo_name;

  IF v_cycle_years IS NULL THEN
    RETURN FALSE; -- no threshold data available
  END IF;

  -- Due if current year is within the recertification window:
  -- (last recert + cycle_years) is within 90 days or already past
  RETURN (v_recert_year + v_cycle_years) <= (EXTRACT(YEAR FROM CURRENT_DATE) + 0.25);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION is_consejo_recertification_due(UUID) IS 'VERF-03: Returns TRUE if a Consejo certification is due for recertification based on per-Consejo cycle_years. Returns FALSE if threshold data unknown.';

-- =====================================================
-- END OF MIGRATION 016
-- =====================================================
