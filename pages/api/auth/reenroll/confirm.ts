/**
 * POST /api/auth/reenroll/confirm
 *
 * Phase 18 CARRY-18-A — step 2 of the isolated TOTP re-enrollment flow.
 *
 * Re-verifies the Mailcow password (TLS IMAP probe), confirms the account is
 * still in the re-enroll window (activation_complete=true, totp_enrolled=false),
 * verifies a live 6-digit code against the candidate secret stored by `start`,
 * then flips totp_enrolled=true. activation_complete is already true and is left
 * untouched. The next normal login at /chat now takes the TOTP second-factor path
 * again (the no-2FA hole closed in mailcowImapProvider stays shut).
 *
 * Security contract:
 *   - Session-less + password-gated; isolated from the shared login provider.
 *   - Per-IP rate-limited; generic 422 on a bad code (no factor disclosure).
 *   - Re-checks eligibility on confirm so a concurrent state change cannot enroll
 *     a still-enrolled account.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifySync } from 'otplib';
import { supabaseAdmin } from '../../../../lib/supabaseServer';
import { decryptTotpSecret } from '../../../../lib/auth/totpCrypto';
import { logEvent, extractRequestContext } from '../../../../lib/workspaceAuditService';
import {
  extractSourceIp,
  isIpRateLimited,
  writeReenrollProbe,
  probeMailboxPassword,
  resolveReenrollTarget,
} from '../../../../lib/auth/reenrollSupport';

// Must match totp-setup.ts / totp-enroll.ts generation + verification params.
const TOTP_DEFAULTS = {
  strategy: 'totp' as const,
  period: 30,
  t0: 0,
  algorithm: 'sha1' as const,
  digits: 6,
};

// ±3 steps = ±210s. TEMPORARY widening for CDMX onsite enrollment 2026-06-22
// (drifted doctor phones lock out at the venue). REVERT to 2 (±150s) after the event.
// NEVER tighten to 0 (Pitfall 5 / clock skew).
const EPOCH_TOLERANCE = 3; // CDMX-temp; revert to 2 after 2026-06-22

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseAdmin) {
    console.error('[reenroll/confirm] supabaseAdmin not configured — failing closed');
    return res.status(500).json({ error: 'Database not configured' });
  }

  const sourceIp = extractSourceIp(req);
  const { ipAddress, userAgent } = extractRequestContext(req);

  try {
    const { email, password, code } = req.body as {
      email?: string;
      password?: string;
      code?: string;
    };
    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password required' });
    }
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Code required' });
    }
    const lowered = email.toLowerCase();

    // --- Rate-limit ---
    if (sourceIp && (await isIpRateLimited(sourceIp))) {
      await writeReenrollProbe(sourceIp, lowered, 'locked_out', userAgent);
      return res.status(429).json({ error: 'locked_out' });
    }

    // --- First factor: Mailcow password ---
    const passwordOk = await probeMailboxPassword(lowered, password);
    if (!passwordOk) {
      await writeReenrollProbe(sourceIp, lowered, 'bad_password', userAgent);
      return res.status(401).json({ error: 'invalid' });
    }

    // --- Re-check eligibility (guards a concurrent state change) ---
    const target = await resolveReenrollTarget(lowered);
    if (!target.ok) {
      await writeReenrollProbe(sourceIp, lowered, 'success', userAgent);
      return res.status(403).json({ error: 'not_eligible' });
    }

    if (!target.totpSecret) {
      // start was not called (no candidate secret) — send back to step 1.
      return res.status(400).json({ error: 'setup_required' });
    }

    // --- Verify the submitted code against the candidate secret ---
    let rawSecret: string;
    try {
      rawSecret = decryptTotpSecret(target.totpSecret);
    } catch {
      console.error('[reenroll/confirm] failed to decrypt candidate secret');
      return res.status(500).json({ error: 'Internal error' });
    }

    // Sweep a ±EPOCH_TOLERANCE step window — otplib v13 verifySync silently
    // ignores epochTolerance (ZERO real tolerance otherwise). See totp-verify.ts.
    const nowEpoch = Math.floor(Date.now() / 1000);
    let isValid = false;
    for (let d = -EPOCH_TOLERANCE; d <= EPOCH_TOLERANCE; d++) {
      const r = verifySync({
        ...TOTP_DEFAULTS,
        epoch: nowEpoch + d * TOTP_DEFAULTS.period,
        secret: rawSecret,
        token: code,
      });
      const ok = typeof r === 'object' ? (r as { valid: boolean }).valid : Boolean(r);
      if (ok) {
        isValid = true;
        break;
      }
    }

    if (!isValid) {
      await writeReenrollProbe(sourceIp, lowered, 'bad_password', userAgent);
      return res.status(422).json({ error: 'Invalid code' });
    }

    // --- Re-enroll: flip totp_enrolled=true (activation_complete already true) ---
    const { error: enrollError } = await supabaseAdmin
      .from('physician_workspace_accounts')
      .update({ totp_enrolled: true })
      .eq('physician_id', target.physicianId);

    if (enrollError) {
      console.error('[reenroll/confirm] failed to set totp_enrolled:', enrollError.message);
      return res.status(500).json({ error: 'Internal error' });
    }

    await writeReenrollProbe(sourceIp, lowered, 'success', userAgent);
    await logEvent({
      physicianId: target.physicianId,
      actorId: target.physicianId,
      actorRole: 'physician',
      action: 'workspace.setup_completed',
      detail: { flow: 'reenroll', step: 'totp_reenrolled' },
      ipAddress: ipAddress ?? undefined,
      userAgent,
    });

    return res.status(200).json({ reenrolled: true });
  } catch (err) {
    console.error('[reenroll/confirm] exception:', err instanceof Error ? err.message : String(err));
    return res.status(500).json({ error: 'Internal error' });
  }
}
