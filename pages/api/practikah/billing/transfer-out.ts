/**
 * BFF route: POST /api/practikah/billing/transfer-out (Phase 13-09 / PRO-11)
 *
 * Doctor-initiated transfer-out. Returns the EPP authorization code
 * synchronously so the dashboard can render it immediately for
 * copy-to-clipboard. The same code is also delivered via authenticated
 * email (PRO-11 24-hour SLA).
 *
 * Auth shape mirrors portal-link.ts (D-04): NextAuth session cookie + raw
 * HS256 JWT forwarded as Authorization: Bearer to FastAPI, which re-verifies
 * and asserts verification_status='verified'. Per T-13-09-04 the physician_id
 * is read from the JWT — never from the request body.
 *
 * FastAPI rate-limits this endpoint at 3/min per the threat model; rejection
 * surfaces as 429 from upstream. No audit log on this BFF — FastAPI
 * dunning_state_machine.request_transfer_out writes the
 * billing.transfer_out_requested event with epp_issued: True flag (the EPP
 * code itself never lands in the audit log per T-13-09-06).
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
    res.setHeader('Allow', 'POST');
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
    const upstream = await fetch(`${FASTAPI_URL}/practikah/billing/transfer-out`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenRaw}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const result = await upstream.json();
    return res.status(upstream.status).json(result);
  } catch (err) {
    console.error('practikah/billing/transfer-out: upstream fetch failed', err);
    return res.status(502).json({ error: 'Upstream API unreachable' });
  }
}
