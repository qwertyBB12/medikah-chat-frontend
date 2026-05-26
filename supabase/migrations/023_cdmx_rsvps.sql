-- CDMX launch event RSVP list (medikah.health/cdmx)
-- Mexico City launch — June 23–25, 2026 (evening of the 23rd).
-- Writes happen server-side via the service role (bypasses RLS), so no public
-- insert policy is granted; the table stays locked down to anon/auth clients.

create table if not exists public.cdmx_rsvps (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null unique,
  profession  text,
  locale      text default 'es',
  created_at  timestamptz not null default now()
);

create index if not exists cdmx_rsvps_created_at_idx on public.cdmx_rsvps (created_at desc);

alter table public.cdmx_rsvps enable row level security;
-- (no policies: only the service-role server key may read/write)
