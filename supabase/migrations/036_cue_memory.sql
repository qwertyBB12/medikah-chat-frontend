-- 036_cue_memory.sql — Phase 25 Slice 1: Cue cross-session memory.
-- Portable, doctor-owned memory in Medikah's OWN Supabase, keyed to physician_id
-- (CUE-11). Service-role only in Slice 1; doctor-visible RLS lands in Slice 3.
-- Legal frame: LFPDPPP + NOM-024-SSA3 (datos sensibles), no BAA.

create extension if not exists vector;

create table if not exists cue_memory_notes (
  id           uuid primary key default gen_random_uuid(),
  physician_id uuid not null references physicians(id) on delete cascade,
  note         text not null,                               -- redacted, third-person, 1 sentence
  category     text not null default 'general',             -- identity|practice|project|follow_up|preference|general
  source_tag   text not null default 'judge-inferred',      -- judge-inferred|user-said|admin-note
  embedding    vector(1536),                                -- Slice 2; nullable until then
  salience     smallint not null default 1,                 -- Slice 2 consolidation weight
  locale       text,                                        -- 'en'|'es' at write time
  appended_at  timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  expires_at   timestamptz                                  -- PATCH-03 retention TTL; null = default policy
);

create index if not exists idx_cue_memory_notes_phys_time
  on cue_memory_notes (physician_id, updated_at desc);

alter table cue_memory_notes enable row level security;

create policy "service_role full access" on cue_memory_notes
  for all to service_role using (true) with check (true);

-- PATCH-03 — one-time aviso acknowledgment per physician. Writes are gated on a row here.
create table if not exists cue_memory_consent (
  physician_id    uuid primary key references physicians(id) on delete cascade,
  aviso_version   text not null,
  acknowledged_at timestamptz not null default now()
);

alter table cue_memory_consent enable row level security;

create policy "service_role full access" on cue_memory_consent
  for all to service_role using (true) with check (true);
