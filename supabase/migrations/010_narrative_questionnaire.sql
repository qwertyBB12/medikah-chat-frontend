-- Migration 010: Narrative questionnaire fields + photo thumbnail
-- Phase 1: Structured narrative intake for physician mini-sites
-- Phase 3: Photo thumbnail URL for normalized photos

-- ── Narrative questionnaire responses (raw physician input) ──
ALTER TABLE physician_website ADD COLUMN IF NOT EXISTS first_consult_expectation TEXT;
ALTER TABLE physician_website ADD COLUMN IF NOT EXISTS communication_style TEXT;
ALTER TABLE physician_website ADD COLUMN IF NOT EXISTS specialty_motivation TEXT;
ALTER TABLE physician_website ADD COLUMN IF NOT EXISTS care_values TEXT;
ALTER TABLE physician_website ADD COLUMN IF NOT EXISTS origin_sentence TEXT;
ALTER TABLE physician_website ADD COLUMN IF NOT EXISTS personal_statement TEXT;
ALTER TABLE physician_website ADD COLUMN IF NOT EXISTS personal_interests TEXT;

-- ── Generated content (populated by template engine in Phase 2) ──
ALTER TABLE physician_website ADD COLUMN IF NOT EXISTS generated_bio_en TEXT;
ALTER TABLE physician_website ADD COLUMN IF NOT EXISTS generated_bio_es TEXT;
ALTER TABLE physician_website ADD COLUMN IF NOT EXISTS generated_tagline_en TEXT;
ALTER TABLE physician_website ADD COLUMN IF NOT EXISTS generated_tagline_es TEXT;

-- ── Processing status ──
ALTER TABLE physician_website ADD COLUMN IF NOT EXISTS narrative_status TEXT DEFAULT 'pending';
ALTER TABLE physician_website ADD COLUMN IF NOT EXISTS narrative_collected_at TIMESTAMPTZ;
ALTER TABLE physician_website ADD COLUMN IF NOT EXISTS narrative_generated_at TIMESTAMPTZ;
ALTER TABLE physician_website ADD COLUMN IF NOT EXISTS narrative_approved_at TIMESTAMPTZ;

-- ── Photo thumbnail URL ──
ALTER TABLE physicians ADD COLUMN IF NOT EXISTS photo_thumb_url TEXT;
