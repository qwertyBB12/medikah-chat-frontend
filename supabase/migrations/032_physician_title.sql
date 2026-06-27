-- 032_physician_title.sql
-- Option A any-email onboarding (2026-06-27): capture the physician honorific.
--
-- WHY: The auto-assigned Práctikah mailbox local-part is gendered in the Mexican
-- market — Doctora (Dra.) for women, Doctor (Dr.) for men. Getting it wrong is a
-- real offense, and we must NEVER infer gender from a name. So we capture the
-- title explicitly: at onboarding ("How should patients address you?" → Dr/Dra)
-- going forward, with the admin verify screen as a safety net for legacy records.
--
-- The honorific drives the public profile, transactional emails, and the mailbox
-- local-part (dra-garcia / dr-lopez). physician_workspace_accounts.title (added in
-- 018) mirrors the chosen value at provisioning time; this column on physicians is
-- the identity source-of-truth captured at onboarding.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS. Nullable — legacy rows stay NULL until an
-- admin picks the title at verify time.

ALTER TABLE physicians
  ADD COLUMN IF NOT EXISTS title TEXT NULL
  CONSTRAINT physicians_title_check
    CHECK (title IS NULL OR title IN ('Dr', 'Dra'));

COMMENT ON COLUMN physicians.title IS
  'Physician honorific: Dr (Doctor) | Dra (Doctora) | NULL (not yet captured). '
  'Captured at onboarding ("How should patients address you?"); drives profile, '
  'emails, and the auto-assigned mailbox local-part (dra-/dr- prefix). Never '
  'inferred from name — Dr/Dra correctness matters in the Mexican market.';
