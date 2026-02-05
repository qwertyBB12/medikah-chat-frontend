-- Physician Consent Records
-- Stores the signed physician network agreements

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

-- Index for looking up consent by physician
CREATE INDEX idx_physician_consent_physician_id ON physician_consent_records(physician_id);
CREATE INDEX idx_physician_consent_form_type ON physician_consent_records(form_type);
CREATE INDEX idx_physician_consent_version ON physician_consent_records(form_version);

-- RLS policies
ALTER TABLE physician_consent_records ENABLE ROW LEVEL SECURITY;

-- Physicians can view their own consent records
CREATE POLICY "Physicians can view own consent records"
  ON physician_consent_records
  FOR SELECT
  USING (
    physician_id IN (
      SELECT id FROM physicians WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Allow inserting consent records (for the onboarding flow)
CREATE POLICY "Allow inserting consent records"
  ON physician_consent_records
  FOR INSERT
  WITH CHECK (true);

-- Add consent_signed field to physicians table
ALTER TABLE physicians ADD COLUMN IF NOT EXISTS consent_signed_at TIMESTAMPTZ;
ALTER TABLE physicians ADD COLUMN IF NOT EXISTS consent_version VARCHAR(10);

-- Create function to update physician consent status
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

-- Trigger to auto-update physician consent status
DROP TRIGGER IF EXISTS trigger_update_physician_consent ON physician_consent_records;
CREATE TRIGGER trigger_update_physician_consent
  AFTER INSERT ON physician_consent_records
  FOR EACH ROW
  EXECUTE FUNCTION update_physician_consent_status();

-- Comments
COMMENT ON TABLE physician_consent_records IS 'Stores signed physician network agreements';
COMMENT ON COLUMN physician_consent_records.form_type IS 'Type of consent form (network_agreement)';
COMMENT ON COLUMN physician_consent_records.form_version IS 'Version of the consent form signed';
COMMENT ON COLUMN physician_consent_records.sections IS 'JSON object with section IDs that were agreed to';
COMMENT ON COLUMN physician_consent_records.recording_consent IS 'Whether physician consents to consultation recording';
