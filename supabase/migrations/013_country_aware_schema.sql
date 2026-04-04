-- Migration 013: Country-Aware Schema (v1.1 foundation)
-- Phase 4: Country-Aware Onboarding Foundation
-- Adds country_of_practice to physicians, creates normalized credential tables,
-- and adds physician_attestation_records for timestamped digital attestation.
-- NOTE: The existing physicians.licenses JSONB column is NOT dropped or altered.
-- It is deprecated but retained for backward compatibility until Phase 7.

-- =====================================================
-- PART 1: ADD COUNTRY_OF_PRACTICE TO PHYSICIANS
-- =====================================================

-- Add country_of_practice as an array of ISO 3166-1 alpha-2 codes (per D-07, D-10)
-- Hemispheric from day one — not limited to US/MX
ALTER TABLE physicians
  ADD COLUMN IF NOT EXISTS country_of_practice TEXT[] NOT NULL DEFAULT '{}';

-- GIN index for efficient array containment queries (e.g., WHERE 'US' = ANY(country_of_practice))
CREATE INDEX IF NOT EXISTS idx_physicians_country_of_practice
  ON physicians USING GIN(country_of_practice);

-- =====================================================
-- PART 2: ADD ATTESTATION_COMPLETED_AT TO PHYSICIANS
-- =====================================================

-- Timestamp when the physician completed digital attestation (per D-14)
ALTER TABLE physicians
  ADD COLUMN IF NOT EXISTS attestation_completed_at TIMESTAMPTZ;

-- =====================================================
-- PART 3: PHYSICIAN_LICENSES TABLE
-- =====================================================
-- Normalized credential table for medical licenses (NPI, state medical, cedula, etc.)
-- Covers all v1.1 credential fields for US, Mexico, and dual-country physicians (per D-05, D-06)

CREATE TABLE IF NOT EXISTS physician_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  physician_id UUID NOT NULL REFERENCES physicians(id) ON DELETE CASCADE,

  -- Country & license classification
  country_code TEXT NOT NULL,
  -- ISO 3166-1 alpha-2: 'US', 'MX', 'CO', 'CA', etc.

  license_type TEXT NOT NULL,
  -- Values: 'npi', 'state_medical', 'cedula_profesional', 'cedula_especialidad',
  --         'registro_estatal', 'other'

  -- License details
  license_number TEXT,
  issuing_state TEXT,
  -- US state abbreviation (e.g., 'TX', 'CA') or MX estado (e.g., 'CDMX', 'NL')

  degree_type TEXT,
  -- For registro_estatal: 'medico_cirujano', 'especialista', etc.

  expiration_date DATE,
  -- NULL for MX cedulas (lifetime) and NPI (no expiration)

  issued_date DATE,

  is_primary BOOLEAN DEFAULT FALSE,
  -- TRUE for the physician's primary practice license

  -- Verification tracking
  verification_status TEXT NOT NULL DEFAULT 'pending',
  -- Values: 'pending', 'verified', 'failed', 'manual_review'

  verified_at TIMESTAMPTZ,

  verification_source TEXT,
  -- Values: 'npi_registry', 'sep_cedula', 'manual', 'cofepris_api', 'state_medical_board', etc.

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_physician_licenses_physician_id
  ON physician_licenses(physician_id);

CREATE INDEX IF NOT EXISTS idx_physician_licenses_country_code
  ON physician_licenses(country_code);

-- RLS
ALTER TABLE physician_licenses ENABLE ROW LEVEL SECURITY;

