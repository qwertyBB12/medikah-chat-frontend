/**
 * Phase 18 CARRY-18-A — shared support for the isolated TOTP re-enrollment flow
 * (`/api/auth/reenroll/start` + `/api/auth/reenroll/confirm`).
 *
 * This path is DELIBERATELY separate from the main `mailcow-imap` NextAuth
 * provider so the shared login hot path carries no new branching (blast-radius
 * containment). Re-enrollment is opened ONLY by an admin-approved reset, which
 * sets `totp_enrolled=false` on an account that is still `activation_complete=true`.
 * Two factors gate it: the Mailcow password (verified here by a TLS-only IMAP
 * probe) AND the prior out-of-band admin approval. A stolen password alone cannot
 * re-enroll, because without an approved reset the account is still
 * `totp_enrolled=true` and `resolveReenrollTarget` returns `not_eligible`.
 */

import { ImapFlow } from 'imapflow';
import type { NextApiRequest } from 'next';
import { supabaseAdmin } from '../supabaseServer';

const IMAP_HOST = 'practikah.medikah.health';

// Rate-limit: 3 failures in the trailing 5 minutes from one source IP (mirrors
// the Phase 16 auth_probe_attempts pattern used by the login provider).
const RATE_LIMIT_WINDOW_MS = 5 * 60_000;
const RATE_LIMIT_MAX_FAILURES = 3;

// ---------------------------------------------------------------------------
// Request context
// ---------------------------------------------------------------------------

export function extractSourceIp(req: NextApiRequest): string | null {
  const nfIp = req.headers['x-nf-client-connection-ip'];
  const fromNetlify =
    typeof nfIp === 'string' ? nfIp : Array.isArray(nfIp) ? nfIp[0] : undefined;
  if (fromNetlify) return fromNetlify;

  const forwarded = req.headers['x-forwarded-for'];
  const fromForwarded =
    typeof forwarded === 'string'
      ? forwarded.split(',')[0]?.trim()
      : Array.isArray(forwarded)
        ? forwarded[0]
        : undefined;
  if (fromForwarded) return fromForwarded;

  return req.socket?.remoteAddress ?? null;
}

// ---------------------------------------------------------------------------
// Rate-limit ledger (auth_probe_attempts)
// ---------------------------------------------------------------------------

export async function isIpRateLimited(sourceIp: string): Promise<boolean> {
  if (!supabaseAdmin) return false;
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const { data, error } = await supabaseAdmin
    .from('auth_probe_attempts')
    .select('id, outcome')
    .eq('source_ip', sourceIp)
    .gte('attempted_at', windowStart)
    .order('attempted_at', { ascending: false })
    .limit(20);
  if (error) {
    // Fail open on a Supabase outage — Mailcow's own fail2ban still rate-limits
    // the IMAP probe at the connection level.
    console.error('[reenroll] rate-limit query failed', error.message);
    return false;
  }
  const failures = (data ?? []).filter((r: { outcome: string }) => r.outcome !== 'success').length;
  return failures >= RATE_LIMIT_MAX_FAILURES;
}

export async function writeReenrollProbe(
  sourceIp: string | null,
  attemptedEmail: string | null,
  outcome: 'success' | 'bad_password' | 'locked_out' | 'infra_error',
  userAgent: string | undefined,
): Promise<void> {
  if (!supabaseAdmin) return;
  try {
    await supabaseAdmin.from('auth_probe_attempts').insert({
      source_ip: sourceIp,
      attempted_email: attemptedEmail,
      outcome,
      user_agent: userAgent ?? null,
    });
  } catch (err) {
    console.error('[reenroll] auth_probe_attempts insert threw', err);
  }
}

// ---------------------------------------------------------------------------
// TLS-only IMAP password probe
// ---------------------------------------------------------------------------

/** Returns true iff the email + password authenticate against Mailcow IMAP. */
export async function probeMailboxPassword(email: string, password: string): Promise<boolean> {
  const client = new ImapFlow({
    host: IMAP_HOST,
    port: 993,
    secure: true,
    auth: { user: email, pass: password },
    logger: false,
    socketTimeout: 5000,
  });
  try {
    await client.connect();
    try {
      await client.logout();
    } catch {
      // A logout failure after a successful connect is not an auth failure.
    }
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Eligibility resolution
// ---------------------------------------------------------------------------

export type ReenrollTarget =
  | {
      ok: true;
      physicianId: string;
      localPart: string;
      domain: string;
      totpSecret: string | null;
    }
  | { ok: false; reason: 'unknown' | 'not_eligible' };

/**
 * Resolve the physician for a mailbox and confirm the account is in the
 * re-enroll window: `activation_complete=true` AND `totp_enrolled=false`
 * (exactly the post-admin-approval state). Anything else — no account, still
 * enrolled (no approved reset), or not activated — returns `not_eligible`.
 */
export async function resolveReenrollTarget(email: string): Promise<ReenrollTarget> {
  if (!supabaseAdmin) return { ok: false, reason: 'unknown' };
  const lowered = email.toLowerCase();
  const atIdx = lowered.indexOf('@');
  if (atIdx <= 0 || atIdx === lowered.length - 1) return { ok: false, reason: 'unknown' };
  const localPart = lowered.slice(0, atIdx);
  const domain = lowered.slice(atIdx + 1);

  const { data: account } = await supabaseAdmin
    .from('physician_workspace_accounts')
    .select('physician_id, activation_complete, totp_enrolled, totp_secret')
    .eq('mailbox_local_part', localPart)
    .eq('mailbox_domain', domain)
    .maybeSingle();

  if (!account?.physician_id) return { ok: false, reason: 'unknown' };
  if (account.activation_complete !== true || account.totp_enrolled === true) {
    return { ok: false, reason: 'not_eligible' };
  }
  return {
    ok: true,
    physicianId: account.physician_id,
    localPart,
    domain,
    totpSecret: (account.totp_secret as string | null) ?? null,
  };
}
