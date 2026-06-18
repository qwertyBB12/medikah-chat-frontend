/**
 * POST /api/auth/activate/totp-setup
 *
 * Step 3a of the workspace activation flow — generates a TOTP secret and
 * QR code for the physician to scan with their authenticator app.
 *
 * Security contract (T-17-03-03):
 *   - The raw TOTP secret is NEVER returned to the client.
 *   - The secret is stored AES-256-GCM encrypted in physician_workspace_accounts.totp_secret
 *     as a CANDIDATE (totp_enrolled stays false until totp-enroll confirms a live code).
 *   - Only { qrCodeDataUrl } is returned to the client.
 *   - No console.* calls that would leak the raw secret.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import QRCode from 'qrcode';
// otplib v13: import functional helpers from main index (re-exports from functional subpath)
// 'otplib/functional' is valid at runtime but tsc (moduleResolution:"node") cannot resolve
// subpath exports — use the main index which re-exports the same functions.
import { generateSecret, generateURI } from 'otplib';
import { supabaseAdmin } from '../../../../lib/supabaseServer';
import { verifyActivationToken, hashToken } from '../../../../lib/auth/activationTokens';
import { encryptTotpSecret } from '../../../../lib/auth/totpCrypto';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseAdmin) {
    console.error('[totp-setup] supabaseAdmin not configured — failing closed');
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    const { token } = req.body as { token?: string };

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Token required' });
    }

    // --- Re-validate activation token ---
    const tokenPayload = await verifyActivationToken(token);
    if (!tokenPayload) {
      return res.status(410).json({ error: 'Invalid or expired token' });
    }

    // Confirm the token is still valid (not consumed) in DB
    const tokenHash = hashToken(token);
    const { data: tokenRow, error: rowError } = await supabaseAdmin
      .from('physician_activation_tokens')
      .select('id, consumed_at, expires_at')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (rowError) {
      console.error('[totp-setup] DB error fetching token row:', rowError.message);
      return res.status(500).json({ error: 'Internal error' });
    }

    if (!tokenRow) {
      return res.status(410).json({ error: 'Token not found' });
    }

    // consumed_at marks the password step done (set-password consumes the token),
    // NOT the end of the flow — totp-setup/enroll run AFTER consumption with the
    // same token. Replay is gated by activation_complete below, expiry by the row.
    const now = new Date();
    if (new Date(tokenRow.expires_at) <= now) {
      return res.status(410).json({ error: 'Token has expired or has already been used' });
    }

    // --- Confirm workspace account exists and password has been set ---
    const { data: workspace, error: wsError } = await supabaseAdmin
      .from('physician_workspace_accounts')
      .select('id, mailbox_password_set, activation_complete')
      .eq('physician_id', tokenPayload.physician_id)
      .maybeSingle();

    if (wsError || !workspace) {
      console.error('[totp-setup] Workspace account not found:', wsError?.message);
      return res.status(404).json({ error: 'Workspace account not found' });
    }

    if (workspace.activation_complete) {
      // Activation already finished — a consumed token cannot restart the flow
      return res.status(410).json({ error: 'Token has expired or has already been used' });
    }

    if (!workspace.mailbox_password_set) {
      return res.status(400).json({ error: 'Password must be set before TOTP setup' });
    }

    // --- Generate TOTP secret (server-side only, never returned to client) ---
    const rawSecret = generateSecret();

    // Build the otpauth URI — issuer / label per brand spec.
    // D-15 — label is the full physician email and issuer is the brand string, so the
    // authenticator shows "Práctikah · Medikah (you@medikah.health)"; the email
    // qualifier makes any stale duplicate from a prior attempt visually obvious.
    const otpauthUri = generateURI({
      strategy: 'totp',
      label: tokenPayload.email,
      issuer: 'Práctikah · Medikah',
      secret: rawSecret,
    });

    // Render QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUri, { width: 200 });

    // --- Store encrypted CANDIDATE secret (not yet enrolled) ---
    const encryptedSecret = encryptTotpSecret(rawSecret);
    const { error: updateError } = await supabaseAdmin
      .from('physician_workspace_accounts')
      .update({ totp_secret: encryptedSecret })
      .eq('physician_id', tokenPayload.physician_id);

    if (updateError) {
      console.error('[totp-setup] Failed to store candidate secret:', updateError.message);
      return res.status(500).json({ error: 'Internal error' });
    }

    // --- Return only the QR code URL — NEVER the raw secret ---
    return res.status(200).json({ qrCodeDataUrl });
  } catch (err) {
    console.error('[totp-setup] exception:', err instanceof Error ? err.message : String(err));
    return res.status(500).json({ error: 'Internal error' });
  }
}
