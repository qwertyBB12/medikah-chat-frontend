/**
 * Mailcow workspace provisioner — Option A any-email onboarding (2026-06-27).
 *
 * Server-side, admin-initiated provisioning of a physician's @medikah.health
 * mailbox at credential-verification time. This removes the Google-OAuth + post-login
 * wizard requirement from onboarding: a verified doctor on ANY email domain gets a
 * mailbox + activation link without ever running the wizard.
 *
 * Flow (called from the admin verify path, BEFORE triggerWorkspaceActivation):
 *   1. Derive (or accept an admin-supplied) mailbox local-part. The honorific
 *      prefix is gendered — dra-garcia / dr-lopez — and is NEVER guessed from a
 *      name (see feedback_dr_dra_title_mexico): the title is captured at onboarding
 *      or picked by the admin at verify time.
 *   2. Create the Mailcow mailbox with a random throwaway password. The doctor sets
 *      their real password later via the activation magic-link → set-password.ts
 *      (which calls /api/v1/edit/mailbox). mailbox_password_set stays FALSE until then.
 *   3. Upsert physician_workspace_accounts with mailbox_local_part — which is exactly
 *      the field triggerWorkspaceActivation gates on. Provision THEN activate; the gate
 *      then opens and the activation email is sent.
 *
 * Security:
 *   - The throwaway mailbox password is NEVER logged (mirrors set-password.ts /
 *     mailbox_provisioner.py threat model).
 *   - Talks to Mailcow Admin API directly via MAILCOW_API_URL + MAILCOW_API_KEY,
 *     the same env the already-shipped set-password.ts route uses.
 */

import crypto from 'crypto';
import { supabaseAdmin } from './supabaseServer';
import {
  MAILBOX_DOMAIN,
  deriveLocalPart,
  isUsableLocalPart,
  type PhysicianTitle,
} from './mailcowLocalPart';

// Re-export the pure helpers so existing import sites (and tests) keep working.
export { slugifySegment, deriveLocalPart, isUsableLocalPart, MAILBOX_DOMAIN } from './mailcowLocalPart';
export type { PhysicianTitle } from './mailcowLocalPart';

const DEFAULT_QUOTA_MB = 10240; // 10 GB — matches MAIL-08 / wizard free tier
const MAX_COLLISION_SUFFIX = 9;

export type ProvisionResult =
  | { status: 'provisioned'; localPart: string; mailboxAddress: string }
  | { status: 'already_provisioned'; localPart: string; mailboxAddress: string }
  | {
      status: 'failed';
      reason:
        | 'not_configured'
        | 'mailcow_not_configured'
        | 'physician_not_found'
        | 'title_required'
        | 'invalid_local_part'
        | 'local_part_taken'
        | 'no_available_local_part'
        | 'mailcow_error'
        | 'db_error';
      detail?: string;
    };

// ---------------------------------------------------------------------------
// Throwaway password
// ---------------------------------------------------------------------------

/**
 * Generate a throwaway mailbox password (never persisted in plaintext, never
 * logged). The doctor overwrites it via the activation link. Guarantees ≥12 chars
 * and a mix of classes so it satisfies Mailcow's password policy.
 */
function generateThrowawayPassword(): string {
  const raw = crypto.randomBytes(24).toString('base64url'); // url-safe, ~32 chars
  // base64url yields [A-Za-z0-9_-]; guarantee a digit + symbol + upper + lower.
  return `Aa1!${raw}`;
}

// ---------------------------------------------------------------------------
// Mailcow Admin API helpers
// ---------------------------------------------------------------------------

function mailcowSettings(): { url: string; key: string } | null {
  const url = process.env.MAILCOW_API_URL;
  const key = process.env.MAILCOW_API_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/+$/, ''), key };
}

