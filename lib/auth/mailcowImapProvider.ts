/**
 * Phase 16 — Mailcow IMAP NextAuth provider helper (authorize() body).
 *
 * Owns the full probe pipeline for the `mailcow-imap` NextAuth provider:
 *   1. Missing-field short-circuit          → bad_password
 *   2. supabaseAdmin null-guard             → returns null (fails closed)
 *   3. Source-IP + UA extraction (D-08)
 *   4. Per-IP rate-limit ledger query (D-04, D-05) — 3 failures / 5 min → locked_out
 *   5. TLS-only IMAP probe to imap.medikah.health:993 (D-02)
 *   6. physician_workspace_accounts.mailbox_email → physician_id (D-03)
 *   7. physicians lookup for the D-10 claim snapshot
 *   8. auth_probe_attempts row written on every exit path (T-16-08)
 *   9. workspace_audit_log row written via logEvent ONLY when a physician_id resolves
 *      (success path; locked_out subjects with prior known physician_id) — D-06 / PATTERNS note 3
 *  10. Return user object carrying the D-10 claim set on success
 *
 * JWT issuance is NOT gated on physicians.verification_status (D-09). The status is
 * carried only as a render hint. The Phase 11 verified_physician FastAPI dependency
 * continues to gate /practikah/* endpoints.
 *
 * D-11 hard-block: IMAP success + zero workspace_account rows == infra_error, no JWT.
 *
 * Outcome enum (D-07): success | bad_password | unknown_user | locked_out | infra_error.
 * Note: `unknown_user` is the documented enum value for "IMAP OK but no workspace row";
 * we route that case through `infra_error` per D-11 because it represents a data
 * integrity violation, not an authentication problem. The literal appears here so the
 * outcome union remains discoverable by readers.
 */

import { ImapFlow } from 'imapflow';
import type { NextApiRequest } from 'next';
import { supabaseAdmin } from '../supabaseServer';
import { logEvent } from '../workspaceAuditService';

// ---------------------------------------------------------------------------
// Outcome type
// ---------------------------------------------------------------------------

type ProbeOutcome =
  | 'success'
  | 'bad_password'
  // 'unknown_user' is reserved by D-07 for an IMAP-OK + missing-workspace-row
  // case; in practice we route that through 'infra_error' per D-11. The literal
  // is referenced here so the full D-07 enum stays visible.
  | 'locked_out'
  | 'infra_error';

interface ProvisionedPhysician {
  id: string;
  name: string | null;
  email: string | null;
  verification_status: 'pending' | 'in_review' | 'verified' | 'rejected' | null;
}

// ---------------------------------------------------------------------------
// Request context extraction (D-08)
// ---------------------------------------------------------------------------

type AnyRequestLike =
  | NextApiRequest
  | {
      headers?: Record<string, string | string[] | undefined>;
      socket?: { remoteAddress?: string };
    }
  | null
  | undefined;

