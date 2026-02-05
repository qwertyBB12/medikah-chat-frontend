-- Verification system for physician credentials
-- Supports 3-tier verification: Auto, Semi-Auto, Manual

-- Add verification fields to physicians table
ALTER TABLE physicians ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE physicians ADD COLUMN IF NOT EXISTS verified_by TEXT; -- 'auto', 'semi-auto', 'manual:{reviewer_id}'
ALTER TABLE physicians ADD COLUMN IF NOT EXISTS verification_notes TEXT;
ALTER TABLE physicians ADD COLUMN IF NOT EXISTS verification_tier TEXT; -- 'tier1', 'tier2', 'tier3'

-- Verification results - tracks what was verified and how
CREATE TABLE IF NOT EXISTS physician_verification_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  physician_id UUID NOT NULL REFERENCES physicians(id) ON DELETE CASCADE,

  -- What was verified
  verification_type TEXT NOT NULL,
  -- Values: 'license_mexico', 'license_usa', 'education_linkedin', 'publications_scholar',
  --         'professional_presence', 'board_certification', 'international_credential'

  -- Reference to the specific credential being verified
  credential_reference JSONB, -- e.g., {"license_index": 0, "country": "Mexico", "number": "12345678"}

  -- Verification result
  status TEXT NOT NULL DEFAULT 'pending',
  -- Values: 'pending', 'verified', 'failed', 'manual_review', 'rejected'

  -- How it was verified
  verification_method TEXT NOT NULL,
  -- Values: 'cofepris_api', 'state_medical_board', 'linkedin_match', 'scholar_fetch', 'manual_review'

  -- External verification data
  external_data JSONB, -- Raw response from external API/source
  match_confidence DECIMAL(3,2), -- 0.00 to 1.00 for semi-auto matches

  -- Discrepancies found (if any)
  discrepancies JSONB, -- [{field: "graduation_year", submitted: 2010, found: 2011}]

  -- Audit
  verified_at TIMESTAMPTZ,
  verified_by TEXT, -- 'system' or reviewer user_id
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Manual review queue for Tier 3
CREATE TABLE IF NOT EXISTS physician_manual_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  physician_id UUID NOT NULL REFERENCES physicians(id) ON DELETE CASCADE,
  verification_result_id UUID REFERENCES physician_verification_results(id),

  -- Review details
  review_type TEXT NOT NULL,
  -- Values: 'license_not_found', 'international_credential', 'data_discrepancy', 'board_certification'

  priority TEXT NOT NULL DEFAULT 'normal',
  -- Values: 'urgent', 'high', 'normal', 'low'

  -- What needs review
  review_data JSONB NOT NULL, -- Contains all relevant info for reviewer
  reason TEXT NOT NULL, -- Why this needs manual review

  -- SLA tracking
  sla_deadline TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '48 hours'),

  -- Assignment
  assigned_to TEXT, -- reviewer user_id
  assigned_at TIMESTAMPTZ,

  -- Resolution
  status TEXT NOT NULL DEFAULT 'pending',
  -- Values: 'pending', 'in_progress', 'approved', 'rejected', 'escalated'

  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_verification_results_physician ON physician_verification_results(physician_id);
CREATE INDEX IF NOT EXISTS idx_verification_results_status ON physician_verification_results(status);
CREATE INDEX IF NOT EXISTS idx_verification_results_type ON physician_verification_results(verification_type);

CREATE INDEX IF NOT EXISTS idx_manual_review_status ON physician_manual_review_queue(status);
CREATE INDEX IF NOT EXISTS idx_manual_review_sla ON physician_manual_review_queue(sla_deadline) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_manual_review_physician ON physician_manual_review_queue(physician_id);
CREATE INDEX IF NOT EXISTS idx_manual_review_assigned ON physician_manual_review_queue(assigned_to) WHERE status = 'in_progress';

-- RLS Policies
ALTER TABLE physician_verification_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE physician_manual_review_queue ENABLE ROW LEVEL SECURITY;

-- Physicians can read their own verification results
CREATE POLICY "Physicians can read own verification results"
  ON physician_verification_results
  FOR SELECT
  USING (
    physician_id IN (
      SELECT id FROM physicians WHERE email = auth.jwt()->>'email'
    )
  );

-- System/admins can insert verification results (via service role)
CREATE POLICY "Service role can manage verification results"
  ON physician_verification_results
  FOR ALL
  USING (auth.role() = 'service_role');

-- Manual review queue - only accessible to admins/reviewers
CREATE POLICY "Service role can manage review queue"
  ON physician_manual_review_queue
  FOR ALL
  USING (auth.role() = 'service_role');

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_verification_results_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

CREATE TRIGGER manual_review_updated_at
  BEFORE UPDATE ON physician_manual_review_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_manual_review_updated_at();

-- Function to check if all verifications passed for a physician
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

  -- Fully verified if no pending/manual_review AND no failures
  RETURN pending_count = 0 AND failed_count = 0;
END;
$$ LANGUAGE plpgsql;
