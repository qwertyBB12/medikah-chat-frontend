/**
 * BFF route: POST /api/practikah/upgrade/checkout (Phase 13-05)
 *
 * Forwards the Pro-upgrade Stripe Checkout creation request to the FastAPI
 * /practikah/upgrade/checkout endpoint, attaching the NextAuth HS256 JWT as
 * Authorization: Bearer per Phase 11 D-04.
 *
 * Per D-07 / Plan 13-05 Task 1: 403 envelopes (SAT_BLOCKED,
 * COUNTRY_NOT_SUPPORTED) carry bilingual ``message_en`` + ``message_es`` keys.
 * This BFF passes them through verbatim so the wizard renders the right
 * locale string without an extra round-trip.
 *
 * Per OPS-01: on HTTP 200 success, writes a workspace_audit_log row for
 * 'billing.checkout_started' (best-effort — never blocks the response).
 * Non-200 responses (including the 403 bilingual envelope) → no audit row,
 * no state change.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { authOptions } from '../../auth/[...nextauth]';
import { mintBackendToken } from '../../../../lib/auth/backendToken';
import {
  extractRequestContext,
  logEvent,
} from '../../../../lib/workspaceAuditService';

const FASTAPI_URL =
  process.env.PRACTIKAH_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8000';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // NextAuth v4 issues an encrypted JWE; forwarding it raw 401s the FastAPI
  // HS256 gate ("Invalid token"). Mint a fresh HS256 JWS from the decrypted
  // session claims instead — see lib/auth/backendToken.ts (requires the same
  // NEXTAUTH_SECRET on Netlify (signs) and Render (verifies)).
  const sessionToken = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });
  const tokenRaw =
    sessionToken?.userId && sessionToken?.role
      ? await mintBackendToken({
          userId: String(sessionToken.userId),
          role: String(sessionToken.role),
          email: session.user.email,
          physicianId: sessionToken.physician_id
            ? String(sessionToken.physician_id)
            : undefined,
        }).catch(() => null)
      : null;
  if (!tokenRaw) {
    return res.status(401).json({ error: 'Session token unavailable' });
  }

  try {
    const upstream = await fetch(
      `${FASTAPI_URL}/practikah/upgrade/checkout`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenRaw}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req.body),
      },
    );

    const result = (await upstream.json()) as Record<string, unknown>;

    // OPS-01 audit log — only on success (HTTP 200). 403 bilingual
    // envelopes are forwarded verbatim with no audit entry written.
    if (upstream.status === 200) {
      const reqCtx = extractRequestContext(req);
      const body = (req.body ?? {}) as Record<string, unknown>;
      // billing.checkout_started is informational (NOT in
      // SECURITY_RELEVANT_ACTIONS) so IP/UA are filtered to null.
      await logEvent({
        physicianId: '',
        actorId: (session.user as { id?: string }).id,
        actorRole: 'physician',
        action: 'billing.checkout_started',
        resourceType: 'billing',
        resourceId: result.session_id as string | undefined,
        detail: {
          tld_class: body.tld_class,
          cadence: body.cadence,
          domain: body.domain,
        },
        ipAddress: reqCtx.ipAddress,
        userAgent: reqCtx.userAgent,
      });
    }

    return res.status(upstream.status).json(result);
  } catch (err) {
    console.error('Exception in upgrade/checkout BFF:', err);
    return res.status(502).json({ error: 'Upstream API unreachable' });
  }
}
