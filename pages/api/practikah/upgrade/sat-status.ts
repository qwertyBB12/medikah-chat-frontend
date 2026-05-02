/**
 * BFF route: GET /api/practikah/upgrade/sat-status
 *
 * Forwards the authenticated physician's SAT-compliance + launch-scope status
 * request to the FastAPI /practikah/upgrade/sat-status endpoint, forwarding
 * the NextAuth HS256 JWT as Authorization: Bearer per Phase 11 D-04.
 *
 * Used by the Pro upsell wizard (Plan 13-04/05) to decide whether to render
 * SATBlockedNotice (Mexican physician + flag OFF) or the actual upgrade flow.
 *
 * Per T-13-03-01: this endpoint is a UX hint only. The security control is
 * server-side assert_eligible() inside FastAPI's /upgrade/checkout (Plan 13-05).
 *
 * Per T-13-03-03: response leaks no PII beyond the physician's own country.
 *
 * No audit log — this is a read-only idempotent GET.
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
  if (req.method !== 'GET') {
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
    const upstream = await fetch(`${FASTAPI_URL}/practikah/upgrade/sat-status`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenRaw}`,
        'Content-Type': 'application/json',
      },
    });

    const body: unknown = await upstream.json();
    return res.status(upstream.status).json(body);
  } catch (err) {
    console.error('Exception in upgrade/sat-status BFF:', err);
    return res.status(502).json({ error: 'Upstream API unreachable' });
  }
}
