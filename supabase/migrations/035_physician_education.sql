-- 035_physician_education.sql
-- Phase B2 (source-of-truth refactor, 2026-06-27): canonical education store.
--
-- WHY: Medical school / residency / fellowship were captured ONLY in the
-- Public-Profile EducationEditor — Credentials had no home for them. To make
-- Public Profile a pure visibility layer (derive-at-read), education needs a
-- canonical home in Credentials first. This table is the ONE place a physician's
-- training history lives. Board certification is NOT here — it is an attribute of
-- a specialty row in physician_specialties (Phase B1, migration 033).
--
-- A row's `kind` discriminates the three shapes:
--   medical_school -> institution + country + end_year (graduation year)
--   residency / fellowship -> institution + specialty + start_year + end_year
--
-- Verification mirrors physician_specialties: education has no automated source,
-- so rows start unverified (manual_review) and an admin confirms them (spec §5).
-- The public profile and the profile card READ from here (derive-at-read).
--
-- Schema facts (verified against 002_physicians.sql):
--   physicians.medical_school          TEXT
--   physicians.medical_school_country  TEXT
--   physicians.graduation_year         INTEGER
--   physicians.residency               JSONB DEFAULT '[]'  -- [{institution,specialty,startYear,endYear}]
--   physicians.fellowships             JSONB DEFAULT '[]'  -- same shape
--   physicians.verification_status     TEXT
--
-- Idempotent: CREATE TABLE/INDEX IF NOT EXISTS. Backfill is guarded by
-- NOT EXISTS (inference-proof) so re-running does not duplicate rows.

CREATE TABLE IF NOT EXISTS physician_education (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  physician_id uuid NOT NULL REFERENCES physicians(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('medical_school','residency','fellowship')),
  institution text NOT NULL,
  country text,           -- medical_school: country of the school
  specialty text,         -- residency / fellowship
  start_year int,         -- residency / fellowship
  end_year int,           -- medical_school: graduation year; otherwise completion year
  verification_status text NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('verified','manual_review','pending')),
  verification_source text,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_physician_education_physician
  ON physician_education (physician_id);

-- Natural-key uniqueness. COALESCE the nullable parts so a medical_school row
-- (specialty/start_year NULL) and list rows both key cleanly. New table starts
-- empty, so this index build always succeeds.
CREATE UNIQUE INDEX IF NOT EXISTS uq_physician_education
  ON physician_education (
    physician_id, kind, institution, COALESCE(specialty,''), COALESCE(start_year,0)
  );

ALTER TABLE physician_education ENABLE ROW LEVEL SECURITY;

-- Service-role only (server-side API enforces per-physician ownership; mirrors
-- the physician_specialties / physician_licenses policy posture).
DROP POLICY IF EXISTS physician_education_service ON physician_education;
CREATE POLICY physician_education_service ON physician_education
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- ── Backfill: medical school (single) ───────────────────────────────────────
-- No-regression: physicians already publicly live (verification_status='verified')
-- get education grandfathered as verified (source 'migration'); everyone else
-- starts at manual_review for a one-time admin audit.
INSERT INTO physician_education
  (physician_id, kind, institution, country, end_year, verification_status, verification_source)
SELECT
  p.id,
  'medical_school',
  trim(p.medical_school),
  NULLIF(trim(COALESCE(p.medical_school_country, '')), ''),
  p.graduation_year,
  CASE WHEN p.verification_status = 'verified' THEN 'verified' ELSE 'manual_review' END,
  'migration'
FROM physicians p
WHERE p.medical_school IS NOT NULL AND length(trim(p.medical_school)) > 0
  AND NOT EXISTS (
    SELECT 1 FROM physician_education e
    WHERE e.physician_id = p.id
      AND e.kind = 'medical_school'
      AND e.institution = trim(p.medical_school)
  );

-- ── Backfill: residencies (from JSONB array) ────────────────────────────────
INSERT INTO physician_education
  (physician_id, kind, institution, specialty, start_year, end_year, verification_status, verification_source)
SELECT
  p.id,
  'residency',
  trim(r->>'institution'),
  NULLIF(trim(COALESCE(r->>'specialty', '')), ''),
  NULLIF(r->>'startYear', '0')::int,
  NULLIF(r->>'endYear', '0')::int,
  CASE WHEN p.verification_status = 'verified' THEN 'verified' ELSE 'manual_review' END,
  'migration'
FROM physicians p
CROSS JOIN LATERAL jsonb_array_elements(
  CASE jsonb_typeof(p.residency) WHEN 'array' THEN p.residency ELSE '[]'::jsonb END
) AS r
WHERE length(trim(COALESCE(r->>'institution', ''))) > 0
  AND NOT EXISTS (
    SELECT 1 FROM physician_education e
    WHERE e.physician_id = p.id
      AND e.kind = 'residency'
      AND e.institution = trim(r->>'institution')
      AND COALESCE(e.specialty, '') = COALESCE(NULLIF(trim(COALESCE(r->>'specialty', '')), ''), '')
      AND COALESCE(e.start_year, 0) = COALESCE(NULLIF(r->>'startYear', '0')::int, 0)
  );

-- ── Backfill: fellowships (from JSONB array) ────────────────────────────────
INSERT INTO physician_education
  (physician_id, kind, institution, specialty, start_year, end_year, verification_status, verification_source)
SELECT
  p.id,
  'fellowship',
  trim(f->>'institution'),
  NULLIF(trim(COALESCE(f->>'specialty', '')), ''),
  NULLIF(f->>'startYear', '0')::int,
  NULLIF(f->>'endYear', '0')::int,
  CASE WHEN p.verification_status = 'verified' THEN 'verified' ELSE 'manual_review' END,
  'migration'
FROM physicians p
CROSS JOIN LATERAL jsonb_array_elements(
  CASE jsonb_typeof(p.fellowships) WHEN 'array' THEN p.fellowships ELSE '[]'::jsonb END
) AS f
WHERE length(trim(COALESCE(f->>'institution', ''))) > 0
  AND NOT EXISTS (
    SELECT 1 FROM physician_education e
    WHERE e.physician_id = p.id
      AND e.kind = 'fellowship'
      AND e.institution = trim(f->>'institution')
      AND COALESCE(e.specialty, '') = COALESCE(NULLIF(trim(COALESCE(f->>'specialty', '')), ''), '')
      AND COALESCE(e.start_year, 0) = COALESCE(NULLIF(f->>'startYear', '0')::int, 0)
  );
