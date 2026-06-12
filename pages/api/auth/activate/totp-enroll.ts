/**
 * POST /api/auth/activate/totp-enroll
 *
 * Step 3b of the workspace activation flow — verifies a live TOTP code
 * against the candidate secret stored by totp-setup, then closes the atomic
 * activation gate (D-01 / AUTH-02).
 *
 * Flow:
 *   1. Validate token + resolve physician_id
 *   2. Load candidate totp_secret from physician_workspace_accounts
 *   3. Decrypt secret and verify the submitted code (±1 window — Pitfall 5)
 *   4. Confirm mailbox_password_set = true before writing activation_complete (Pitfall 1)
 *   5. Set totp_enrolled = true + activation_complete = true (D-01 atomic gate)
 *   6. Write audit log (workspace.setup_completed)
 *   7. Attempt avatar import — try/catch, never blocks the 200 (SC3 / AUTH-05)
 *
 * Security contract:
 *   - T-17-03-01: activation_complete only when BOTH password AND TOTP verified
 *   - T-17-03-03: totp_secret column stores only AES-256-GCM ciphertext
 *   - Invalid code → 422 with generic message (no information leak)
 *   - Avatar failure → logged, not surfaced (non-blocking idempotent)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import sharp from 'sharp';
import { verifySync } from 'otplib';
import { supabaseAdmin } from '../../../../lib/supabaseServer';
import { verifyActivationToken, hashToken } from '../../../../lib/auth/activationTokens';
import { decryptTotpSecret } from '../../../../lib/auth/totpCrypto';
import { logEvent, extractRequestContext } from '../../../../lib/workspaceAuditService';

// TOTP verification defaults — must match totp-setup.ts generation parameters
const TOTP_DEFAULTS = {
  strategy: 'totp' as const,
  period: 30,
  t0: 0,
  algorithm: 'sha1' as const,
  digits: 6,
};

// epochTolerance: ±1 step = 90s total. NEVER tighten to 0 (Pitfall 5).
const EPOCH_TOLERANCE = 1;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseAdmin) {
    console.error('[totp-enroll] supabaseAdmin not configured — failing closed');
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    const { token, code } = req.body as { token?: string; code?: string };

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Token required' });
    }

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'TOTP code required' });
    }

    // --- Re-validate activation token ---
    const tokenPayload = await verifyActivationToken(token);
    if (!tokenPayload) {
      return res.status(410).json({ error: 'Invalid or expired token' });
    }

    // Confirm token row still valid in DB (consumed_at + expires_at)
    const tokenHash = hashToken(token);
    const { data: tokenRow, error: rowError } = await supabaseAdmin
      .from('physician_activation_tokens')
      .select('id, consumed_at, expires_at')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (rowError) {
      console.error('[totp-enroll] DB error fetching token row:', rowError.message);
      return res.status(500).json({ error: 'Internal error' });
    }

    if (!tokenRow) {
      return res.status(410).json({ error: 'Token not found' });
    }

    const now = new Date();
    if (tokenRow.consumed_at !== null || new Date(tokenRow.expires_at) <= now) {
      return res.status(410).json({ error: 'Token has expired or has already been used' });
    }

    // --- Load physician workspace account ---
    const { data: workspace, error: wsError } = await supabaseAdmin
      .from('physician_workspace_accounts')
      .select('id, mailbox_password_set, totp_secret, activation_complete, mailbox_local_part')
      .eq('physician_id', tokenPayload.physician_id)
      .maybeSingle();

    if (wsError || !workspace) {
      console.error('[totp-enroll] Workspace account not found:', wsError?.message);
      return res.status(404).json({ error: 'Workspace account not found' });
    }

    // --- Load and decrypt the candidate TOTP secret ---
    const encryptedSecret = workspace.totp_secret as string | null;
    if (!encryptedSecret) {
      return res.status(400).json({ error: 'TOTP setup must be completed first' });
    }

    let rawSecret: string;
    try {
      rawSecret = decryptTotpSecret(encryptedSecret);
    } catch {
      console.error('[totp-enroll] Failed to decrypt candidate TOTP secret');
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

    const isValid = typeof verifyResult === 'object'
      ? (verifyResult as { valid: boolean }).valid
      : Boolean(verifyResult);

    if (!isValid) {
      // Generic message — no information leak about which side failed (Phase 16-02 rule)
      return res.status(422).json({ error: 'Invalid code' });
    }

    // --- D-01 atomic gate: both guards must be true before activation_complete ---
    if (!workspace.mailbox_password_set) {
      // Password step not completed — send back to password step (Pitfall 1)
      return res.status(400).json({ error: 'Password must be set before TOTP enrollment' });
    }

    // --- Write totp_enrolled = true + activation_complete = true ---
    // The totp_secret column keeps the encrypted secret for later NextAuth verification.
    const { error: enrollError } = await supabaseAdmin
      .from('physician_workspace_accounts')
      .update({
        totp_enrolled: true,
        activation_complete: true,
      })
      .eq('physician_id', tokenPayload.physician_id);

    if (enrollError) {
      console.error('[totp-enroll] Failed to set enrollment flags:', enrollError.message);
      return res.status(500).json({ error: 'Internal error' });
    }

    // --- Audit log ---
    const reqCtx = extractRequestContext(req);
    await logEvent({
      physicianId: tokenPayload.physician_id,
      actorId: tokenPayload.physician_id,
      actorRole: 'physician',
      action: 'workspace.setup_completed',
      detail: { flow: 'activation', step: 'totp_enrolled' },
      ipAddress: reqCtx.ipAddress,
      userAgent: reqCtx.userAgent,
    });

    // --- AUTH-05: Avatar import — non-blocking, idempotent ---
    // Wrap entirely in try/catch — any failure logs but does NOT change the 200.
    // Finding 3: SOGo personalImage endpoint path is LOW confidence; if the PUT fails,
    // the failure is logged and activation still completes (SC3 idempotent + non-blocking).
    try {
      await importAvatarToSOGo(
        tokenPayload.physician_id,
        workspace.mailbox_local_part as string,
      );
    } catch (avatarErr) {
      // Log avatar import failure to workspace_audit_log (non-blocking)
      await logEvent({
        physicianId: tokenPayload.physician_id,
        actorId: tokenPayload.physician_id,
        actorRole: 'physician',
        action: 'workspace.setup_completed',
        detail: {
          flow: 'activation',
          step: 'avatar_import',
          outcome: 'failed',
          error: avatarErr instanceof Error ? avatarErr.message : String(avatarErr),
          note: 'Avatar import failed — activation not affected (SC3)',
        },
      });
    }

    // Success — return activation_complete: true for page to redirect to dashboard
    return res.status(200).json({ activation_complete: true });
  } catch (err) {
    console.error('[totp-enroll] exception:', err instanceof Error ? err.message : String(err));
    return res.status(500).json({ error: 'Internal error' });
  }
}

// ---------------------------------------------------------------------------
// Avatar import helper (AUTH-05, non-blocking)
// ---------------------------------------------------------------------------

/**
 * Fetch the physician's onboarding photo from Supabase Storage, re-encode it
 * as 256×256 JPEG, and PUT it to the SOGo personal image endpoint.
 *
 * Idempotent: re-running overwrites the same stable path.
 * Non-blocking: caller wraps this in try/catch (totp-enroll handler).
 *
 * SOGo personalImage endpoint (Finding 3 — LOW confidence):
 *   PUT /SOGo/so/<mailbox@domain>/Contacts/personal/<mailbox@domain>.vcf
 *   with PHOTO in vCard, OR a direct personalImage REST path.
 *   If the PUT returns a non-ok status, throws so the caller logs it.
 */
