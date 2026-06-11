/**
 * POST /api/auth/activate/set-password
 *
 * Step 2 of the workspace activation flow (AUTH-02).
 * Validates the activation token, enforces ≥12-char password policy, then:
 *   1. Marks the token consumed_at BEFORE calling Mailcow (Pitfall 4 / T-17-03-02)
 *   2. Calls Mailcow /api/v1/edit/mailbox to set the mailbox password
 *   3. Sets physician_workspace_accounts.mailbox_password_set = true
 *   4. Writes workspace_audit_log action 'workspace.password_changed'
 *
 * Security contract:
 *   - T-12-03-01 / T-17-03-04: password NEVER logged (no console.* references to password)
 *   - T-17-03-02: token is consumed at the START of the step (replay protection)
 *   - Returns 422 for invalid input before any side-effects
 *   - Returns 502 if Mailcow API rejects the call (only status is logged, never password)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../../lib/supabaseServer';
import { verifyActivationToken, hashToken } from '../../../../lib/auth/activationTokens';
import { logEvent, extractRequestContext } from '../../../../lib/workspaceAuditService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseAdmin) {
    console.error('[set-password] supabaseAdmin not configured — failing closed');
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    const { token, password } = req.body as { token?: string; password?: string };

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Token required' });
    }

    // --- Password policy: ≥12 characters (v1.3 security non-negotiable #1) ---
    if (!password || typeof password !== 'string' || password.length < 12) {
      return res.status(422).json({ error: 'Password must be at least 12 characters' });
    }

    // --- Re-verify activation token (signature + type claim) ---
    const tokenPayload = await verifyActivationToken(token);
    if (!tokenPayload) {
      return res.status(410).json({ error: 'Invalid or expired token' });
    }

    const tokenHash = hashToken(token);

    // --- Look up the DB row to confirm it is unconsumed + unexpired ---
    const { data: tokenRow, error: rowError } = await supabaseAdmin
      .from('physician_activation_tokens')
      .select('id, consumed_at, expires_at')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (rowError) {
      console.error('[set-password] DB error fetching token row:', rowError.message);
      return res.status(500).json({ error: 'Internal error' });
    }

    if (!tokenRow) {
      return res.status(410).json({ error: 'Token not found' });
    }

    const now = new Date();
    if (tokenRow.consumed_at !== null || new Date(tokenRow.expires_at) <= now) {
      return res.status(410).json({ error: 'Token has expired or has already been used' });
    }

    // --- PITFALL 4: Mark consumed_at BEFORE calling Mailcow (replay protection) ---
    const { error: consumeError } = await supabaseAdmin
      .from('physician_activation_tokens')
      .update({ consumed_at: new Date().toISOString() })
      .eq('token_hash', tokenHash)
      .is('consumed_at', null); // guard against race condition

    if (consumeError) {
      console.error('[set-password] Failed to mark token consumed:', consumeError.message);
      return res.status(500).json({ error: 'Internal error' });
    }

    // --- Resolve physician workspace account ---
    const { data: workspace, error: wsError } = await supabaseAdmin
      .from('physician_workspace_accounts')
      .select('id, local_part')
      .eq('physician_id', tokenPayload.physician_id)
      .maybeSingle();

    if (wsError || !workspace) {
      console.error('[set-password] Workspace account not found:', wsError?.message);
      return res.status(404).json({ error: 'Workspace account not found' });
    }

    const localPart = workspace.local_part as string;
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
      console.error('[set-password] Mailcow API unreachable:', fetchErr instanceof Error ? fetchErr.message : String(fetchErr));
      return res.status(502).json({ error: 'Password update failed' });
    }

    if (!mailcowRes.ok) {
      // Log only the HTTP status — NEVER the password (T-12-03-01)
      console.error('[set-password] Mailcow API error', { status: mailcowRes.status });
      return res.status(502).json({ error: 'Password update failed' });
    }

    // --- Mark mailbox_password_set = true ---
    const { error: pwSetError } = await supabaseAdmin
      .from('physician_workspace_accounts')
      .update({ mailbox_password_set: true })
      .eq('physician_id', tokenPayload.physician_id);

    if (pwSetError) {
      console.error('[set-password] Failed to set mailbox_password_set:', pwSetError.message);
      // Non-fatal: Mailcow call succeeded; log and continue
    }

    // --- Audit log (no password in detail — T-17-03-04) ---
    const reqCtx = extractRequestContext(req);
    await logEvent({
      physicianId: tokenPayload.physician_id,
      actorId: tokenPayload.physician_id,
      actorRole: 'physician',
      action: 'workspace.password_changed',
      detail: { flow: 'activation', step: 'password_set' },
      ipAddress: reqCtx.ipAddress,
      userAgent: reqCtx.userAgent,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[set-password] exception:', err instanceof Error ? err.message : String(err));
    return res.status(500).json({ error: 'Internal error' });
  }
}
