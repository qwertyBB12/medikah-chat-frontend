/**
 * POST /api/admin/physicians/{id}/resend-activation
 *
 * Admin-gated, SAFE re-send of the workspace activation magic-link. Unlike
 * re-running /verify-credentials (which re-runs the external credential pipeline
 * and can DOWNGRADE an already-verified physician to manual review), this does
 * NOT touch verification — it only re-fires the activation email for a physician
 * who is already verified.
 *
 * Built for the CDMX batch-provisioning flow (decision 34/35) and the TOTP
 * re-key runbook: an admin needs to (re)issue activation links to verified
 * physicians without disturbing their verification state. Idempotency +
 * single-use token handling live in triggerWorkspaceActivation (a fresh token is
 * issued only when no live one exists).
 *
 * Security:
 *   - Admin-only (getAdminUser).
 *   - Sends only to the physician record's own stored email — never an arbitrary address.
 *   - Raw token is never logged (handled inside triggerWorkspaceActivation).
 *   - Writes a workspace_audit_log row for the resend (action: workspace.activation_link_resent).
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminUser } from '../../../../../lib/adminAuth';
import { supabaseAdmin } from '../../../../../lib/supabaseServer';
import { triggerWorkspaceActivation } from '../../../../../lib/activationEmail';
import { logEvent, extractRequestContext } from '../../../../../lib/workspaceAuditService';

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const head = local.slice(0, 2);
  return `${head}${'*'.repeat(Math.max(1, local.length - 2))}@${domain}`;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const admin = await getAdminUser(req, res);
  if (!admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const physicianId = req.query.id as string;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!physicianId || !uuidRegex.test(physicianId)) {
    return res.status(400).json({ error: 'Valid physician ID is required' });
  }

  try {
    // Confirm the physician exists and is verified — we do not issue activation
    // links to unverified physicians (the verification→activation gate stands).
    const { data: physician, error } = await supabaseAdmin
      .from('physicians')
      .select('id, email, verification_status')
      .eq('id', physicianId)
      .maybeSingle();

    if (error || !physician) {
      return res.status(404).json({ error: 'Physician not found' });
    }

    if (physician.verification_status !== 'verified') {
      return res.status(409).json({
        error: 'Physician is not verified; activation links are only issued to verified physicians',
        verification_status: physician.verification_status,
      });
    }

    // Re-fire the activation email. force=true expires any live token so the admin
    // always gets a fresh link issued — the previous email may have been lost.
    // triggerWorkspaceActivation still gates on the mailbox being provisioned (Option B).
    const result = await triggerWorkspaceActivation(physicianId, { force: true });

    if (result.status === 'skipped' && result.reason === 'mailbox_not_provisioned') {
      return res.status(409).json({
        error:
          'Mailbox not provisioned yet — the physician must complete workspace setup (or have their mailbox provisioned) before an activation link can be issued.',
        reason: 'mailbox_not_provisioned',
      });
    }

    if (result.status === 'failed') {
      return res.status(502).json({
        error: 'Activation link could not be sent — check email configuration and try again.',
        reason: result.reason,
      });
    }

    if (result.status === 'skipped' && result.reason !== 'token_active') {
      // not_configured / physician_not_found / lookup_error — nothing was sent.
      return res.status(500).json({
        error: 'Activation link could not be issued.',
        reason: result.reason,
      });
    }

    // result.status === 'sent' (fresh link) or 'skipped/token_active' (a live link
    // already exists and is still valid) — both are a successful resend outcome.
    const reqCtx = extractRequestContext(req);
    await logEvent({
      physicianId,
      actorId: admin.id,
      actorRole: 'admin',
      action: 'workspace.activation_link_resent',
      detail: { flow: 'admin_resend', triggered_by: admin.email, result: result.status },
      ipAddress: reqCtx.ipAddress,
      userAgent: reqCtx.userAgent,
    });

    return res.status(200).json({
      ok: true,
      sentTo: maskEmail(physician.email as string),
      alreadyValid: result.status === 'skipped',
    });
  } catch (err) {
    console.error('[resend-activation] exception:', err instanceof Error ? err.message : String(err));
    return res.status(500).json({ error: 'Failed to resend activation link' });
  }
}
