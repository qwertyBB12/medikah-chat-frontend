/**
 * POST /api/auth/recovery/set-password
 *
 * Step 2 of the recovery flow (AUTH-07 / FLOW-05).
 * Validates the recovery token, enforces ≥12-char password policy, then:
 *   1. Marks the token consumed_at BEFORE calling Mailcow (replay protection — T-18-05-04)
 *   2. Calls Mailcow /api/v1/edit/mailbox to set the new mailbox password
 *   3. Writes workspace_audit_log action 'workspace.recovery_password_changed'
 *
 * Security contract (D-04 / T-18-05-03 / T-18-05-04):
 *   - D-04: NEVER re-enrolls 2FA — recovery resets the PASSWORD only, not the
 *     second factor. After recovery the doctor must still provide a valid TOTP
 *     code at sign-in (the Phase-17 login gate is unchanged).
 *   - T-12-03-01 / T-17-03-04: password NEVER logged.
 *   - T-18-05-04: token consumed_at set BEFORE Mailcow write (replay protection).
 *   - Returns 422 for invalid password before any side-effects.
 *   - Returns 410 if the token is expired, consumed, or unknown.
 *   - Returns 502 if Mailcow API rejects the call.
 *
 * Analog: pages/api/auth/activate/set-password.ts (nearly identical — table
 * name, token utility, audit action, and no-TOTP-re-enroll are the differences).
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../../lib/supabaseServer';
import { verifyRecoveryToken, hashToken } from '../../../../lib/auth/recoveryTokens';
import { logEvent, extractRequestContext } from '../../../../lib/workspaceAuditService';
import { checkPassword } from '../../../../lib/passwordPolicy';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseAdmin) {
    console.error('[recovery/set-password] supabaseAdmin not configured — failing closed');
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    const { token, password } = req.body as { token?: string; password?: string };

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Token required' });
    }

    // --- Password policy: ≥12 chars + ≥3 of 4 character classes (SC2 / decision 36) ---
    if (!password || typeof password !== 'string') {
      return res.status(422).json({ error: 'Password required', reason: 'too_short' });
    }
    const pwCheck = checkPassword(password);
    if (!pwCheck.valid) {
      return res.status(422).json({
        error:
          pwCheck.reason === 'needs_mix'
            ? 'Password must mix at least 3 of: lowercase, uppercase, number, symbol'
            : 'Password must be at least 12 characters',
        reason: pwCheck.reason,
      });
    }

    // --- Verify recovery token (signature + type claim must be 'workspace_recovery') ---
    const tokenPayload = await verifyRecoveryToken(token);
    if (!tokenPayload) {
      return res.status(410).json({ error: 'Invalid or expired token' });
    }

    const tokenHash = hashToken(token);

    // --- Look up the DB row to confirm it is unconsumed + unexpired ---
    const { data: tokenRow, error: rowError } = await supabaseAdmin
      .from('physician_recovery_tokens')
      .select('id, consumed_at, expires_at')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (rowError) {
      console.error('[recovery/set-password] DB error fetching token row:', rowError.message);
      return res.status(500).json({ error: 'Internal error' });
    }

    if (!tokenRow) {
      return res.status(410).json({ error: 'Token not found' });
    }

    const now = new Date();
    if (tokenRow.consumed_at !== null || new Date(tokenRow.expires_at) <= now) {
      return res.status(410).json({ error: 'Token has expired or has already been used' });
    }

    // --- T-18-05-04: Mark consumed_at BEFORE calling Mailcow (replay protection) ---
    const { error: consumeError } = await supabaseAdmin
      .from('physician_recovery_tokens')
      .update({ consumed_at: new Date().toISOString() })
      .eq('token_hash', tokenHash)
      .is('consumed_at', null); // guard against race condition

    if (consumeError) {
      console.error('[recovery/set-password] Failed to mark token consumed:', consumeError.message);
      return res.status(500).json({ error: 'Internal error' });
    }

    // --- Resolve physician workspace account for mailbox local_part ---
    const { data: workspace, error: wsError } = await supabaseAdmin
      .from('physician_workspace_accounts')
      .select('id, mailbox_local_part')
      .eq('physician_id', tokenPayload.physician_id)
      .maybeSingle();

    if (wsError || !workspace) {
      console.error('[recovery/set-password] Workspace account not found:', wsError?.message);
      return res.status(404).json({ error: 'Workspace account not found' });
    }

    const localPart = workspace.mailbox_local_part as string;
    const mailboxAddress = `${localPart}@medikah.health`;

    // --- Call Mailcow Admin API to set the mailbox password ---
    // T-12-03-01 / T-17-03-04: NEVER log the password value
    const mailcowUrl = process.env.MAILCOW_API_URL!;
    const mailcowKey = process.env.MAILCOW_API_KEY!;

    let mailcowRes: Response;
    try {
      mailcowRes = await fetch(`${mailcowUrl}/api/v1/edit/mailbox`, {
        method: 'POST',
        headers: {
          'X-API-Key': mailcowKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [mailboxAddress],
          attr: { password, password2: password },
        }),
      });
    } catch (fetchErr) {
      console.error('[recovery/set-password] Mailcow API unreachable:', fetchErr instanceof Error ? fetchErr.message : String(fetchErr));
      return res.status(502).json({ error: 'Password update failed' });
    }

    if (!mailcowRes.ok) {
      // Log only the HTTP status — NEVER the password (T-12-03-01)
      console.error('[recovery/set-password] Mailcow API error', { status: mailcowRes.status });
      return res.status(502).json({ error: 'Password update failed' });
    }

    // --- D-04: 2FA is NOT re-enrolled here ---
    // Recovery resets only the password. The Phase-17 TOTP login gate is unchanged.
    // After this the doctor signs in at /chat with their new Mailcow password
    // and must still provide a valid TOTP code.

    // --- Audit log (no password in detail — T-17-03-04) ---
    const reqCtx = extractRequestContext(req);
    await logEvent({
      physicianId: tokenPayload.physician_id,
      actorId: tokenPayload.physician_id,
      actorRole: 'physician',
      action: 'workspace.recovery_password_changed',
      detail: { flow: 'recovery', step: 'password_reset' },
      ipAddress: reqCtx.ipAddress,
      userAgent: reqCtx.userAgent,
    }).catch(() => undefined);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[recovery/set-password] exception:', err instanceof Error ? err.message : String(err));
    return res.status(500).json({ error: 'Internal error' });
  }
}
