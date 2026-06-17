/**
 * POST /api/admin/totp-reset-approve
 *
 * Admin one-tap TOTP revoke + re-enroll-on-next-login (D-06 / SC5 / T-18-06-01).
 *
 * Security contract:
 *   - Admin-gated via getAdminUser — 401 on every non-admin path (T-18-06-01).
 *   - This is the ONLY route that clears totp_enrolled + totp_secret.
 *     The lost-2fa-request route files only; NEVER revokes (D-06).
 *   - activation_complete is left untouched — only the 2FA factor resets, not
 *     the whole workspace. On next login, mailcowImapProvider detects totp_enrolled=false
 *     and routes the physician through the activation TOTP setup step again.
 *   - Deny path included (action: 'deny') — sets status='denied', audits workspace.totp_reset_denied.
 *   - Every approval/denial is audit-logged with the admin actor (workspace.totp_reset_approved /
 *     workspace.totp_reset_denied) per T-18-06-06.
 *   - Body: { physician_id: string; action: 'approve' | 'deny'; request_id?: string }
 *
 * The deliberate human-in-the-loop approval is the security safeguard (D-06):
 * "I lost my 2FA" is exactly what a password thief would claim, so reset is NEVER automatic.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminUser } from '../../../lib/adminAuth';
import { supabaseAdmin } from '../../../lib/supabaseServer';
import { logEvent, extractRequestContext } from '../../../lib/workspaceAuditService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // --- Admin-only gate (T-18-06-01) ---
  // getAdminUser checks the NextAuth session + admin_users table.
  // Returns null if the session is absent or the user is not an admin.
  const admin = await getAdminUser(req, res);
  if (!admin) {
    return res.status(401).json({ error: 'Admin access required' });
  }

  if (!supabaseAdmin) {
    console.error('[totp-reset-approve] supabaseAdmin not configured — failing closed');
    return res.status(500).json({ error: 'Database not configured' });
  }

  const { ipAddress, userAgent } = extractRequestContext(req);

  try {
    const { physician_id: physicianId, action, request_id: requestId } = req.body as {
      physician_id?: string;
      action?: string;
      request_id?: string;
    };

    if (!physicianId || typeof physicianId !== 'string') {
      return res.status(400).json({ error: 'physician_id is required' });
    }

    if (action !== 'approve' && action !== 'deny') {
      return res.status(400).json({ error: 'action must be "approve" or "deny"' });
    }

    // --- Verify the physician exists ---
    const { data: physician, error: physicianErr } = await supabaseAdmin
      .from('physicians')
      .select('id, email')
      .eq('id', physicianId)
      .maybeSingle();

    if (physicianErr || !physician) {
      return res.status(404).json({ error: 'Physician not found' });
    }

    // --- Find the pending reset request (most recent) ---
    // Use request_id if provided; otherwise fall back to the most recent pending row.
    let resetQuery = supabaseAdmin
      .from('physician_totp_resets')
      .select('id, status')
      .eq('physician_id', physicianId)
      .eq('status', 'pending')
      .order('requested_at', { ascending: false })
      .limit(1);

    // If a specific request_id was supplied, constrain to it
    if (requestId) {
      resetQuery = supabaseAdmin
        .from('physician_totp_resets')
        .select('id, status')
        .eq('id', requestId)
        .eq('physician_id', physicianId)
        .eq('status', 'pending')
        .limit(1);
    }

    const { data: resetRows, error: resetErr } = await resetQuery;
    const resetRow = Array.isArray(resetRows) ? resetRows[0] : null;

    if (resetErr) {
      console.error('[totp-reset-approve] error fetching reset request:', resetErr.message);
      return res.status(500).json({ error: 'Internal error' });
    }

    if (!resetRow) {
      return res.status(404).json({ error: 'No pending 2FA reset request found for this physician' });
    }

    const now = new Date().toISOString();

    if (action === 'approve') {
      // --- Approval path ---

      // Step 1: Clear totp_enrolled and totp_secret in physician_workspace_accounts.
      // activation_complete is intentionally NOT changed — only the 2FA factor resets.
      // On next login, mailcowImapProvider sees totp_enrolled=false and re-routes through
      // the activation TOTP setup step (mirrors the activation flow, D-06).
      const { error: resetError } = await supabaseAdmin
        .from('physician_workspace_accounts')
        .update({
          totp_enrolled: false,
          totp_secret: null,
          // activation_complete stays true — do NOT touch this column
        })
        .eq('physician_id', physicianId);

      if (resetError) {
        console.error('[totp-reset-approve] failed to clear TOTP enrollment:', resetError.message);
        return res.status(500).json({ error: 'Failed to reset TOTP enrollment' });
      }

      // Step 2: Update the reset request row to approved.
      const { error: approveErr } = await supabaseAdmin
        .from('physician_totp_resets')
        .update({
          status: 'approved',
          actioned_by: admin.email,
          actioned_at: now,
        })
        .eq('id', resetRow.id);

      if (approveErr) {
        console.error('[totp-reset-approve] failed to update reset row:', approveErr.message);
        // TOTP was already cleared — log and return success (the critical step is done).
        // The status row inconsistency is recoverable via the audit log.
        console.error('[totp-reset-approve] TOTP cleared but status update failed — check audit log');
      }

      // Step 3: Audit log — approval (T-18-06-06).
      await logEvent({
        physicianId,
        actorId: admin.id,
        actorRole: 'admin',
        action: 'workspace.totp_reset_approved',
        detail: {
          approved_by: admin.email,
          request_id: resetRow.id,
          physician_email: physician.email,
          note: 'totp_enrolled cleared; totp_secret nulled; activation_complete untouched; re-enroll on next login',
        },
        ipAddress,
        userAgent,
      });

      return res.status(200).json({
        success: true,
        action: 'approved',
        physician_id: physicianId,
        request_id: resetRow.id,
        message: 'TOTP enrollment cleared. The physician will re-enroll on next login.',
      });
    } else {
      // --- Deny path ---

      const { error: denyErr } = await supabaseAdmin
        .from('physician_totp_resets')
        .update({
          status: 'denied',
          actioned_by: admin.email,
          actioned_at: now,
        })
        .eq('id', resetRow.id);

      if (denyErr) {
        console.error('[totp-reset-approve] failed to update reset row to denied:', denyErr.message);
        return res.status(500).json({ error: 'Failed to deny reset request' });
      }

      // Audit log — denial (informational; workspace.totp_reset_denied excluded from
      // SECURITY_RELEVANT_ACTIONS in workspaceAuditService because it changes no credential state).
      await logEvent({
        physicianId,
        actorId: admin.id,
        actorRole: 'admin',
        action: 'workspace.totp_reset_denied',
        detail: {
          denied_by: admin.email,
          request_id: resetRow.id,
          physician_email: physician.email,
        },
        ipAddress,
        userAgent,
      });

      return res.status(200).json({
        success: true,
        action: 'denied',
        physician_id: physicianId,
        request_id: resetRow.id,
        message: 'Reset request denied. No credential changes made.',
      });
    }
  } catch (err) {
    console.error(
      '[totp-reset-approve] exception:',
      err instanceof Error ? err.message : String(err),
    );
    return res.status(500).json({ error: 'Internal error' });
  }
}
