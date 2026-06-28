-- 034_profile_visibility_and_retire_dormant.sql
-- Phase B (2026-06-27): per-field public-profile visibility toggles, and retire
-- the storage Phase A left dormant (Consejo point-threshold, Colegios rows).
--
-- WHY: Public Profile becomes a visibility layer (Dr. Aguirre annotations 7/9) —
-- the physician chooses what canonical data patients see. Default all-true so no
-- existing profile regresses. Phase A removed the UI for point thresholds and
-- Professional Society Memberships (Colegios); this is the destructive step that
-- removes their storage, gated behind Phase A having shipped.
--
-- Schema facts (verified against 013_country_aware_schema.sql):
--   physician_certifications.point_threshold_met  BOOLEAN  (the MX Consejo point col)
--   Colegios are physician_certifications rows with certification_type='colegio_membership'
--
-- Idempotent + reversible-safe: ADD/CREATE IF NOT EXISTS; column/table mutations
-- use IF EXISTS. Backfill inserts a default toggles row for every physician.

CREATE TABLE IF NOT EXISTS physician_profile_visibility (
  physician_id uuid PRIMARY KEY REFERENCES physicians(id) ON DELETE CASCADE,
  toggles jsonb NOT NULL DEFAULT '{
    "specialty":true,"subspecialties":true,"medicalSchool":true,
    "residency":true,"fellowships":true,"certifications":true,
    "officeAddress":true,"phone":true,"officeEmail":true,"appointmentUrl":true
  }'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE physician_profile_visibility ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS physician_profile_visibility_service ON physician_profile_visibility;
CREATE POLICY physician_profile_visibility_service ON physician_profile_visibility
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- No-regression: default toggles row for every existing physician.
INSERT INTO physician_profile_visibility (physician_id)
SELECT id FROM physicians
ON CONFLICT (physician_id) DO NOTHING;

-- Retire dormant storage from Phase A removals.
-- Consejo point threshold (BOOLEAN point_threshold_met on physician_certifications).
ALTER TABLE physician_certifications DROP COLUMN IF EXISTS point_threshold_met;
-- Colegios were certification_type='colegio_membership' rows — remove them.
DELETE FROM physician_certifications WHERE certification_type = 'colegio_membership';
