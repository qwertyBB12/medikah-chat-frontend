-- =====================================================
-- MEDIKAH PHYSICIAN PORTAL - COMBINED DATABASE SETUP
-- =====================================================
-- Run this script in Supabase SQL Editor
-- Combines migrations: 002, 003, 004, 005
-- =====================================================

-- =====================================================
-- PART 1: PHYSICIANS TABLE (from 002_physicians.sql)
-- =====================================================

CREATE TABLE IF NOT EXISTS physicians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  photo_url TEXT,
  linkedin_url TEXT,
  linkedin_imported BOOLEAN DEFAULT FALSE,

  -- Licensing (JSONB array for multi-country)
  licenses JSONB NOT NULL DEFAULT '[]',

  -- Specialty & Certifications
  primary_specialty TEXT,
  sub_specialties TEXT[],
  board_certifications JSONB DEFAULT '[]',

  -- Education
  medical_school TEXT,
  medical_school_country TEXT,
  graduation_year INTEGER,
  honors TEXT[],

  -- Training
  residency JSONB DEFAULT '[]',
  fellowships JSONB DEFAULT '[]',

  -- Intellectual Contribution
  google_scholar_url TEXT,
  publications JSONB DEFAULT '[]',
  presentations JSONB DEFAULT '[]',
  books JSONB DEFAULT '[]',

  -- Professional Presence
  current_institutions TEXT[],
  website_url TEXT,
  twitter_url TEXT,
  researchgate_url TEXT,
  academia_edu_url TEXT,

  -- Availability
  available_days TEXT[],
  available_hours_start TIME,
  available_hours_end TIME,
  timezone TEXT,
  languages TEXT[] NOT NULL DEFAULT ARRAY['es', 'en'],

  -- Status & Audit
  verification_status TEXT NOT NULL DEFAULT 'pending',
  onboarding_completed_at TIMESTAMPTZ,
  onboarding_language TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for physicians
CREATE INDEX IF NOT EXISTS idx_physicians_email ON physicians(email);
CREATE INDEX IF NOT EXISTS idx_physicians_verification_status ON physicians(verification_status);
CREATE INDEX IF NOT EXISTS idx_physicians_primary_specialty ON physicians(primary_specialty);
CREATE INDEX IF NOT EXISTS idx_physicians_languages ON physicians USING GIN(languages);

-- RLS for physicians
ALTER TABLE physicians ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Physicians can read own profile" ON physicians;
CREATE POLICY "Physicians can read own profile"
  ON physicians
  FOR SELECT
  USING (auth.uid()::text = id::text OR auth.uid()::text = email);

DROP POLICY IF EXISTS "Physicians can insert own profile" ON physicians;
CREATE POLICY "Physicians can insert own profile"
  ON physicians
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Physicians can update own profile" ON physicians;
CREATE POLICY "Physicians can update own profile"
  ON physicians
  FOR UPDATE
  USING (auth.uid()::text = id::text OR auth.uid()::text = email);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_physicians_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS physicians_updated_at ON physicians;
CREATE TRIGGER physicians_updated_at
  BEFORE UPDATE ON physicians
  FOR EACH ROW
  EXECUTE FUNCTION update_physicians_updated_at();

-- Audit log table
CREATE TABLE IF NOT EXISTS physician_onboarding_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  physician_id UUID REFERENCES physicians(id),
  email TEXT NOT NULL,
  action TEXT NOT NULL,
  phase TEXT,
  data_snapshot JSONB,
  ip_address INET,
  user_agent TEXT,
  language TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE physician_onboarding_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert audit entries" ON physician_onboarding_audit;
CREATE POLICY "Anyone can insert audit entries"
  ON physician_onboarding_audit
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Physicians can read own audit entries" ON physician_onboarding_audit;
CREATE POLICY "Physicians can read own audit entries"
  ON physician_onboarding_audit
  FOR SELECT
  USING (email = auth.jwt()->>'email');


