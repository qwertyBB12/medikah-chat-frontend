-- 039_aguirre_credentialing_changes.sql
-- Dr. Aguirre credentialing-tab change requests (2026-06-28). Additive only.
--
--  Change 1 — office phone: a separate office phone field alongside phone/fax
--             (all three get the dial-code + auto-format treatment in the UI).
--  Change 2 — US board certification number: ABIM-style certification ID captured
--             per US specialty row (MX Consejo is a separate path, untouched).
--  Change 4 — US State ID / Driver License: issuing state + ID number, the US
--             equivalent of the MX CURP identity item. The front/back image
--             uploads reuse physician_documents (document_type us_id_front/back);
--             no schema change needed there.

-- Change 1: office phone column on physicians (phone_number + fax_number already exist)
ALTER TABLE physicians
  ADD COLUMN IF NOT EXISTS office_phone text;

-- Change 4: US identity scalars on physicians (mirrors curp_number)
ALTER TABLE physicians
  ADD COLUMN IF NOT EXISTS us_id_issuing_state text,
  ADD COLUMN IF NOT EXISTS us_id_number text;

-- Change 2: certification number on canonical specialty rows
ALTER TABLE physician_specialties
  ADD COLUMN IF NOT EXISTS certification_number text;

COMMENT ON COLUMN physicians.office_phone IS 'Office phone, stored as a composed +CC national string (Aguirre change 1).';
COMMENT ON COLUMN physicians.us_id_issuing_state IS 'US State ID / Driver License issuing state name (Aguirre change 4).';
COMMENT ON COLUMN physicians.us_id_number IS 'US State ID / Driver License number (Aguirre change 4).';
COMMENT ON COLUMN physician_specialties.certification_number IS 'US board certification number, e.g. ABIM ID — only set for US board-certified rows (Aguirre change 2).';
