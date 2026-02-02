-- Cross-border consultation consent records (append-only audit trail)
create table consent_records (
  id              uuid primary key default gen_random_uuid(),
  user_id         text not null,
  form_type       text not null default 'cross_border_ack',
  form_version    text not null,
  language        text not null,
  checkboxes      jsonb not null,
  recording_consent boolean,
  ip_address      text,
  user_agent      text,
  signed_at       timestamptz not null default now()
);

-- No UPDATE or DELETE — append-only audit trail
alter table consent_records enable row level security;

create policy "Users can read own consent" on consent_records
  for select using (user_id = auth.uid()::text);

create policy "Users can insert own consent" on consent_records
  for insert with check (user_id = auth.uid()::text);
