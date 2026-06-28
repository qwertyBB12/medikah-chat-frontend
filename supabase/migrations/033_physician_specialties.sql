-- 033_physician_specialties.sql
-- Phase B (source-of-truth refactor, 2026-06-27): canonical specialty store.
--
-- WHY: Specialty was entered twice (Public-Profile SpecialtyEditor AND per-row
-- inside each US board certification) — Dr. Aguirre annotations 2/3/7. This table
-- is the ONE place a physician's primary specialty + subspecialties live. Board
-- certification becomes an attribute of a specialty row, not a separate list.
-- The public profile and the profile card READ from here (derive-at-read).
--
-- Verification is anchored to credentials, not self-assertion: US specialties
-- auto-verify via NPI taxonomy, MX via Cédula de Especialidad (SEP). The
-- board_certified claim has no automated source — it stays manual.
--
-- Schema facts (verified against 002_physicians.sql / 013_country_aware_schema.sql):
--   physicians.sub_specialties    TEXT[]   (use unnest, NOT jsonb)
--   physicians.country_of_practice TEXT[]  (1-indexed; empty array -> NULL -> 'US')
--   physicians.primary_specialty   TEXT
--   physicians.verification_status TEXT
--
-- Idempotent: CREATE TABLE/INDEX IF NOT EXISTS. Backfill guarded by the unique
-- constraint + ON CONFLICT DO NOTHING so re-running does not duplicate rows.

CREATE TABLE IF NOT EXISTS physician_specialties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  physician_id uuid NOT NULL REFERENCES physicians(id) ON DELETE CASCADE,
  country text NOT NULL CHECK (country IN ('US','MX')),
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('primary','subspecialty')),
  board_certified boolean NOT NULL DEFAULT false,
  certifying_board text,
  expiration_year int,
  verification_status text NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('verified','manual_review','pending')),
  verification_source text,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (physician_id, country, name, role)
);

CREATE INDEX IF NOT EXISTS idx_physician_specialties_physician
  ON physician_specialties (physician_id);

ALTER TABLE physician_specialties ENABLE ROW LEVEL SECURITY;

-- Service-role only (server-side API enforces per-physician ownership; mirrors
-- the existing physician_licenses/physician_certifications policy posture).
DROP POLICY IF EXISTS physician_specialties_service ON physician_specialties;
CREATE POLICY physician_specialties_service ON physician_specialties
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Backfill primary specialty from physicians.primary_specialty.
-- No-regression: physicians already publicly live (verification_status='verified')
-- get their specialty grandfathered as verified (source 'migration'); everyone
-- else starts at manual_review for a one-time admin audit.
INSERT INTO physician_specialties
  (physician_id, country, name, role, verification_status, verification_source)
SELECT
  p.id,
  COALESCE((p.country_of_practice)[1], 'US'),
  p.primary_specialty,
  'primary',
  CASE WHEN p.verification_status = 'verified' THEN 'verified' ELSE 'manual_review' END,
  'migration'
FROM physicians p
WHERE p.primary_specialty IS NOT NULL AND length(trim(p.primary_specialty)) > 0
ON CONFLICT (physician_id, country, name, role) DO NOTHING;

-- Backfill subspecialties from physicians.sub_specialties (TEXT[]).
INSERT INTO physician_specialties
  (physician_id, country, name, role, verification_status, verification_source)
SELECT
  p.id,
  COALESCE((p.country_of_practice)[1], 'US'),
  ss.value,
  'subspecialty',
  CASE WHEN p.verification_status = 'verified' THEN 'verified' ELSE 'manual_review' END,
  'migration'
FROM physicians p
CROSS JOIN LATERAL unnest(COALESCE(p.sub_specialties, '{}'::text[])) AS ss(value)
WHERE length(trim(ss.value)) > 0
ON CONFLICT (physician_id, country, name, role) DO NOTHING;
