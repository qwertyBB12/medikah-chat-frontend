-- 038_admin_credential_review.sql
-- B3 admin review queue — enable an admin to approve/reject the canonical
-- specialty + education rows that B1/B2 introduced (so a new physician's edits
-- can actually be flipped to verified and become publicly visible).
--
-- Two things were missing for that flow:
--   1. physician_specialties / physician_education allow only
--      ('verified','manual_review','pending') — there is no 'rejected' state for
--      an admin to record an explicit denial. Add it.
--   2. credential_audit_log.target_table CHECK predates these two tables, so an
--      audit row for a specialty/education decision violates the constraint.
--      Extend it.
--
-- Additive + non-destructive: no rows change; only the allowed value sets widen.
-- Idempotent: drops the named constraint if present before re-adding.

-- 1a. physician_specialties: allow 'rejected'
ALTER TABLE physician_specialties
  DROP CONSTRAINT IF EXISTS physician_specialties_verification_status_check;
ALTER TABLE physician_specialties
  ADD CONSTRAINT physician_specialties_verification_status_check
  CHECK (verification_status IN ('verified', 'manual_review', 'pending', 'rejected'));

-- 1b. physician_education: allow 'rejected'
ALTER TABLE physician_education
  DROP CONSTRAINT IF EXISTS physician_education_verification_status_check;
ALTER TABLE physician_education
  ADD CONSTRAINT physician_education_verification_status_check
  CHECK (verification_status IN ('verified', 'manual_review', 'pending', 'rejected'));

-- 2. credential_audit_log: allow auditing the two canonical credential tables
ALTER TABLE credential_audit_log
  DROP CONSTRAINT IF EXISTS credential_audit_log_target_table_check;
ALTER TABLE credential_audit_log
  ADD CONSTRAINT credential_audit_log_target_table_check
  CHECK (target_table IN (
    'physician_licenses',
    'physician_certifications',
    'physicians',
    'physician_specialties',
    'physician_education'
  ));