/** GET /api/v1/get/mailbox/<address> → true if the mailbox already exists. */
async function isMailboxTaken(url: string, key: string, address: string): Promise<boolean> {
  const res = await fetch(`${url}/api/v1/get/mailbox/${encodeURIComponent(address)}`, {
    headers: { 'X-API-Key': key, 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    // Treat an errored lookup as "taken" (fail closed) so we never collide.
    throw new Error(`mailcow get/mailbox HTTP ${res.status}`);
  }
  const data: unknown = await res.json().catch(() => null);
  // Mailcow returns {} / [] when absent, or a dict with username when present.
  return (
    !!data &&
    typeof data === 'object' &&
    !Array.isArray(data) &&
    (data as Record<string, unknown>).username === address
  );
}

/**
 * Parse Mailcow's write envelope: [{type:'success'|'danger'|'error', msg}].
 * Returns null on success, or a human-readable error string.
 */
function parseMailcowWriteError(body: unknown): string | null {
  if (!Array.isArray(body) || body.length === 0) return null;
  const item = body[0] as Record<string, unknown>;
  const type = String(item?.type ?? '');
  if (type === 'success') return null;
  if (type === 'danger' || type === 'error') {
    const msg = item?.msg;
    return Array.isArray(msg) ? msg.map(String).join(' ') : String(msg ?? 'Unknown Mailcow error');
  }
  return null;
}

// ---------------------------------------------------------------------------
// provisionWorkspaceMailbox — the saga
// ---------------------------------------------------------------------------

export interface ProvisionOptions {
  physicianId: string;
  /** Honorific. Falls back to physicians.title if omitted; required one way or another. */
  title?: PhysicianTitle | null;
  /** Admin-supplied local-part. When present it is used verbatim (validated, not auto-suffixed on collision). */
  localPartOverride?: string | null;
}

/**
 * Idempotently provision the physician's @medikah.health mailbox + workspace row.
 * Safe to call on every verify flip — returns 'already_provisioned' if a mailbox
 * local-part is already on file.
 */
export async function provisionWorkspaceMailbox(opts: ProvisionOptions): Promise<ProvisionResult> {
  const { physicianId } = opts;

  if (!supabaseAdmin) {
    return { status: 'failed', reason: 'not_configured', detail: 'supabaseAdmin unavailable' };
  }
  const mc = mailcowSettings();
  if (!mc) {
    return { status: 'failed', reason: 'mailcow_not_configured', detail: 'MAILCOW_API_URL/KEY unset' };
  }

  // 1. Load physician (name + title source-of-truth)
  const { data: physician, error: physErr } = await supabaseAdmin
    .from('physicians')
    .select('id, full_name, title')
    .eq('id', physicianId)
    .maybeSingle();
  if (physErr) return { status: 'failed', reason: 'db_error', detail: physErr.message };
  if (!physician) return { status: 'failed', reason: 'physician_not_found' };

  const title = (opts.title ?? (physician.title as PhysicianTitle | null)) || null;
  if (title !== 'Dr' && title !== 'Dra') {
    return { status: 'failed', reason: 'title_required' };
  }

  // 2. Idempotency — already provisioned?
  const { data: existingWs, error: wsErr } = await supabaseAdmin
    .from('physician_workspace_accounts')
    .select('mailbox_local_part')
    .eq('physician_id', physicianId)
    .maybeSingle();
  if (wsErr) return { status: 'failed', reason: 'db_error', detail: wsErr.message };
  if (existingWs?.mailbox_local_part) {
    const lp = existingWs.mailbox_local_part as string;
    return { status: 'already_provisioned', localPart: lp, mailboxAddress: `${lp}@${MAILBOX_DOMAIN}` };
  }

  // 3. Resolve the local-part (admin override verbatim, else derive + collision-suffix)
  const override = opts.localPartOverride?.trim().toLowerCase() || '';
  let localPart = '';
  try {
    if (override) {
      if (!isUsableLocalPart(override)) {
        return { status: 'failed', reason: 'invalid_local_part', detail: override };
      }
      if (await isMailboxTaken(mc.url, mc.key, `${override}@${MAILBOX_DOMAIN}`)) {
        return { status: 'failed', reason: 'local_part_taken', detail: override };
      }
      localPart = override;
    } else {
      const base = deriveLocalPart(physician.full_name as string, title);
      if (!isUsableLocalPart(base)) {
        return { status: 'failed', reason: 'invalid_local_part', detail: base || '(empty)' };
      }
      localPart = await resolveAvailableLocalPart(mc.url, mc.key, base);
      if (!localPart) return { status: 'failed', reason: 'no_available_local_part', detail: base };
    }
  } catch (err) {
    return { status: 'failed', reason: 'mailcow_error', detail: err instanceof Error ? err.message : String(err) };
  }

  const mailboxAddress = `${localPart}@${MAILBOX_DOMAIN}`;

  // 4. Create the Mailcow mailbox with a throwaway password (NEVER logged).
  //    password === password2 (single generated value). The doctor overwrites it
  //    via the activation link; mailbox_password_set stays false until then.
  const throwaway = generateThrowawayPassword();
  let mcRes: Response;
  try {
    mcRes = await fetch(`${mc.url}/api/v1/add/mailbox`, {
      method: 'POST',
      headers: { 'X-API-Key': mc.key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        local_part: localPart,
        domain: MAILBOX_DOMAIN,
        password: throwaway,
        password2: throwaway,
        quota: DEFAULT_QUOTA_MB,
        active: '1',
        force_pw_update: '0',
      }),
    });
  } catch (err) {
    return { status: 'failed', reason: 'mailcow_error', detail: err instanceof Error ? err.message : 'unreachable' };
  }

  if (!mcRes.ok) {
    // Log only the HTTP status — never the password
    console.error('[mailcowProvisioner] add/mailbox HTTP error', { status: mcRes.status, physicianId });
    return { status: 'failed', reason: 'mailcow_error', detail: `HTTP ${mcRes.status}` };
  }
  const mcBody: unknown = await mcRes.json().catch(() => null);
  const mcErr = parseMailcowWriteError(mcBody);
  if (mcErr) {
    console.error('[mailcowProvisioner] add/mailbox rejected', { physicianId, error: mcErr });
    return { status: 'failed', reason: 'mailcow_error', detail: mcErr };
  }

  // 5. Upsert the workspace row — mailbox_local_part opens the activation gate.
  const { error: upsertErr } = await supabaseAdmin
    .from('physician_workspace_accounts')
    .upsert(
      {
        physician_id: physicianId,
        tier: 'free',
        state: 'free_active',
        title,
        mailbox_local_part: localPart,
        mailbox_domain: MAILBOX_DOMAIN,
        mailbox_address: mailboxAddress,
        mailbox_quota_mb: DEFAULT_QUOTA_MB,
        mailbox_password_set: false,
        workspace_setup_completed_at: new Date().toISOString(),
      },
      { onConflict: 'physician_id' },
    );
  if (upsertErr) {
    // The mailbox now exists in Mailcow but the row failed — surface it; the admin
    // can retry (idempotent: GET-before-add skips the existing mailbox next time).
    console.error('[mailcowProvisioner] workspace upsert failed', { physicianId, error: upsertErr.message });
    return { status: 'failed', reason: 'db_error', detail: upsertErr.message };
  }

  return { status: 'provisioned', localPart, mailboxAddress };
}

/**
 * Find the first available local-part starting from `base`, then base2..base9.
 * Returns '' if none of the candidates are free.
 */
async function resolveAvailableLocalPart(url: string, key: string, base: string): Promise<string> {
  for (let i = 0; i <= MAX_COLLISION_SUFFIX; i++) {
    const candidate = i === 0 ? base : `${base}${i + 1}`;
    if (!isUsableLocalPart(candidate)) continue;
    const taken = await isMailboxTaken(url, key, `${candidate}@${MAILBOX_DOMAIN}`);
    if (!taken) return candidate;
  }
  return '';
}
