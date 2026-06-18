/**
 * POST /api/auth/recovery/lost-2fa-request
 *
 * Self-service lost-2FA request route (D-06 / SC5 / T-18-06-01 / T-18-06-02).
 *
 * Security contract:
 *   - A physician must have a valid authenticated session (mailcow-imap or credentials)
 *     before a row is written — "I lost my 2FA" is exactly what a password thief claims,
 *     so the first factor (Mailcow password) MUST be cleared before filing (D-06).
 *   - Anonymous callers receive a neutral filed:true response with NO row written (T-18-06-02).
 *   - Rate limit: 1 request per 5 minutes per physician (idempotent — skips if a pending
 *     row already exists for this physician).
 *   - This route files a request ONLY — it never clears the TOTP factor (D-06).
 *     Revocation of the 2FA factor is handled exclusively by the admin approval route.
 *     Admin approval via /api/admin/totp-reset-approve.ts is the only revocation path.
 *   - Every path (anonymous, throttled, duplicate, success) returns 200 { filed: true }
 *     to prevent enumeration (T-18-06-02 / D-05 non-enumeration pattern).
 *   - Every step is audit-logged in workspace_audit_log (workspace.totp_reset_requested).
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../[...nextauth]';
import { supabaseAdmin } from '../../../../lib/supabaseServer';
import { logEvent, extractRequestContext } from '../../../../lib/workspaceAuditService';

// ---------------------------------------------------------------------------
// Rate limit: 1 request per 5 minutes per physician (in-process, burst guard)
// ---------------------------------------------------------------------------

const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

interface RateLimitEntry {
  windowStart: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

function checkRateLimit(physicianId: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(physicianId);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(physicianId, { windowStart: now });
    return true; // allowed
  }
  return false; // throttled — a request was filed within the last 5 minutes
}

// ---------------------------------------------------------------------------
// Neutral response — identical on ALL branches (non-enumeration, D-05)
// ---------------------------------------------------------------------------

const NEUTRAL = { filed: true };

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
    console.error('[lost-2fa-request] supabaseAdmin not configured — failing closed');
    return res.status(500).json({ error: 'Database not configured' });
  }

  const { ipAddress, userAgent } = extractRequestContext(req);

  try {
    // --- D-06: require a physician-identifying session (first factor cleared) ---
    // An anonymous caller cannot file a 2FA reset — we don't know who they are.
    // Two valid session shapes prove the first factor was cleared:
    //   - a needs_totp session (mailcow IMAP password verified, second factor
    //     outstanding) — carries physician_id but NO email. THIS is the realistic
    //     lost-authenticator caller: the doctor is stuck on the TOTP step having
    //     just passed their password (CARRY-18-B).
    //   - a fully-authenticated session carrying an email (e.g. credentials/Google
    //     bootstrap recovery surface).
    // Anonymous callers get a neutral filed:true with NO row written (T-18-06-02).
    const session = await getServerSession(req, res, authOptions);
    const sessionPhysicianId = session?.user?.physician_id ?? null;
    const sessionEmail = session?.user?.email ? session.user.email.toLowerCase() : null;
    if (!sessionPhysicianId && !sessionEmail) {
      // Anonymous caller — return neutral with no row written (T-18-06-02)
      return res.status(200).json(NEUTRAL);
    }

    // --- Resolve the physician by physician_id (needs_totp) or session email ---
    const basePhysicianQuery = supabaseAdmin.from('physicians').select('id, email');
    const { data: physician, error: physicianErr } = sessionPhysicianId
      ? await basePhysicianQuery.eq('id', sessionPhysicianId).maybeSingle()
      : await basePhysicianQuery.eq('email', sessionEmail as string).maybeSingle();

    if (physicianErr || !physician) {
      // Not a known physician session — return neutral (non-enumeration)
      return res.status(200).json(NEUTRAL);
    }

    // --- Verify the physician has an activated workspace (D-06: only activated physicians) ---
    // We check activation_complete only — we do not inspect the 2FA columns here.
    // (The admin approval route is the only path that touches those columns.)
    const { data: workspace, error: wsErr } = await supabaseAdmin
      .from('physician_workspace_accounts')
      .select('activation_complete')
      .eq('physician_id', physician.id)
      .maybeSingle();

    if (wsErr || !workspace || !workspace.activation_complete) {
      // No activated workspace — return neutral
      return res.status(200).json(NEUTRAL);
    }

    // --- Rate limit: 1 request per 5 min per physician ---
    const allowed = checkRateLimit(physician.id);
    if (!allowed) {
      // Throttled — still return neutral (non-enumeration)
      return res.status(200).json(NEUTRAL);
    }

    // --- Idempotent: skip if a pending row already exists ---
    const { data: existingRequest } = await supabaseAdmin
      .from('physician_totp_resets')
      .select('id, status')
      .eq('physician_id', physician.id)
      .eq('status', 'pending')
      .maybeSingle();

    if (!existingRequest) {
      // Insert a new pending reset request
      const { error: insertErr } = await supabaseAdmin
        .from('physician_totp_resets')
        .insert({
          physician_id: physician.id,
          status: 'pending',
        });

      if (insertErr) {
        console.error('[lost-2fa-request] failed to insert reset request:', insertErr.message);
        // Return neutral regardless — non-enumeration (D-05)
        return res.status(200).json(NEUTRAL);
      }

      // --- Send admin notification email ---
      // Notify hector@medikah.health (DOCTOR_NOTIFICATION_EMAIL) that a reset was filed.
      // Fire-and-forget — failure does not block the 200 response.
      try {
        const adminEmail =
          process.env.DOCTOR_NOTIFICATION_EMAIL || 'hector@medikah.health';
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://medikah.health';
        const approveUrl = `${baseUrl}/admin/totp-resets`;

        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);

        await resend.emails.send({
          from: 'Práctikah <welcome@medikah.health>',
          to: adminEmail,
          subject: `[Action Required] Lost-2FA Reset Request — ${physician.email}`,
          html: [
            '<p><strong>A physician has filed a lost-2FA reset request.</strong></p>',
            `<p><strong>Physician email:</strong> ${physician.email}</p>`,
            `<p><strong>Physician ID:</strong> ${physician.id}</p>`,
            '<p>To approve or deny this request, visit the admin panel:</p>',
            `<p><a href="${approveUrl}">${approveUrl}</a></p>`,
            '<p style="color:#B83D3D;"><strong>Security note:</strong> "I lost my 2FA" is a common attacker claim. ',
            'Verify the physician\'s identity via a secondary channel before approving.</p>',
            '<p><em>This message was sent by the Práctikah security system.</em></p>',
          ].join(''),
        });
      } catch (emailErr) {
        // Email failure is non-blocking — the request is filed regardless
        console.error('[lost-2fa-request] admin notification email failed:', emailErr);
      }
    }
    // If existingRequest exists, skip insert and email (idempotent) — still audit below.

    // --- Audit log: every filing attempt is recorded ---
    await logEvent({
      physicianId: physician.id,
      actorId: physician.id,
      actorRole: 'physician',
      action: 'workspace.totp_reset_requested',
      detail: {
        flow: 'lost_2fa',
        idempotent: Boolean(existingRequest),
        sessionProvider: session?.user?.provider ?? 'unknown',
      },
      ipAddress,
      userAgent,
    });

    return res.status(200).json(NEUTRAL);
  } catch (err) {
    console.error('[lost-2fa-request] exception:', err instanceof Error ? err.message : String(err));
    // Always return neutral on any error (non-enumeration, D-05)
    return res.status(200).json(NEUTRAL);
  }
}
