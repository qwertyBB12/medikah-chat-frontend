-- CDMX talk series (June 22–30, 2026): ordered session preferences + WhatsApp
-- as real columns, replacing the fold-into-profession hack from 023.
-- Existing rows keep their folded profession data for manual reconciliation.
-- (CMO spec: kah-operations 07-deliverables/cdmx-page-update-SPEC.md)

alter table public.cdmx_rsvps
  add column if not exists preferred_sessions text[],
  add column if not exists whatsapp text;

comment on column public.cdmx_rsvps.preferred_sessions is
  'Ordered top-3 session ids (e.g. jun22-0900) — first element is first choice';
comment on column public.cdmx_rsvps.whatsapp is
  'WhatsApp number with country code, as typed by the registrant';