-- Physicians can read their own license records
CREATE POLICY "Physicians can view own licenses"
  ON physician_licenses
  FOR SELECT
  USING (
    physician_id IN (
      SELECT id FROM physicians WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Service role (used by API routes) handles inserts and updates
CREATE POLICY "Service role can manage licenses"
  ON physician_licenses
  FOR ALL
  USING (auth.role() = 'service_role');

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_physician_licenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER physician_licenses_updated_at
  BEFORE UPDATE ON physician_licenses
  FOR EACH ROW
  EXECUTE FUNCTION update_physician_licenses_updated_at();

-- Comments
COMMENT ON TABLE physician_licenses IS 'Normalized medical license records for physicians (NPI, state medical, cedula profesional, etc.)';
COMMENT ON COLUMN physician_licenses.country_code IS 'ISO 3166-1 alpha-2 country code (US, MX, CO, CA, etc.)';
COMMENT ON COLUMN physician_licenses.license_type IS 'License classification: npi, state_medical, cedula_profesional, cedula_especialidad, registro_estatal, other';
COMMENT ON COLUMN physician_licenses.issuing_state IS 'US state abbreviation or MX estado for state-level licenses';
COMMENT ON COLUMN physician_licenses.expiration_date IS 'NULL for lifetime licenses (MX cedulas, NPI)';
COMMENT ON COLUMN physician_licenses.verification_source IS 'Source used for verification: npi_registry, sep_cedula, manual, cofepris_api, state_medical_board';

-- =====================================================
-- PART 4: PHYSICIAN_CERTIFICATIONS TABLE
-- =====================================================
-- Normalized table for board certifications, Consejo certs, fellowship certs, colegio memberships
-- Covers US board certs (ABIM, ABP, etc.) and MX Consejo Mexicano board certs (per D-05, D-06)

CREATE TABLE IF NOT EXISTS physician_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  physician_id UUID NOT NULL REFERENCES physicians(id) ON DELETE CASCADE,

  -- Country & certification classification
  country_code TEXT NOT NULL,
  -- ISO 3166-1 alpha-2: 'US', 'MX', etc.

  certification_type TEXT NOT NULL,
  -- Values: 'board_cert', 'consejo', 'fellowship', 'sub_specialty', 'colegio_membership'

  -- Certification details
  certifying_body TEXT,
  -- US: 'ABIM', 'ABP', 'ABS', etc.
  -- MX: 'Consejo Mexicano de Medicina Interna', 'Consejo Mexicano de Cardiología', etc.

  specialty TEXT,
  -- The specialty or sub-specialty certified

  issued_date DATE,

  expiration_date DATE,
  -- NULL if certification has no expiration

  -- MX Consejo-specific fields
  recertification_year INTEGER,
  -- MX Consejo: year of last recertification cycle

  point_threshold_met BOOLEAN,
  -- MX Consejo: flexible field for CME/point requirements — no hardcoded threshold

  -- Verification tracking
  verification_status TEXT NOT NULL DEFAULT 'pending',
  -- Values: 'pending', 'verified', 'failed', 'manual_review'

  verified_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_physician_certs_physician_id
  ON physician_certifications(physician_id);

CREATE INDEX IF NOT EXISTS idx_physician_certs_country_code
  ON physician_certifications(country_code);

-- RLS
ALTER TABLE physician_certifications ENABLE ROW LEVEL SECURITY;

-- Physicians can read their own certification records
CREATE POLICY "Physicians can view own certifications"
  ON physician_certifications
  FOR SELECT
  USING (
    physician_id IN (
      SELECT id FROM physicians WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Service role handles inserts and updates
CREATE POLICY "Service role can manage certifications"
  ON physician_certifications
  FOR ALL
  USING (auth.role() = 'service_role');

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_physician_certifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER physician_certifications_updated_at
  BEFORE UPDATE ON physician_certifications
  FOR EACH ROW
  EXECUTE FUNCTION update_physician_certifications_updated_at();

-- Comments
COMMENT ON TABLE physician_certifications IS 'Board certifications, Consejo Mexicano certs, fellowships, and colegio memberships';
COMMENT ON COLUMN physician_certifications.certification_type IS 'Type: board_cert, consejo, fellowship, sub_specialty, colegio_membership';
COMMENT ON COLUMN physician_certifications.certifying_body IS 'US: ABIM, ABP, ABS, etc. MX: Consejo Mexicano de..., Colegio Mexicano de..., etc.';
COMMENT ON COLUMN physician_certifications.recertification_year IS 'MX Consejo: most recent recertification cycle year';
COMMENT ON COLUMN physician_certifications.point_threshold_met IS 'MX Consejo: flexible CME/point requirement met indicator';

-- =====================================================
-- PART 5: PHYSICIAN_DOCUMENTS TABLE
-- =====================================================
-- Document uploads for identity verification and credential evidence
-- Covers INE/CURP (MX), government ID (US), diploma scans, license scans, etc.

CREATE TABLE IF NOT EXISTS physician_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  physician_id UUID NOT NULL REFERENCES physicians(id) ON DELETE CASCADE,

  -- Document classification
  document_type TEXT NOT NULL,
  -- Values: 'ine_front', 'ine_back', 'curp', 'diploma_front', 'diploma_back',
  --         'government_id', 'license_scan', 'other'

  -- Polymorphic FK to credential record (nullable — some docs are identity docs)
  related_credential_id UUID,
  -- References physician_licenses.id or physician_certifications.id

  related_credential_table TEXT,
  -- 'physician_licenses' or 'physician_certifications'

  -- File metadata
  file_name TEXT,
  storage_path TEXT NOT NULL,
  -- Supabase Storage path (e.g., 'physician-docs/{physician_id}/{document_type}/{file_name}')

  mime_type TEXT,
  -- 'image/jpeg', 'image/png', 'application/pdf', etc.

  -- Upload & verification tracking
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ
);

-- Index for physician document lookups
CREATE INDEX IF NOT EXISTS idx_physician_docs_physician_id
  ON physician_documents(physician_id);

-- RLS
ALTER TABLE physician_documents ENABLE ROW LEVEL SECURITY;

-- Physicians can read their own document records
CREATE POLICY "Physicians can view own documents"
  ON physician_documents
  FOR SELECT
  USING (
    physician_id IN (
      SELECT id FROM physicians WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Service role handles inserts and updates
CREATE POLICY "Service role can manage documents"
  ON physician_documents
  FOR ALL
  USING (auth.role() = 'service_role');

-- Comments
COMMENT ON TABLE physician_documents IS 'Document uploads for physician identity verification and credential evidence';
COMMENT ON COLUMN physician_documents.document_type IS 'Type: ine_front, ine_back, curp, diploma_front, diploma_back, government_id, license_scan, other';
COMMENT ON COLUMN physician_documents.storage_path IS 'Supabase Storage path to the uploaded file';
COMMENT ON COLUMN physician_documents.related_credential_id IS 'Optional FK to physician_licenses or physician_certifications (polymorphic)';
COMMENT ON COLUMN physician_documents.related_credential_table IS 'Table name for polymorphic FK: physician_licenses or physician_certifications';

-- =====================================================
-- PART 6: PHYSICIAN_ATTESTATION_RECORDS TABLE
-- =====================================================
-- Timestamped digital attestation records (per D-12, D-13, D-14)
-- Modeled on physician_consent_records from 005_physician_consent.sql
-- Must stand up to legal scrutiny — stores full data snapshot + SHA-256 hash

CREATE TABLE IF NOT EXISTS physician_attestation_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  physician_id UUID NOT NULL REFERENCES physicians(id) ON DELETE CASCADE,

  -- Attestation versioning
  attestation_version TEXT NOT NULL DEFAULT '1.0',

  -- Timestamp of attestation (server-side, not client-submitted)
  attested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Full snapshot of physician profile data at time of attestation
  data_snapshot JSONB NOT NULL,
  -- Contains the physician's submitted profile data (name, email, specialty, country, etc.)

  -- SHA-256 hex digest of data_snapshot for tamper evidence (per T-04-02)
  data_snapshot_hash TEXT,

  -- Request metadata for legal audit trail
  ip_address INET,
  user_agent TEXT,

  -- Language of the attestation flow
  language TEXT NOT NULL DEFAULT 'en',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for physician attestation lookups
CREATE INDEX IF NOT EXISTS idx_physician_attestation_physician_id
  ON physician_attestation_records(physician_id);

-- RLS
ALTER TABLE physician_attestation_records ENABLE ROW LEVEL SECURITY;

-- Physicians can view their own attestation records
CREATE POLICY "Physicians can view own attestation records"
  ON physician_attestation_records
  FOR SELECT
  USING (
    physician_id IN (
      SELECT id FROM physicians WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Service role handles inserts (attestation saved server-side only — per T-04-01)
CREATE POLICY "Service role can manage attestation records"
  ON physician_attestation_records
  FOR ALL
  USING (auth.role() = 'service_role');

-- Comments
COMMENT ON TABLE physician_attestation_records IS 'Timestamped digital attestation records — physician confirms submitted data is accurate';
COMMENT ON COLUMN physician_attestation_records.attestation_version IS 'Version of the attestation statement presented to the physician';
COMMENT ON COLUMN physician_attestation_records.attested_at IS 'Server-side timestamp of attestation — client cannot override';
COMMENT ON COLUMN physician_attestation_records.data_snapshot IS 'Full physician profile data at time of attestation (for legal audit)';
COMMENT ON COLUMN physician_attestation_records.data_snapshot_hash IS 'SHA-256 hex digest of data_snapshot — tamper evidence';
COMMENT ON COLUMN physician_attestation_records.ip_address IS 'Client IP address at time of attestation (from x-forwarded-for or socket)';
