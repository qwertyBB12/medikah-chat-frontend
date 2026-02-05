-- LinkedIn OAuth session storage for physician onboarding
-- Temporary storage for OAuth flow and profile data

CREATE TABLE IF NOT EXISTS linkedin_oauth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,

  -- Profile data (JSON, not sensitive)
  profile_data JSONB NOT NULL,

  -- Token reference (hashed, not the actual token)
  token_hash TEXT,

  -- Session lifecycle
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Link to physician if profile is created
  physician_id UUID REFERENCES physicians(id) ON DELETE CASCADE
);

-- Index for session lookup
CREATE INDEX IF NOT EXISTS idx_linkedin_sessions_session_id ON linkedin_oauth_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_sessions_expires ON linkedin_oauth_sessions(expires_at);

-- RLS
ALTER TABLE linkedin_oauth_sessions ENABLE ROW LEVEL SECURITY;

-- Allow insert/read for anyone (session-based auth)
CREATE POLICY "Anyone can create linkedin sessions"
  ON linkedin_oauth_sessions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Sessions are readable by session_id"
  ON linkedin_oauth_sessions
  FOR SELECT
  USING (true);

CREATE POLICY "Sessions are deletable"
  ON linkedin_oauth_sessions
  FOR DELETE
  USING (true);

-- Auto-cleanup expired sessions (run via cron job or Supabase scheduled function)
-- This function can be called periodically to clean up
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

-- Add linkedin_imported_data column to physicians table to track what was imported
ALTER TABLE physicians ADD COLUMN IF NOT EXISTS linkedin_imported_data JSONB;
ALTER TABLE physicians ADD COLUMN IF NOT EXISTS linkedin_import_fields TEXT[];
