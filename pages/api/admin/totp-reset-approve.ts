/**
 * /api/admin/totp-reset-approve  (POST + GET one-tap)
 *
 * Admin TOTP revoke → forces re-enroll at /auth/reenroll (D-06 / D-14 / SC5 / T-18-06-01).
 *
 * Two entry paths, ONE shared approve body (they cannot drift — see applyApproval):
 *   - POST { physician_id, action: 'approve' | 'deny', request_id? }  — programmatic.
 *   - GET  ?token=<signed totp_reset_approval JWT>  — the one-tap link from the
 *     lost-2FA admin email (D-14). The link is STILL admin-authenticated: an
 *     attacker who steals the email link but is not a signed-in admin gets 401.
 *
 * Security contract:
 *   - Admin-gated via getAdminUser on BOTH methods — 401 on every non-admin path
 *     (T-18-06-01). The 401 precedes any credential change.
 *   - This is the ONLY route that clears totp_enrolled + totp_secret.
 *     The lost-2fa-request route files only; NEVER revokes (D-06).
 *   - activation_complete is left untouched — only the 2FA factor resets, not
 *     the whole workspace. After approval, mailcowImapProvider FAILS CLOSED on
 *     the reset account (no password-only session, D-12 invariant); the physician
 *     re-enrolls a fresh authenticator at /auth/reenroll (isolated, password +
 *     approval-gated). This route does NOT route through the activation setup step.
 *   - GET single-use (D-14): the token is type-isolated ('totp_reset_approval'),
 *     30-min, bound to one request_id; the consume path requires the bound
 *     physician_totp_resets row to still be status='pending'. A reused link finds
 *     the row already 'approved' → "already approved" page, no credential change.
 *   - Deny path included (POST action: 'deny') — sets status='denied', audits.
 *   - Every approval/denial is audit-logged with the admin actor per T-18-06-06.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminUser, type AdminUser } from '../../../lib/adminAuth';
import { supabaseAdmin } from '../../../lib/supabaseServer';
import { logEvent, extractRequestContext } from '../../../lib/workspaceAuditService';
import { verifyTotpResetApprovalToken } from '../../../lib/auth/totpResetApprovalTokens';

// ---------------------------------------------------------------------------
// Shared approve body — POST and GET both call this so they cannot drift (D-14).
// Clears the 2FA factor, flips the bound reset row to 'approved', and audits.
// Callers MUST have already loaded a pending reset row for this physician.
// ---------------------------------------------------------------------------

interface ApprovalContext {
  physicianId: string;
  physicianEmail: string;
  resetRowId: string;
  admin: AdminUser;
  ipAddress?: string;
  userAgent?: string;
  via: 'post' | 'one_tap_link';
}

async function applyApproval(ctx: ApprovalContext): Promise<{ ok: boolean }> {
  if (!supabaseAdmin) return { ok: false };

  // Step 1: Clear totp_enrolled and totp_secret. activation_complete stays true —
  // only the 2FA factor resets. Post-reset the provider fails closed; the physician
  // re-enrolls at /auth/reenroll.
  const { error: resetError } = await supabaseAdmin
    .from('physician_workspace_accounts')
    .update({
      totp_enrolled: false,
      totp_secret: null,
      // activation_complete stays true — do NOT touch this column
    })
    .eq('physician_id', ctx.physicianId);

  if (resetError) {
    console.error('[totp-reset-approve] failed to clear TOTP enrollment:', resetError.message);
    return { ok: false };
  }

  // Step 2: Flip the bound reset request row to approved.
  const { error: approveErr } = await supabaseAdmin
    .from('physician_totp_resets')
    .update({
      status: 'approved',
      actioned_by: ctx.admin.email,
      actioned_at: new Date().toISOString(),
    })
    .eq('id', ctx.resetRowId);

  if (approveErr) {
    // TOTP was already cleared — log and continue (the critical step is done).
    console.error('[totp-reset-approve] TOTP cleared but status update failed — check audit log');
  }

  // Step 3: Audit (T-18-06-06).
  await logEvent({
    physicianId: ctx.physicianId,
    actorId: ctx.admin.id,
    actorRole: 'admin',
    action: 'workspace.totp_reset_approved',
    detail: {
      approved_by: ctx.admin.email,
      request_id: ctx.resetRowId,
      physician_email: ctx.physicianEmail,
      via: ctx.via,
      note: 'totp_enrolled cleared; totp_secret nulled; activation_complete untouched; re-enroll at /auth/reenroll',
    },
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  });

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Minimal branded HTML responses for the one-tap GET link.
// ---------------------------------------------------------------------------

function htmlPage(title: string, body: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>${title} — Práctikah</title></head><body style="margin:0;background:#FAFAFB;font-family:'Mulish',-apple-system,sans-serif;color:#4A5568;"><div style="max-width:440px;margin:64px auto;padding:0 20px;text-align:center;"><div style="font-size:24px;font-weight:500;letter-spacing:0.04em;color:#1B2A41;margin-bottom:24px;">práctikah</div><div style="background:#fff;border-radius:32px;box-shadow:0 10px 30px rgba(0,0,0,0.06);padding:32px;"><h1 style="font-size:20px;color:#1B2A41;margin:0 0 12px;">${title}</h1><p style="font-size:15px;line-height:1.6;margin:0;">${body}</p></div></div></body></html>`;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  const { ipAddress, userAgent } = extractRequestContext(req);

  // =========================================================================
  // GET — one-tap signed-link entry path (D-14)
  // =========================================================================
  if (req.method === 'GET') {
    // --- Admin-only gate FIRST (precedes any credential change) ---
    // The link is one-tap but STILL admin-authenticated. A stolen/forwarded link
    // in the hands of a non-admin gets nothing.
    const admin = await getAdminUser(req, res);
    if (!admin) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res
        .status(401)
        .send(htmlPage('Administrator sign-in required', 'Sign in to Práctikah as an administrator, then open this link again.'));
    }

    if (!supabaseAdmin) {
      console.error('[totp-reset-approve][GET] supabaseAdmin not configured — failing closed');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(500).send(htmlPage('Service unavailable', 'Please try again shortly.'));
    }

    const token = typeof req.query.token === 'string' ? req.query.token : '';
    const claims = token ? await verifyTotpResetApprovalToken(token) : null;
    if (!claims) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res
        .status(400)
        .send(htmlPage('Link invalid or expired', 'This approval link is no longer valid. Ask the physician to file a new lost-2FA request.'));
    }

    // --- Load the bound physician + the SPECIFIC reset row (request_id binding) ---
    const { data: physician } = await supabaseAdmin
      .from('physicians')
      .select('id, email')
      .eq('id', claims.physician_id)
      .maybeSingle();

    if (!physician) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(404).send(htmlPage('Request not found', 'No matching reset request was found.'));
    }

    const { data: resetRow } = await supabaseAdmin
      .from('physician_totp_resets')
      .select('id, status')
      .eq('id', claims.request_id)
      .eq('physician_id', claims.physician_id)
      .maybeSingle();

    if (!resetRow) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(404).send(htmlPage('Request not found', 'No matching reset request was found for this link.'));
    }

    // --- Single-use gate: the bound row must still be pending (D-14) ---
    // A reused link finds the row already 'approved' (or denied) → no change.
    if (resetRow.status !== 'pending') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res
        .status(200)
        .send(htmlPage('Already approved', 'This reset was already actioned. No further changes were made.'));
    }

    const result = await applyApproval({
      physicianId: physician.id,
      physicianEmail: physician.email,
      resetRowId: resetRow.id,
      admin,
      ipAddress,
      userAgent,
      via: 'one_tap_link',
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (!result.ok) {
      return res.status(500).send(htmlPage('Approval failed', 'Something went wrong. Please try again.'));
    }
    return res
      .status(200)
      .send(
        htmlPage(
          'Reset approved',
          'The physician can now set up a new authenticator at <strong>/auth/reenroll</strong>.',
        ),
      );
  }

  // =========================================================================
  // POST — programmatic approve/deny
  // =========================================================================
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
      // --- Approval path: shared with the one-tap GET link (cannot drift) ---
      const result = await applyApproval({
        physicianId,
        physicianEmail: physician.email,
        resetRowId: resetRow.id,
        admin,
        ipAddress,
        userAgent,
        via: 'post',
      });

      if (!result.ok) {
        return res.status(500).json({ error: 'Failed to reset TOTP enrollment' });
      }

      return res.status(200).json({
        success: true,
        action: 'approved',
        physician_id: physicianId,
        request_id: resetRow.id,
        message: 'TOTP enrollment cleared. The physician re-enrolls at /auth/reenroll.',
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
