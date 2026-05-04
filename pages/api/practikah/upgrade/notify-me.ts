/**
 * BFF route: POST /api/practikah/upgrade/notify-me
 *
 * Records an "upgrade_sat_notify_me" engagement event for the authenticated
 * physician. Surfaces in the SAT-blocked notice (Plan 13-03) and on the
 * upgrade-coming-soon screen so we know which Mexican physicians want a
 * heads-up the moment Pro launches.
 *
 * Reuses the Plan 12-07 engagement tracker pattern — increments a counter on
 * `physician_workspace_accounts.engagement_counters` JSONB. The plan text
 * mentioned an `engagement_events` table; the live Phase 12 implementation
 * uses the JSONB counter column instead, so this route forwards to the same
 * `/practikah/engagement/track` FastAPI endpoint with the new event key.
 *
 * Forwards the NextAuth HS256 JWT per Phase 11 D-04. No body required from
 * the client — the physician identity comes from the session.
 *
 * Per T-13-04 / T-12-07-01: engagement is informational, not security-relevant.
 * Counters are doctor-owned (no cross-tenant risk). Worst-case manipulation:
 * doctor inflates their own notify-me count — no security impact.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { authOptions } from '../../auth/[...nextauth]';

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

  const tokenRaw = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    raw: true,
  });
  if (!tokenRaw) {
    return res.status(401).json({ error: 'Session token unavailable' });
  }

  try {
    const upstream = await fetch(`${FASTAPI_URL}/practikah/engagement/track`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenRaw}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ event: 'upgrade_sat_notify_me' }),
    });

    const body: unknown = await upstream.json();
    return res.status(upstream.status).json(body);
  } catch (err) {
    console.error('Exception in upgrade/notify-me BFF:', err);
    return res.status(502).json({ error: 'Upstream API unreachable' });
  }
}
