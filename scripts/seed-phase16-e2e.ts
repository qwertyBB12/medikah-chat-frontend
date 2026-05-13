/**
 * Phase 16 staging integration test seed (one-shot).
 *
 * Provisions a minimal physician + physician_workspace_accounts row for
 * e2etest@medikah.health so mailcowImapAuthorize() resolves a physician_id
 * on the success path during vitest E2E.
 *
 * Idempotent: safe to re-run. Reads .env.local from the frontend root.
 *
 * Usage (from medikah-chat-frontend/):
 *   set -a && source .env.local && set +a && npx tsx scripts/seed-phase16-e2e.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MAILBOX = 'e2etest@medikah.health';
const LOCAL_PART = 'e2etest';
const DOMAIN = 'medikah.health';

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('[seed] NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  // Find or create the physician row.
  const { data: existing, error: findErr } = await admin
    .from('physicians')
    .select('id')
    .eq('email', MAILBOX)
    .maybeSingle();
  if (findErr) {
    console.error('[seed] physicians lookup failed:', findErr);
    process.exit(1);
  }

  let physicianId = existing?.id;
  if (!physicianId) {
    const { data: inserted, error: insertErr } = await admin
      .from('physicians')
      .insert({
        full_name: 'Phase 16 E2E Test',
        email: MAILBOX,
        verification_status: 'pending',
      })
      .select('id')
      .single();
    if (insertErr || !inserted) {
      console.error('[seed] physicians insert failed:', insertErr);
      process.exit(1);
    }
    physicianId = inserted.id;
    console.log('[seed] created physician', physicianId);
  } else {
    console.log('[seed] reusing physician', physicianId);
  }

  // Upsert the workspace account.
  const { data: existingAccount, error: accFindErr } = await admin
    .from('physician_workspace_accounts')
    .select('id, physician_id')
    .eq('mailbox_local_part', LOCAL_PART)
    .eq('mailbox_domain', DOMAIN)
    .maybeSingle();
  if (accFindErr) {
    console.error('[seed] workspace account lookup failed:', accFindErr);
    process.exit(1);
  }

  if (!existingAccount) {
    const { error: accInsertErr } = await admin
      .from('physician_workspace_accounts')
      .insert({
        physician_id: physicianId,
        tier: 'free',
        mailbox_local_part: LOCAL_PART,
        mailbox_domain: DOMAIN,
        mailbox_password_set: true,
      });
    if (accInsertErr) {
      console.error('[seed] workspace account insert failed:', accInsertErr);
      process.exit(1);
    }
    console.log('[seed] created workspace account for', MAILBOX);
  } else {
    console.log('[seed] workspace account exists for', MAILBOX);
  }

  console.log('[seed] done.');
}

main();
