-- Physicians table for Medikah network
-- Stores physician profiles from onboarding conversation

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
  -- Example: [{"country": "Mexico", "type": "cedula_profesional", "number": "12345678", "state": null}, {"country": "USA", "type": "state_license", "number": "MD123456", "state": "Texas"}]

  -- Specialty & Certifications
  primary_specialty TEXT,
  sub_specialties TEXT[],
  board_certifications JSONB DEFAULT '[]',
  -- Example: [{"board": "American Board of Internal Medicine", "certification": "Internal Medicine", "year": 2015}]

  -- Education
  medical_school TEXT,
  medical_school_country TEXT,
  graduation_year INTEGER,
  honors TEXT[],

  -- Training
  residency JSONB DEFAULT '[]',
  -- Example: [{"institution": "Mayo Clinic", "specialty": "Internal Medicine", "start_year": 2010, "end_year": 2013}]
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
  available_days TEXT[],  -- ['monday', 'wednesday', 'friday']
  available_hours_start TIME,
  available_hours_end TIME,
  timezone TEXT,
  languages TEXT[] NOT NULL DEFAULT ARRAY['es', 'en'],

  -- Status & Audit
  verification_status TEXT NOT NULL DEFAULT 'pending',
  -- Values: 'pending', 'in_review', 'verified', 'rejected', 'suspended'
  onboarding_completed_at TIMESTAMPTZ,
  onboarding_language TEXT,  -- 'en' or 'es'

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_physicians_email ON physicians(email);
CREATE INDEX idx_physicians_verification_status ON physicians(verification_status);
CREATE INDEX idx_physicians_primary_specialty ON physicians(primary_specialty);
CREATE INDEX idx_physicians_languages ON physicians USING GIN(languages);

-- Row Level Security
ALTER TABLE physicians ENABLE ROW LEVEL SECURITY;

-- Physicians can read their own profile
CREATE POLICY "Physicians can read own profile"
  ON physicians
  FOR SELECT
  USING (auth.uid()::text = id::text OR auth.uid()::text = email);

-- Physicians can insert their own profile (during onboarding)
CREATE POLICY "Physicians can insert own profile"
  ON physicians
  FOR INSERT
  WITH CHECK (true);  -- Onboarding creates profile, auth comes later

-- Physicians can update their own profile
CREATE POLICY "Physicians can update own profile"
  ON physicians
  FOR UPDATE
  USING (auth.uid()::text = id::text OR auth.uid()::text = email);

-- No delete policy - profiles are never deleted, only suspended

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_physicians_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER physicians_updated_at
  BEFORE UPDATE ON physicians
  FOR EACH ROW
  EXECUTE FUNCTION update_physicians_updated_at();

-- Audit log for physician onboarding (immutable)
CREATE TABLE IF NOT EXISTS physician_onboarding_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  physician_id UUID REFERENCES physicians(id),
  email TEXT NOT NULL,
  action TEXT NOT NULL,  -- 'started', 'phase_completed', 'completed', 'abandoned'
  phase TEXT,  -- 'identity', 'licensing', 'specialty', 'education', 'intellectual', 'presence', 'confirmation'
  data_snapshot JSONB,  -- Snapshot of data at this point
  ip_address INET,
  user_agent TEXT,
  language TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for audit log - append only
ALTER TABLE physician_onboarding_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert audit entries"
  ON physician_onboarding_audit
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Physicians can read own audit entries"
  ON physician_onboarding_audit
  FOR SELECT
  USING (email = auth.jwt()->>'email');

-- No UPDATE or DELETE policies - immutable audit trail
