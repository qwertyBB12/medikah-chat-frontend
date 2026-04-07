-- Migration 014: Add curp_number to physicians table
-- CURP is a text string (not a document upload), cleaner as a direct column
-- See RESEARCH.md Pitfall 5 — storing CURP in physician_documents repurposes
-- storage_path for text data; a dedicated column is simpler to query and type-safe.

ALTER TABLE physicians ADD COLUMN IF NOT EXISTS curp_number TEXT;

COMMENT ON COLUMN physicians.curp_number IS 'CURP (Clave Unica de Registro de Poblacion) — 18-character Mexican identity code. Format validated against CURP_REGEX in mxCredentialTypes.ts.';
