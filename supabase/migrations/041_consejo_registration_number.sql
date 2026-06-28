-- 041_consejo_registration_number.sql
-- Dr. José batch 2026-06-28, Change 3 — Mexico Consejo board certification gains a
-- registration/certification number field (parallels the US ABIM-number field on
-- physician_specialties). Stored on physician_certifications, the table that holds
-- consejo rows (certification_type='consejo'). Single nullable text column;
-- additive and non-destructive.

ALTER TABLE physician_certifications ADD COLUMN IF NOT EXISTS registration_number text;

COMMENT ON COLUMN physician_certifications.registration_number IS 'Consejo registration/certification number (José change 3, 2026-06-28) — parallels US ABIM id on physician_specialties.';
