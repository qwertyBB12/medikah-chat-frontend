-- Migration 008: Physician mini-website table
-- Phase 2: Physician Website (free mini-site extending /dr/[slug])

CREATE TABLE IF NOT EXISTS physician_website (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  physician_id UUID REFERENCES physicians(id) ON DELETE CASCADE UNIQUE,
  enabled BOOLEAN DEFAULT true,

  -- Practice Philosophy section
  practice_philosophy TEXT,
  value_pillars JSONB DEFAULT '[]',  -- [{title, description}] max 3

  -- Services section
  services JSONB DEFAULT '[]',  -- [{title, description, icon?}] max 6

  -- FAQ section
  faqs JSONB DEFAULT '[]',  -- [{question, answer}] max 8

  -- Contact/Location
  office_address TEXT,
  office_city TEXT,
  office_country TEXT,
  office_phone TEXT,
  office_email TEXT,
  appointment_url TEXT,

  -- SEO
  custom_tagline TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: physicians can read/write their own website data
ALTER TABLE physician_website ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Physicians manage own website" ON physician_website
  USING (physician_id IN (
    SELECT id FROM physicians WHERE email = auth.jwt() ->> 'email'
  ))
  WITH CHECK (physician_id IN (
    SELECT id FROM physicians WHERE email = auth.jwt() ->> 'email'
  ));

-- Public read for enabled websites
CREATE POLICY "Public read enabled websites" ON physician_website
  FOR SELECT USING (enabled = true);