-- =====================================================
-- PART 2: VERIFICATION SYSTEM (from 003_verification.sql)
-- =====================================================

-- Add verification fields to physicians table
ALTER TABLE physicians ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE physicians ADD COLUMN IF NOT EXISTS verified_by TEXT;
ALTER TABLE physicians ADD COLUMN IF NOT EXISTS verification_notes TEXT;
ALTER TABLE physicians ADD COLUMN IF NOT EXISTS verification_tier TEXT;

-- Verification results table
CREATE TABLE IF NOT EXISTS physician_verification_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  physician_id UUID NOT NULL REFERENCES physicians(id) ON DELETE CASCADE,
  verification_type TEXT NOT NULL,
  credential_reference JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  verification_method TEXT NOT NULL,
  external_data JSONB,
  match_confidence DECIMAL(3,2),
  discrepancies JSONB,
  verified_at TIMESTAMPTZ,
  verified_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Manual review queue
CREATE TABLE IF NOT EXISTS physician_manual_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  physician_id UUID NOT NULL REFERENCES physicians(id) ON DELETE CASCADE,
  verification_result_id UUID REFERENCES physician_verification_results(id),
  review_type TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  review_data JSONB NOT NULL,
  reason TEXT NOT NULL,
  sla_deadline TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '48 hours'),
  assigned_to TEXT,
  assigned_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for verification
CREATE INDEX IF NOT EXISTS idx_verification_results_physician ON physician_verification_results(physician_id);
CREATE INDEX IF NOT EXISTS idx_verification_results_status ON physician_verification_results(status);
CREATE INDEX IF NOT EXISTS idx_verification_results_type ON physician_verification_results(verification_type);
CREATE INDEX IF NOT EXISTS idx_manual_review_status ON physician_manual_review_queue(status);
CREATE INDEX IF NOT EXISTS idx_manual_review_sla ON physician_manual_review_queue(sla_deadline) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_manual_review_physician ON physician_manual_review_queue(physician_id);
CREATE INDEX IF NOT EXISTS idx_manual_review_assigned ON physician_manual_review_queue(assigned_to) WHERE status = 'in_progress';

-- RLS for verification tables
ALTER TABLE physician_verification_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE physician_manual_review_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Physicians can read own verification results" ON physician_verification_results;
CREATE POLICY "Physicians can read own verification results"
  ON physician_verification_results
  FOR SELECT
  USING (
    physician_id IN (
      SELECT id FROM physicians WHERE email = auth.jwt()->>'email'
    )
  );

DROP POLICY IF EXISTS "Service role can manage verification results" ON physician_verification_results;
CREATE POLICY "Service role can manage verification results"
  ON physician_verification_results
  FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can manage review queue" ON physician_manual_review_queue;
CREATE POLICY "Service role can manage review queue"
  ON physician_manual_review_queue
  FOR ALL
  USING (auth.role() = 'service_role');

-- Triggers for verification updated_at
CREATE OR REPLACE FUNCTION update_verification_results_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS verification_results_updated_at ON physician_verification_results;
CREATE TRIGGER verification_results_updated_at
  BEFORE UPDATE ON physician_verification_results
  FOR EACH ROW
  EXECUTE FUNCTION update_verification_results_updated_at();

CREATE OR REPLACE FUNCTION update_manual_review_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS manual_review_updated_at ON physician_manual_review_queue;
CREATE TRIGGER manual_review_updated_at
  BEFORE UPDATE ON physician_manual_review_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_manual_review_updated_at();

-- Helper function to check full verification
CREATE OR REPLACE FUNCTION check_physician_fully_verified(p_physician_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  pending_count INTEGER;
  failed_count INTEGER;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE status IN ('pending', 'manual_review')),
    COUNT(*) FILTER (WHERE status IN ('failed', 'rejected'))
  INTO pending_count, failed_count
  FROM physician_verification_results
  WHERE physician_id = p_physician_id;

  RETURN pending_count = 0 AND failed_count = 0;
