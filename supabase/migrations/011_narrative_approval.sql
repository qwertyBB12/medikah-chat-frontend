-- Migration 011: Narrative approval snapshots
-- Stores physician-approved bio/tagline content as a frozen public snapshot

ALTER TABLE physician_website ADD COLUMN IF NOT EXISTS approved_bio_en TEXT;
ALTER TABLE physician_website ADD COLUMN IF NOT EXISTS approved_bio_es TEXT;
ALTER TABLE physician_website ADD COLUMN IF NOT EXISTS approved_tagline_en TEXT;
ALTER TABLE physician_website ADD COLUMN IF NOT EXISTS approved_tagline_es TEXT;
