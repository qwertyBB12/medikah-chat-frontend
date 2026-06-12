/**
 * POST /api/auth/activate/totp-verify
 *
 * Phase 17 Plan 04 — Login-time TOTP second-factor verification endpoint.
 *
 * Called after the physician has submitted their 6-digit TOTP code on the
 * step-up prompt that follows a successful Mailcow IMAP login. The frontend
 * receives a NextAuth session with needs_totp=true; the user enters their
 * authenticator app code; this endpoint verifies it.
 *
 * On success: returns the data the client needs to re-invoke
 *   signIn('mailcow-imap', { totp_verified: true, physician_id, ... })
 *   so the NextAuth jwt() callback upgrades the token to a full physician session.
 *
 * On failure: 422 with generic { error: 'Invalid code' } — no information about
 *   which factor failed (Phase 16-02 generic error contract, T-17-04-04).
 *
 * Rate limiting: reuses the Phase 16 auth_probe_attempts ledger pattern —
 *   3 failed TOTP attempts within 5 minutes from the same source IP → locked_out.
 *   This satisfies T-17-04-02 (TOTP brute-force mitigation).
 *
 * Audit: every attempt (success or failure) writes a workspace.login_2fa row
 *   to workspace_audit_log (Phase 16 contract: every login attempt is audited).
 *
 * Security contract:
 *   - T-17-04-01: totp_verified only set after server-side otplib verify —
 *     not client-assertable into the JWT.
 *   - T-17-04-02: rate-limited 3/5min; generic 422 on failure.
 *   - T-17-04-03: totp_verified set server-side only via this endpoint.
 *   - T-17-04-04: generic error message, no factor-disclosure.
 *   - T-17-04-05: covered by mailcowImapProvider (activation_complete gate).
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifySync } from 'otplib';
import { supabaseAdmin } from '../../../../lib/supabaseServer';
import { decryptTotpSecret } from '../../../../lib/auth/totpCrypto';
import { logEvent, extractRequestContext } from '../../../../lib/workspaceAuditService';

// TOTP verification defaults — must match totp-setup.ts and totp-enroll.ts.
const TOTP_DEFAULTS = {
  strategy: 'totp' as const,
  period: 30,
  t0: 0,
  algorithm: 'sha1' as const,
  digits: 6,
};

// ±1 step = 90s total. NEVER tighten to 0 (Pitfall 5 / T-17-04-02 clock skew).
const EPOCH_TOLERANCE = 1;

// Rate-limit window: 3 failures in 5 minutes → locked_out (Phase 16 pattern).
const RATE_LIMIT_WINDOW_MS = 5 * 60_000;
const RATE_LIMIT_MAX_FAILURES = 3;

// ---------------------------------------------------------------------------
// Source IP extraction (reused from mailcowImapProvider pattern)
// ---------------------------------------------------------------------------

function extractSourceIp(req: NextApiRequest): string | null {
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
// Rate-limit check against auth_probe_attempts (Phase 16-03 pattern)
// ---------------------------------------------------------------------------

async function isRateLimited(sourceIp: string): Promise<boolean> {
  if (!supabaseAdmin) return false;
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const { data: recent, error } = await supabaseAdmin
    .from('auth_probe_attempts')
    .select('id, outcome')
    .eq('source_ip', sourceIp)
    .gte('attempted_at', windowStart)
    .order('attempted_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('[totp-verify] rate-limit query failed', error.message);
    // Fall through on DB error — do not block legitimate users on Supabase outage.
    return false;
  }

  const failures = (recent ?? []).filter((r: { outcome: string }) => r.outcome !== 'success').length;
  return failures >= RATE_LIMIT_MAX_FAILURES;
}

async function writeProbeAttempt(
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
    console.error('[totp-verify] auth_probe_attempts insert threw', err);
  }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseAdmin) {
    console.error('[totp-verify] supabaseAdmin not configured — failing closed');
    return res.status(500).json({ error: 'Database not configured' });
  }

  const sourceIp = extractSourceIp(req);
  const { ipAddress, userAgent } = extractRequestContext(req);

  try {
    const { physician_id, code } = req.body as {
      physician_id?: string;
      code?: string;
    };

    if (!physician_id || typeof physician_id !== 'string') {
      return res.status(400).json({ error: 'physician_id required' });
    }

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'code required' });
    }

    // --- Rate-limit check (T-17-04-02 brute-force protection) ---
    if (sourceIp && (await isRateLimited(sourceIp))) {
      await writeProbeAttempt(sourceIp, null, 'locked_out', userAgent);
      // Generic 422 — same contract as bad TOTP code (T-17-04-04)
      return res.status(422).json({ error: 'Invalid code' });
    }

    // --- Load workspace account ---
    const { data: workspace, error: wsError } = await supabaseAdmin
      .from('physician_workspace_accounts')
      .select('totp_secret, totp_enrolled, activation_complete, mailbox_local_part, mailbox_domain')
      .eq('physician_id', physician_id)
      .maybeSingle();

    if (wsError) {
      console.error('[totp-verify] workspace account query failed', wsError.message);
      return res.status(500).json({ error: 'Internal error' });
    }

    if (!workspace || !workspace.totp_enrolled || !workspace.totp_secret || !workspace.activation_complete) {
      // Workspace not found, not enrolled, or activation incomplete.
      // Write a failure probe attempt and return generic 422 (T-17-04-04).
      await writeProbeAttempt(sourceIp, null, 'bad_password', userAgent);
      await logEvent({
        physicianId: physician_id,
        actorId: physician_id,
        actorRole: 'physician',
        action: 'workspace.login_2fa',
        detail: {
          outcome: 'failure',
          reason: 'not_enrolled_or_incomplete',
          provider: 'mailcow-imap',
        },
        ipAddress: ipAddress ?? undefined,
        userAgent,
      });
      return res.status(422).json({ error: 'Invalid code' });
    }

    // --- Decrypt the stored TOTP secret ---
    let rawSecret: string;
    try {
      rawSecret = decryptTotpSecret(workspace.totp_secret as string);
    } catch {
      console.error('[totp-verify] Failed to decrypt TOTP secret for physician', physician_id);
      return res.status(500).json({ error: 'Internal error' });
    }

    // --- Verify the submitted TOTP code (±1 window — Pitfall 5: never tighten) ---
    const verifyResult = verifySync({
      ...TOTP_DEFAULTS,
      epoch: Math.floor(Date.now() / 1000),
      secret: rawSecret,
      token: code,
      epochTolerance: EPOCH_TOLERANCE,
    });

    const isValid =
      typeof verifyResult === 'object'
        ? (verifyResult as { valid: boolean }).valid
        : Boolean(verifyResult);

    if (!isValid) {
      // Rate-limit ledger: record failure (feeds into isRateLimited window above)
      await writeProbeAttempt(sourceIp, null, 'bad_password', userAgent);

      // Audit log — failure
      await logEvent({
        physicianId: physician_id,
        actorId: physician_id,
        actorRole: 'physician',
        action: 'workspace.login_2fa',
        detail: {
          outcome: 'failure',
          provider: 'mailcow-imap',
        },
        ipAddress: ipAddress ?? undefined,
        userAgent,
      });

      // Generic 422 — no information leak about which factor failed (T-17-04-04)
      return res.status(422).json({ error: 'Invalid code' });
    }

    // --- TOTP verified — look up the full physician claim set ---
    // Fetch mailbox details to reconstruct the full D-10 claim set that the
    // jwt() callback needs. We need these to populate the upgraded token.
    const mailboxEmail =
      `${workspace.mailbox_local_part}@${workspace.mailbox_domain}`.toLowerCase();

    // Fetch verification_status from physicians table for the D-10 claim.
    const { data: physician } = await supabaseAdmin
      .from('physicians')
      .select('verification_status')
      .eq('id', physician_id)
      .maybeSingle();

    const verificationStatus = (physician as {
      verification_status?: 'pending' | 'in_review' | 'verified' | 'rejected';
    } | null)?.verification_status ?? null;

    // Rate-limit ledger: record success
    await writeProbeAttempt(sourceIp, mailboxEmail, 'success', userAgent);

    // Audit log — success (workspace.login_2fa, security-relevant)
    await logEvent({
      physicianId: physician_id,
      actorId: physician_id,
      actorRole: 'physician',
      action: 'workspace.login_2fa',
      detail: {
        outcome: 'success',
        provider: 'mailcow-imap',
      },
      ipAddress: ipAddress ?? undefined,
      userAgent,
    });

    // --- Return the payload the client uses to re-invoke signIn ---
    // The client calls:
    //   signIn('mailcow-imap', { totp_verified: true, physician_id, mailbox_email,
    //     verification_status, ... })
    // The [...nextauth].ts jwt() callback detects totp_verified=true and issues
    // the full D-10 physician claim set (T-17-04-03 — server-side only path).
    return res.status(200).json({
      totp_verified: true,
      physician_id,
      mailbox_email: mailboxEmail,
      verification_status: verificationStatus,
    });
  } catch (err) {
    console.error('[totp-verify] exception:', err instanceof Error ? err.message : String(err));
    return res.status(500).json({ error: 'Internal error' });
  }
}
