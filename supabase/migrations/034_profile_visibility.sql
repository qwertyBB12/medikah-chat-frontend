-- 034_profile_visibility.sql
-- Phase B (2026-06-27): per-field public-profile visibility toggles.
--
-- WHY: Public Profile becomes a visibility layer (Dr. Aguirre annotations 7/9) —
-- the physician chooses what canonical data patients see. Default all-true so no
-- existing profile regresses.
--
-- SCOPE — ADDITIVE ONLY (safe to apply with users imminent):
-- This migration only CREATES the visibility table + backfills default rows.
-- It does NOT drop columns or delete rows. The destructive cleanup of the
-- dormant Consejo point-threshold and Colegios storage is intentionally deferred
-- to a later migration that ships TOGETHER with the backend code change that
-- still references them — verified live:
--   * physician_certifications.point_threshold_met is still INSERTed by
--     pages/api/physicians/[id]/mx-credentials.ts (consejo/colegio saves) and
--     read by pages/admin/physicians/[id].tsx — dropping it now breaks saves.
--   * colegio_membership rows have no UI after Phase A but the API read/write
--     path still exists; deleting them is data loss best paired with that removal.
-- Leaving both dormant is harmless and non-breaking.
--
-- Idempotent: CREATE IF NOT EXISTS + ON CONFLICT DO NOTHING.

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
