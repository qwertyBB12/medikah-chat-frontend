-- Migration 012: Track whether LLM polish was applied to generated bios
-- Phase 4: Optional bounded LLM polish pass

ALTER TABLE physician_website ADD COLUMN IF NOT EXISTS narrative_polished BOOLEAN DEFAULT false;
