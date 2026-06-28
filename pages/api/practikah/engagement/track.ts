/**
 * BFF route: POST /api/practikah/engagement/track
 *
 * Forwards an engagement event to the FastAPI /practikah/engagement/track endpoint.
 * High-volume informational events — not security-relevant (T-12-07-01).
 *
 * Mirrors provision.ts BFF pattern (Phase 11 D-04):
 *   - Reads NextAuth session for authentication
 *   - Mints an HS256 JWS and forwards as Authorization: Bearer
 *   - Returns FastAPI response verbatim
 *
 * Fire-and-forget friendly: clients call this without awaiting the result.
 * Clients should swallow any non-200 response (engagement is best-effort).
 *
 * Per T-12-07-03: rate-limited to 60/minute server-side via FastAPI SlowAPI.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { authOptions } from '../../auth/[...nextauth]';
import { mintBackendToken } from '../../../../lib/auth/backendToken';
import type { EngagementEvent } from '../../../../lib/practikahEngagementHeuristic';

const FASTAPI_URL =
  process.env.PRACTIKAH_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8000';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  // Method check
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Session check (browser httpOnly cookie)
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Validate event type client-side before forwarding
  const { event } = req.body as { event?: EngagementEvent };
  const VALID_EVENTS: EngagementEvent[] = [
    'theme_edit',
    'preview_visit',
    'share_link_copied',
    'cta_dismissed',
    'upgrade_interest',
    'upgrade_sat_notify_me',
  ];
  if (!event || !VALID_EVENTS.includes(event)) {
    return res.status(400).json({ error: 'Invalid engagement event type' });
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

  // Forward to FastAPI — no audit log written here (informational event, T-12-07-01)
  try {
    const upstream = await fetch(`${FASTAPI_URL}/practikah/engagement/track`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenRaw}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ event }),
    });

    const result = await upstream.json() as Record<string, unknown>;
    return res.status(upstream.status).json(result);
  } catch (err) {
    console.error('Exception in engagement/track BFF:', err);
    // Return 200 even on upstream error — clients are fire-and-forget;
    // engagement tracking should never surface errors to the doctor's UX.
    return res.status(200).json({ ok: true, _warning: 'upstream_unreachable' });
  }
}