async function importAvatarToSOGo(
  physicianId: string,
  localPart: string,
): Promise<void> {
  if (!supabaseAdmin) return;

  // Fetch photo from Supabase Storage (server-side, not public CDN — avoids cache)
  const photoPath = `${physicianId}/photo.jpeg`;
  const { data: photoBlob, error: downloadError } = await supabaseAdmin.storage
    .from('physician-photos')
    .download(photoPath);

  if (downloadError || !photoBlob) {
    // No photo uploaded yet — skip silently (not all physicians have photos at activation)
    return;
  }

  // Re-encode to 256×256 JPEG (content-type pinned, size capped — T-17-03-05)
  const photoBuffer = Buffer.from(await photoBlob.arrayBuffer());
  const avatarBuffer = await sharp(photoBuffer)
    .resize(256, 256, { fit: 'cover', position: 'center' })
    .jpeg({ quality: 85 })
    .toBuffer();

  // PUT to SOGo personalImage endpoint
  // Path is LOW confidence (Finding 3) — if 404, the outer catch logs it.
  const mailcowHost = process.env.MAILCOW_API_URL!; // e.g. https://practikah.medikah.health
  const mailboxAddress = `${localPart}@medikah.health`;

  // SOGo REST API: PUT /SOGo/so/<mailbox>/personalImage
  // This path is the best-known candidate for the personalImage API (Finding 3 / LOW confidence).
  // If the endpoint does not exist in this SOGo version, the PUT will return 404 or 405,
  // causing this function to throw and the outer catch to log a non-fatal audit event.
  const sogoAvatarUrl = `${mailcowHost}/SOGo/so/${encodeURIComponent(mailboxAddress)}/personalImage`;

  const putRes = await fetch(sogoAvatarUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'image/jpeg',
      // SOGo trusted-proxy: x-webobjects-remote-user is set by nginx (SSO).
      // For this server-to-server call, we use the mailbox address directly.
      'x-webobjects-remote-user': mailboxAddress,
    },
    body: avatarBuffer as unknown as BodyInit,
  });

  if (!putRes.ok) {
    // Throw so the outer try/catch logs this as a non-fatal audit event
    throw new Error(`[importAvatarToSOGo] SOGo PUT ${sogoAvatarUrl} returned ${putRes.status}`);
  }
}
