/**
 * POST /api/admin/credits/award-cdmx
 *
 * Admin-only endpoint: award the CDMX inaugural-event attendance credit
 * (4 credit-hours, pass_flag=true) to a physician (CERT-05).
 *
 * Security contract:
 *   - Admin-gated via getAdminUser — 401 on every non-admin path (mirrors
 *     totp-reset-approve.ts + pending-reviews.ts gating pattern).
 *   - Calls award_cdmx_attendance via supabaseAdmin (service_role key), which
 *     calls the award_cdmx_attendance SECURITY DEFINER RPC. The RPC is
 *     GRANTED to service_role ONLY; anon/authenticated calls are rejected at DB.
 *   - IDEMPOTENT: a physician can be awarded at most ONE cdmx-attendance credit.
 *     A second POST for the same physician returns alreadyAwarded=true with
 *     HTTP 200 (no double-count, no error).
 *
 * Request body (JSON):
 *   { physicianId: string }                  — award by physician UUID
 *   OR { email: string }                      — award by physician email (resolves to id)
 *
 * Response (HTTP 200):
 *   { awarded: boolean, alreadyAwarded: boolean, creditHours: number, logId: string }
 *
 * Error responses:
 *   401  — not authenticated or not an admin (EN/ES error strings)
 *   400  — missing/invalid body (EN/ES)
 *   404  — physician not found when email lookup used
 *   405  — method not allowed (only POST accepted)
 *   500  — internal error (EN/ES)
 *
 * Audit:
 *   Every award is logged to workspace_audit_log with actor (admin) and
 *   target (physician). Already-awarded no-ops are also logged for traceability.
 *   Uses the existing logEvent helper (workspaceAuditService.ts).
 *
 * Operator call shape (CDMX event day):
 *   POST /api/admin/credits/award-cdmx
 *   Content-Type: application/json
 *   { "physicianId": "uuid-of-physician" }
 *
 *   OR (if only email known):
 *   { "email": "dr.garcia@example.com" }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminUser } from '../../../../lib/adminAuth';
import { supabaseAdmin } from '../../../../lib/supabaseServer';
import { awardCdmxAttendance } from '../../../../lib/credits';
import { logEvent, extractRequestContext } from '../../../../lib/workspaceAuditService';

// ---------------------------------------------------------------------------
// Bilingual error strings
// ---------------------------------------------------------------------------

const ERRORS = {
  method_not_allowed: {
    en: 'Method not allowed',
    es: 'Método no permitido',
  },
  admin_required: {
    en: 'Admin access required',
    es: 'Se requiere acceso de administrador',
  },
  db_not_configured: {
    en: 'Database not configured',
    es: 'Base de datos no configurada',
  },
  body_required: {
    en: 'Request body must include physicianId (UUID) or email',
    es: 'El cuerpo de la solicitud debe incluir physicianId (UUID) o email',
  },
  physician_not_found: {
    en: 'Physician not found',
    es: 'Médico no encontrado',
  },
  internal: {
    en: 'Internal error — credit award failed',
    es: 'Error interno — no se pudo otorgar el crédito',
  },
} as const;

function err(key: keyof typeof ERRORS) {
  return { error: ERRORS[key].en, errorEs: ERRORS[key].es };
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  // Only POST is accepted.
  if (req.method !== 'POST') {
    return res.status(405).json(err('method_not_allowed'));
  }

  // Admin gate — must match the exact pattern used by totp-reset-approve.ts and
  // pending-reviews.ts: getAdminUser checks the NextAuth session against admin_users
  // table. Workspace (mailcow-imap) sessions are recognized via mailbox_email fallback.
  const admin = await getAdminUser(req, res);
  if (!admin) {
    return res.status(401).json(err('admin_required'));
  }

  if (!supabaseAdmin) {
    console.error('[award-cdmx] supabaseAdmin not configured — failing closed');
    return res.status(500).json(err('db_not_configured'));
  }

  const { ipAddress, userAgent } = extractRequestContext(req);

  try {
    const body = req.body as { physicianId?: string; email?: string } | undefined;

    let physicianId = typeof body?.physicianId === 'string' ? body.physicianId.trim() : '';
    const emailInput = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';

    // Resolve email → physicianId if email was provided instead of UUID.
    if (!physicianId && emailInput) {
      const { data: physician, error: lookupErr } = await supabaseAdmin
        .from('physicians')
        .select('id')
        .eq('email', emailInput)
        .maybeSingle();

      if (lookupErr) {
        console.error('[award-cdmx] physician email lookup failed:', lookupErr.message);
        return res.status(500).json(err('internal'));
      }

      if (!physician) {
        return res.status(404).json(err('physician_not_found'));
      }

      physicianId = physician.id as string;
    }

    if (!physicianId) {
      return res.status(400).json(err('body_required'));
    }

    // Call the credit helper (wraps the award_cdmx_attendance SECURITY DEFINER RPC).
    const result = await awardCdmxAttendance(physicianId);

    // Audit log — record both fresh awards and idempotent no-ops for traceability.
    // workspace_audit_log does not have a credit-award action type yet; we use a
    // new action string under the 'workspace.' namespace following the established
    // pattern. Audit failures are best-effort (logEvent never throws).
    // Note: 'workspace.credit_awarded' is not in the WorkspaceAction union yet —
    // this cast is intentional and should be added to workspaceAuditService.ts
    // in the follow-up HAB-06 dashboard plan. The audit write still succeeds
    // because workspace_audit_log.action is a text column (no DB enum).
    await logEvent({
      physicianId,
      actorId:   admin.id,
      actorRole: 'admin',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      action:    'workspace.credit_awarded' as any,
      detail: {
        source:          'cdmx-attendance',
        credit_hours:    4,
        puntos:          4,
        pass_flag:       true,
        awarded:         result.awarded,
        already_awarded: result.alreadyAwarded,
        log_id:          result.logId,
        awarded_by:      admin.email,
      },
      ipAddress,
      userAgent,
    });

    // Return idempotent result — HTTP 200 in both cases.
    return res.status(200).json({
      awarded:       result.awarded,
      alreadyAwarded: result.alreadyAwarded,
      creditHours:   result.creditHours,
      logId:         result.logId,
      source:        result.source,
      physicianId,
    });

  } catch (caught) {
    console.error(
      '[award-cdmx] exception:',
      caught instanceof Error ? caught.message : String(caught),
    );
    return res.status(500).json(err('internal'));
  }
}
