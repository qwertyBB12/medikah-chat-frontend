/**
 * BFF route: GET /api/practikah/upgrade/run-by-session?session_id=cs_…
 *
 * Owner-gated lookup that resolves a Stripe Checkout `session_id` (returned
 * to the wizard via `success_url`) to the saga `run_id` keyed in
 * `provisioning_runs`. The wizard then opens an EventSource against
 * /api/practikah/upgrade/status?run_id=…
 *
 * FastAPI re-validates ownership: the upstream query filters by both
 * stripe_session_id AND auth.physician_id, so a doctor can never resolve
 * another physician's run_id (T-13-07-04 forged-run-id mitigation).
 *
 * No audit log — read-only idempotent GET.
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

  const sessionId = String(req.query.session_id || '');
  if (!sessionId) {
    return res.status(400).json({ error: 'session_id required' });
  }

  try {
    const upstream = await fetch(
      `${FASTAPI_URL}/practikah/upgrade/run-by-session?session_id=${encodeURIComponent(sessionId)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenRaw}`,
          'Content-Type': 'application/json',
        },
      },
    );

    const body: unknown = await upstream.json();
    return res.status(upstream.status).json(body);
  } catch (err) {
    console.error('Exception in run-by-session BFF:', err);
    return res.status(502).json({ error: 'Upstream API unreachable' });
  }
}