END;
$$ LANGUAGE plpgsql;


-- =====================================================
-- PART 3: LINKEDIN OAUTH (from 004_linkedin_oauth.sql)
-- =====================================================

CREATE TABLE IF NOT EXISTS linkedin_oauth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  profile_data JSONB NOT NULL,
  token_hash TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  physician_id UUID REFERENCES physicians(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_linkedin_sessions_session_id ON linkedin_oauth_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_sessions_expires ON linkedin_oauth_sessions(expires_at);

ALTER TABLE linkedin_oauth_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can create linkedin sessions" ON linkedin_oauth_sessions;
CREATE POLICY "Anyone can create linkedin sessions"
  ON linkedin_oauth_sessions
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Sessions are readable by session_id" ON linkedin_oauth_sessions;
CREATE POLICY "Sessions are readable by session_id"
  ON linkedin_oauth_sessions
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Sessions are deletable" ON linkedin_oauth_sessions;
CREATE POLICY "Sessions are deletable"
  ON linkedin_oauth_sessions
  FOR DELETE
  USING (true);

-- Cleanup function for expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_linkedin_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM linkedin_oauth_sessions
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add LinkedIn import tracking to physicians
ALTER TABLE physicians ADD COLUMN IF NOT EXISTS linkedin_imported_data JSONB;
ALTER TABLE physicians ADD COLUMN IF NOT EXISTS linkedin_import_fields TEXT[];


-- =====================================================
-- PART 4: PHYSICIAN CONSENT (from 005_physician_consent.sql)
-- =====================================================

CREATE TABLE IF NOT EXISTS physician_consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  physician_id UUID REFERENCES physicians(id) ON DELETE CASCADE,
  form_type VARCHAR(50) NOT NULL DEFAULT 'network_agreement',
  form_version VARCHAR(10) NOT NULL,
  language VARCHAR(5) NOT NULL DEFAULT 'en',
  sections JSONB NOT NULL DEFAULT '{}',
  recording_consent BOOLEAN,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_physician_consent_physician_id ON physician_consent_records(physician_id);
CREATE INDEX IF NOT EXISTS idx_physician_consent_form_type ON physician_consent_records(form_type);
CREATE INDEX IF NOT EXISTS idx_physician_consent_version ON physician_consent_records(form_version);

ALTER TABLE physician_consent_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Physicians can view own consent records" ON physician_consent_records;
CREATE POLICY "Physicians can view own consent records"
  ON physician_consent_records
  FOR SELECT
  USING (
    physician_id IN (
      SELECT id FROM physicians WHERE email = auth.jwt() ->> 'email'
    )
  );

DROP POLICY IF EXISTS "Allow inserting consent records" ON physician_consent_records;
CREATE POLICY "Allow inserting consent records"
  ON physician_consent_records
  FOR INSERT
  WITH CHECK (true);

-- Add consent fields to physicians table
ALTER TABLE physicians ADD COLUMN IF NOT EXISTS consent_signed_at TIMESTAMPTZ;
ALTER TABLE physicians ADD COLUMN IF NOT EXISTS consent_version VARCHAR(10);

-- Trigger to auto-update physician consent status
CREATE OR REPLACE FUNCTION update_physician_consent_status()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE physicians
  SET
    consent_signed_at = NEW.signed_at,
    consent_version = NEW.form_version
  WHERE id = NEW.physician_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_physician_consent ON physician_consent_records;
CREATE TRIGGER trigger_update_physician_consent
  AFTER INSERT ON physician_consent_records
  FOR EACH ROW
  EXECUTE FUNCTION update_physician_consent_status();


-- =====================================================
-- VERIFICATION COMPLETE
-- =====================================================

-- Run this to verify all tables were created:
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'physicians',
  'physician_onboarding_audit',
  'physician_verification_results',
  'physician_manual_review_queue',
  'linkedin_oauth_sessions',
  'physician_consent_records'
)
ORDER BY table_name;
