-- 040_contact_emails.sql
-- Dr. José batch 2026-06-28, Change 5 — Personal & Office email in the Credentials
-- → Contact & Practice Info section. These were previously captured only during the
-- onboarding chat and not editable later; the dashboard becomes the editable
-- source of truth. Both nullable text columns; additive and non-destructive.
--
-- NOTE: office_email already exists on the separate `physician_website` table (public
-- website contact, migration 008). This is a DISTINCT column on `physicians` for the
-- credentialing/contact record — they are not the same field.

ALTER TABLE physicians ADD COLUMN IF NOT EXISTS personal_email text;
ALTER TABLE physicians ADD COLUMN IF NOT EXISTS office_email text;

COMMENT ON COLUMN physicians.personal_email IS 'Physician personal email — editable in Credentials → Contact & Practice Info (José change 5, 2026-06-28).';
COMMENT ON COLUMN physicians.office_email IS 'Physician office/work email — editable in Credentials → Contact & Practice Info (José change 5, 2026-06-28).';
