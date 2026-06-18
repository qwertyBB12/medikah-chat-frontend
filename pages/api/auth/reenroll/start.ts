/**
 * POST /api/auth/reenroll/start
 *
 * Phase 18 CARRY-18-A — step 1 of the isolated TOTP re-enrollment flow.
 *
 * Opened only after an admin-approved reset (which set totp_enrolled=false on an
 * account that is still activation_complete=true). Two factors gate it: the
 * Mailcow password (verified by a TLS-only IMAP probe here) AND the prior admin
 * approval (without it the account is still totp_enrolled=true → not_eligible).
 *
 * Generates a fresh candidate TOTP secret + QR. The raw secret is NEVER returned;
 * only { qrCodeDataUrl }. The candidate is stored AES-256-GCM encrypted and is not
 * yet active — `confirm` flips totp_enrolled=true once a live code is verified.
 *
 * Security contract:
 *   - Session-less + password-gated, so it never touches the shared login provider.
 *   - Per-IP rate-limited (3 failures / 5 min) via the auth_probe_attempts ledger.
 *   - Generic errors; eligibility is not disclosed beyond a 403 not_eligible.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import QRCode from 'qrcode';
import { generateSecret, generateURI } from 'otplib';
import { supabaseAdmin } from '../../../../lib/supabaseServer';
import { encryptTotpSecret } from '../../../../lib/auth/totpCrypto';
import { extractRequestContext } from '../../../../lib/workspaceAuditService';
import {
  extractSourceIp,
  isIpRateLimited,
  writeReenrollProbe,
  probeMailboxPassword,
  resolveReenrollTarget,
} from '../../../../lib/auth/reenrollSupport';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseAdmin) {
    console.error('[reenroll/start] supabaseAdmin not configured — failing closed');
    return res.status(500).json({ error: 'Database not configured' });
  }

  const sourceIp = extractSourceIp(req);
  const { userAgent } = extractRequestContext(req);

  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password required' });
    }
    const lowered = email.toLowerCase();

    // --- Rate-limit (T-17-04-02 pattern) ---
    if (sourceIp && (await isIpRateLimited(sourceIp))) {
      await writeReenrollProbe(sourceIp, lowered, 'locked_out', userAgent);
      return res.status(429).json({ error: 'locked_out' });
    }

    // --- First factor: Mailcow password (TLS IMAP probe) ---
    const passwordOk = await probeMailboxPassword(lowered, password);
    if (!passwordOk) {
      await writeReenrollProbe(sourceIp, lowered, 'bad_password', userAgent);
      return res.status(401).json({ error: 'invalid' });
    }

    // --- Eligibility: must be the post-approval window (activated, 2FA cleared) ---
    const target = await resolveReenrollTarget(lowered);
    if (!target.ok) {
      // Password was correct, so record success in the ledger (do not punish the
      // IP), but the account is not in the re-enroll window — generic 403.
      await writeReenrollProbe(sourceIp, lowered, 'success', userAgent);
      return res.status(403).json({ error: 'not_eligible' });
    }

    // --- Generate candidate secret + QR (mirrors totp-setup; raw secret never leaves) ---
    const rawSecret = generateSecret();
    const otpauthUri = generateURI({
      strategy: 'totp',
      label: lowered,
      issuer: 'Práctikah · Medikah',
      secret: rawSecret,
    });
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUri, { width: 200 });

    const encryptedSecret = encryptTotpSecret(rawSecret);
    const { error: updateError } = await supabaseAdmin
      .from('physician_workspace_accounts')
      .update({ totp_secret: encryptedSecret })
      .eq('physician_id', target.physicianId);

    if (updateError) {
      console.error('[reenroll/start] failed to store candidate secret:', updateError.message);
      return res.status(500).json({ error: 'Internal error' });
    }

    await writeReenrollProbe(sourceIp, lowered, 'success', userAgent);
    return res.status(200).json({ qrCodeDataUrl });
  } catch (err) {
    console.error('[reenroll/start] exception:', err instanceof Error ? err.message : String(err));
    return res.status(500).json({ error: 'Internal error' });
  }
}
