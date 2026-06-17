/**
 * /api/auth/demotion-log — Bootstrap-demotion wall mount audit log
 *
 * Phase 18 Plan 04 — T-18-04-04 (Repudiation mitigation).
 *
 * Called by /chat on demotion-wall mount to record the full request context
 * (IP address + User-Agent) for the workspace.bootstrap_demotion_hit event.
 *
 * The jwt() callback writes a preliminary audit row with actorRole='system' and
 * null IP/UA (jwt() has no access to the raw HTTP request). This route captures
 * the wall-render event WITH full request context so the audit trail is complete.
 *
 * Security posture:
 *   - Requires an active session with bootstrap_demoted=true (wall is rendered;
 *     this is the client confirming the wall was shown, not an auth gate bypass).
 *   - Method: POST only.
 *   - Fails gracefully (returns 200 even on error to avoid leaking details).
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './[...nextauth]';
import { logEvent, extractRequestContext } from '../../../lib/workspaceAuditService';
import { supabaseAdmin } from '../../../lib/supabaseServer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Always return 200 — never leak errors on this route
  try {
    const session = await getServerSession(req, res, authOptions);

    // Must have a demoted physician session
    if (
      !session?.user?.bootstrap_demoted ||
      !session.user.email ||
      session.user.role !== 'physician'
    ) {
      return res.status(200).json({ logged: false });
    }

    if (!supabaseAdmin) {
      return res.status(200).json({ logged: false });
    }

    // Resolve physician_id from the session email (direct lookup + alias fallback)
    const canonicalEmail = session.user.email.toLowerCase();

    const { data: physician } = await supabaseAdmin
      .from('physicians')
      .select('id')
      .eq('email', canonicalEmail)
      .maybeSingle();

    let physicianId: string | null = physician?.id ?? null;

    if (!physicianId) {
      const { data: alias } = await supabaseAdmin
        .from('physician_email_aliases')
        .select('physician_id')
        .eq('email', canonicalEmail)
        .maybeSingle();
      physicianId = alias?.physician_id ?? null;
    }

    if (!physicianId) {
      return res.status(200).json({ logged: false });
    }

    const { ipAddress, userAgent } = extractRequestContext(req);

    await logEvent({
      physicianId,
      actorRole: 'system',
      action: 'workspace.bootstrap_demotion_hit',
      detail: {
        provider: session.user.provider ?? 'unknown',
        trigger: 'wall_mount',
      },
      ipAddress,
      userAgent,
    });

    return res.status(200).json({ logged: true });
  } catch {
    // Never surface errors on this route
    return res.status(200).json({ logged: false });
  }
}