function extractSourceIp(req: AnyRequestLike): string | null {
  if (!req || !req.headers) return null;
  // D-08 — Netlify edge sets x-nf-client-connection-ip and overrides client-supplied values.
  const nfIp = req.headers['x-nf-client-connection-ip'];
  const fromNetlify =
    typeof nfIp === 'string'
      ? nfIp
      : Array.isArray(nfIp)
        ? nfIp[0]
        : undefined;
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

function extractUserAgent(req: AnyRequestLike): string | undefined {
  if (!req || !req.headers) return undefined;
  const ua = req.headers['user-agent'];
  return typeof ua === 'string' ? ua : undefined;
}

// ---------------------------------------------------------------------------
// Audit ledger writer — auth_probe_attempts (T-16-08, write on every exit path)
// ---------------------------------------------------------------------------

async function writeProbeAttempt(
  sourceIp: string | null,
  attemptedEmail: string | null,
  outcome: ProbeOutcome,
  userAgent: string | undefined,
): Promise<void> {
  if (!supabaseAdmin) return;
  try {
    const { error } = await supabaseAdmin.from('auth_probe_attempts').insert({
      source_ip: sourceIp,
      attempted_email: attemptedEmail,
      outcome,
      user_agent: userAgent ?? null,
    });
    if (error) {
      console.error('[mailcowImapProvider] auth_probe_attempts insert failed', {
        outcome,
        error: error.message,
      });
    }
  } catch (err) {
    console.error('[mailcowImapProvider] auth_probe_attempts insert threw', err);
  }
}

// ---------------------------------------------------------------------------
// IMAP probe (D-02 — TLS-only, 5s timeouts, immediate logout, no folder list)
// ---------------------------------------------------------------------------

type ImapProbeResult = { ok: true } | { ok: false; reason: 'bad_password' | 'infra_error' };

async function probeImap(email: string, password: string): Promise<ImapProbeResult> {
  const client = new ImapFlow({
    host: 'imap.medikah.health',
    port: 993,
    secure: true, // TLS-only — no STARTTLS, no plaintext fallback
    auth: { user: email, pass: password },
    logger: false,
    socketTimeout: 5000,
  });
  try {
    await client.connect();
    try {
      await client.logout();
    } catch {
      // Logout failures after a successful connect are not auth failures.
    }
    return { ok: true };
  } catch (err: unknown) {
    // Distinguish authentication failures from transport failures. ImapFlow
    // surfaces auth failures via err.authenticationFailed === true and/or
    // err.code === 'AUTHENTICATIONFAILED'. Connection / TLS / timeout
    // failures surface ECONNREFUSED, ETIMEDOUT, ECONNRESET, EHOSTUNREACH,
    // ENOTFOUND, or a Timeout-flagged ImapFlow error.
    const e = err as { code?: string; authenticationFailed?: boolean; message?: string } | null;
    const code = e?.code ?? '';
    const isTransport =
      code === 'ECONNREFUSED' ||
      code === 'ETIMEDOUT' ||
      code === 'ECONNRESET' ||
      code === 'EHOSTUNREACH' ||
      code === 'ENOTFOUND' ||
      code === 'ESOCKET' ||
      code === 'EAI_AGAIN' ||
      code === 'TIMEOUT';
    if (isTransport) {
      return { ok: false, reason: 'infra_error' };
    }
    // PATTERNS.md guidance: "any non-OK = bad_password" — default to bad_password
    // for AUTHENTICATIONFAILED, NO, BAD, or anything not transport-shaped.
    return { ok: false, reason: 'bad_password' };
  }
}

// ---------------------------------------------------------------------------
// Identity resolution (D-03, D-11)
// ---------------------------------------------------------------------------

async function resolvePhysicianByMailbox(
  email: string,
): Promise<ProvisionedPhysician | null> {
  if (!supabaseAdmin) return null;
  const lowered = email.toLowerCase();

  const { data: account, error: accountErr } = await supabaseAdmin
    .from('physician_workspace_accounts')
    .select('physician_id')
    .eq('mailbox_email', lowered)
    .maybeSingle();
  if (accountErr || !account?.physician_id) {
    return null;
  }

  const { data: physician, error: physicianErr } = await supabaseAdmin
    .from('physicians')
    .select('id, name, email, verification_status')
    .eq('id', account.physician_id)
    .maybeSingle();
  if (physicianErr || !physician?.id) {
    return null;
  }

  return {
    id: physician.id,
    name: (physician as { name?: string | null }).name ?? null,
    email: (physician as { email?: string | null }).email ?? null,
    verification_status:
      (physician as { verification_status?: ProvisionedPhysician['verification_status'] })
        .verification_status ?? null,
  };
}

// ---------------------------------------------------------------------------
// Public authorize() body
// ---------------------------------------------------------------------------

export interface MailcowImapAuthorizedUser {
  id: string;
  name: string;
  email: string;
  role: 'physician';
  mailbox_email: string;
  physician_id: string;
  verification_status: ProvisionedPhysician['verification_status'];
  workspace_role: 'owner';
}

/**
 * authorize() body for the `mailcow-imap` NextAuth provider. See module header
 * for the full pipeline. Returns null on every non-success outcome and on D-11
 * hard-blocks; the UI surfaces a single generic error string regardless (D-05, D-12).
 */
export async function mailcowImapAuthorize(
  credentials: Record<string, string> | undefined,
  req: AnyRequestLike,
): Promise<MailcowImapAuthorizedUser | null> {
  const sourceIp = extractSourceIp(req);
  const userAgent = extractUserAgent(req);
  const attemptedEmail = credentials?.email ? credentials.email.toLowerCase() : null;

  // Step 1 — missing credentials → bad_password (T-16-08: still log the attempt).
  if (!credentials?.email || !credentials?.password) {
    await writeProbeAttempt(sourceIp, attemptedEmail, 'bad_password', userAgent);
    return null;
  }

  const email = credentials.email.toLowerCase();
  const password = credentials.password;

  // Step 2 — supabaseAdmin null-guard (fail closed).
  if (!supabaseAdmin) {
    console.error('[mailcowImapProvider] supabaseAdmin not configured — failing closed');
    return null;
  }

  // Step 4 — rate-limit / lockout query (D-04). Three failures in the trailing
  // 5 minutes from the same source IP short-circuit BEFORE the IMAP probe.
  const FIVE_MIN_MS = 5 * 60_000;
  const fiveMinAgo = new Date(Date.now() - FIVE_MIN_MS).toISOString();
  if (sourceIp) {
    const { data: recent, error: rlErr } = await supabaseAdmin
      .from('auth_probe_attempts')
      .select('id, outcome, attempted_at')
      .eq('source_ip', sourceIp)
      .gte('attempted_at', fiveMinAgo)
      .order('attempted_at', { ascending: false })
      .limit(10);
    if (rlErr) {
      console.error('[mailcowImapProvider] rate-limit query failed', rlErr.message);
      // Fall through — do not block legitimate users on Supabase outage; the
      // upstream Mailcow auth still rate-limits at the IMAP connection level.
    } else {
      const failures = (recent ?? []).filter(
        (r: { outcome: string }) => r.outcome !== 'success',
      ).length;
      if (failures >= 3) {
        await writeProbeAttempt(sourceIp, email, 'locked_out', userAgent);
        // T-16-09 — same generic error string as bad_password (D-05). If we
        // can resolve the subject to a known physician we ALSO write a
        // workspace_audit_log row; otherwise we only log to auth_probe_attempts.
        const subject = await resolvePhysicianByMailbox(email);
        if (subject) {
          await logEvent({
            physicianId: subject.id,
            actorId: subject.id,
            actorRole: 'physician',
            action: 'workspace.login',
            detail: {
              outcome: 'locked_out',
              attempted_email: email,
              provider: 'mailcow-imap',
            },
            ipAddress: sourceIp ?? undefined,
            userAgent,
          });
        }
        return null;
      }
    }
  }

  // Step 5 — TLS-only IMAP probe (D-02).
  const probe = await probeImap(email, password);
  if (!probe.ok) {
    if (probe.reason === 'infra_error') {
      console.error('[mailcowImapProvider] IMAP transport failure', {
        host: 'imap.medikah.health',
        port: 993,
        ip: sourceIp,
      });
    }
    await writeProbeAttempt(sourceIp, email, probe.reason, userAgent);
    return null;
  }

  // Step 6 + 7 — identity resolution (D-03). D-11 hard-block on miss.
  const physician = await resolvePhysicianByMailbox(email);
  if (!physician) {
    console.error(
      '[mailcowImapProvider] IMAP succeeded but workspace account lookup returned empty — possible data integrity issue',
      { email, ip: sourceIp },
    );
    await writeProbeAttempt(sourceIp, email, 'infra_error', userAgent);
    return null;
  }

  // Step 8 — success ledger row.
  await writeProbeAttempt(sourceIp, email, 'success', userAgent);

  // Step 9 — synchronous workspace_audit_log row (D-06).
  await logEvent({
    physicianId: physician.id,
    actorId: physician.id,
    actorRole: 'physician',
    action: 'workspace.login',
    detail: {
      outcome: 'success',
      attempted_email: email,
      provider: 'mailcow-imap',
    },
    ipAddress: sourceIp ?? undefined,
    userAgent,
  });

  // Step 10 — return D-10 claim set. Not gated on verification_status (D-09).
  return {
    id: physician.id,
    name: physician.name ?? email,
    email,
    role: 'physician',
    mailbox_email: email,
    physician_id: physician.id,
    verification_status: physician.verification_status,
    workspace_role: 'owner',
  };
}
