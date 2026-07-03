-- 042: Isabel standing agent (task #28) — mailbox watcher state, draft queue,
-- append-only action log. Written by the kah-operations GH Actions watcher
-- (service role) and read/flipped by /api/admin/isabel-review + isabel-consume.
-- Service-role only: RLS enabled with NO policies on all three tables.

create table if not exists isabel_watch_state (
  id text primary key,
  last_uid bigint not null default 0,
  uidvalidity bigint,
  updated_at timestamptz not null default now()
);

create table if not exists isabel_drafts (
  id uuid primary key default gen_random_uuid(),
  source_uid bigint,
  source_message_id text,
  source_from text not null,
  source_subject text,
  source_excerpt text,
  recipient text not null,
  reply_to_message_id text,
  reply_subject text not null,
  reply_body text not null,
  classification text not null,
  confidence text,
  model text,
  status text not null default 'pending'
    check (status in ('pending', 'approved_sent', 'rejected', 'expired', 'send_failed')),
  token_hash text not null unique,
  token_expires_at timestamptz not null,
  decided_at timestamptz,
  decided_by text,
  sent_email_id text,
  send_error text,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

-- Dedup guard for the watcher (Message-ID can be absent, hence partial).
create unique index if not exists isabel_drafts_source_message_id_key
  on isabel_drafts (source_message_id) where source_message_id is not null;

create index if not exists isabel_drafts_status_idx on isabel_drafts (status);

create table if not exists isabel_action_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor text not null,
  action text not null,
  detail jsonb
);

alter table isabel_watch_state enable row level security;
alter table isabel_drafts enable row level security;
alter table isabel_action_log enable row level security;
