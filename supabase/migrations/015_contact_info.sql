-- Migration 015: Contact Info for Credentialing (Phase 7 DASH-05)
-- Adds professional contact fields to physicians table for credential management.
-- Separate from physician_website.office_* fields (which are public website contact info).

ALTER TABLE physicians ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE physicians ADD COLUMN IF NOT EXISTS fax_number TEXT;

-- Mailing address
ALTER TABLE physicians ADD COLUMN IF NOT EXISTS mailing_address_line1 TEXT;
ALTER TABLE physicians ADD COLUMN IF NOT EXISTS mailing_address_city TEXT;
ALTER TABLE physicians ADD COLUMN IF NOT EXISTS mailing_address_state TEXT;
ALTER TABLE physicians ADD COLUMN IF NOT EXISTS mailing_address_postal_code TEXT;
ALTER TABLE physicians ADD COLUMN IF NOT EXISTS mailing_address_country TEXT;

-- Practice address
ALTER TABLE physicians ADD COLUMN IF NOT EXISTS practice_address_line1 TEXT;
ALTER TABLE physicians ADD COLUMN IF NOT EXISTS practice_address_city TEXT;
ALTER TABLE physicians ADD COLUMN IF NOT EXISTS practice_address_state TEXT;
ALTER TABLE physicians ADD COLUMN IF NOT EXISTS practice_address_postal_code TEXT;
ALTER TABLE physicians ADD COLUMN IF NOT EXISTS practice_address_country TEXT;

COMMENT ON COLUMN physicians.phone_number IS 'Primary phone for credentialing correspondence (required for completeness)';
COMMENT ON COLUMN physicians.fax_number IS 'Fax number (optional)';
COMMENT ON COLUMN physicians.mailing_address_line1 IS 'Mailing address line 1 (optional)';
COMMENT ON COLUMN physicians.practice_address_line1 IS 'Practice address line 1 (optional)';
