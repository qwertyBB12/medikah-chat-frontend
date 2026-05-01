/**
 * BFF route: POST /api/practikah/billing/portal-link (Phase 13-01)
 *
 * Returns a fresh Stripe Customer Portal session URL for the authenticated
 * physician. Frontend redirects via window.location.href = url.
 *
 * Auth shape mirrors /api/practikah/provision.ts (D-04): NextAuth session
 * cookie + raw HS256 JWT forwarded as Authorization: Bearer to FastAPI,
 * which re-verifies and asserts verification_status='verified'.
 *
 * Per T-13-01-08: Portal URLs are short-lived (Stripe-default ~5 min) and
 * bound to the physician's stripe_customer_id. The FastAPI side performs
 * the customer_id lookup keyed off the authenticated physician_id, so a
 * physician cannot request a Portal session for another physician's
 * customer.
 *
 * No audit log on this BFF — the Portal session creation is logged
 * Stripe-side, and any state mutations the physician makes via the Portal
 * (cancel, plan switch) return as webhook events that ARE audited (D-13).
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
  // 1. Method check
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. Session check — httpOnly NextAuth cookie
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // 3. Raw HS256 JWT for FastAPI verification (D-04)
  const tokenRaw = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    raw: true,
  });
  if (!tokenRaw) {
    return res.status(401).json({ error: 'Session token unavailable' });
  }

  // 4. Forward to FastAPI — pass through structured response verbatim (D-07)
  try {
    const upstream = await fetch(`${FASTAPI_URL}/practikah/billing/portal-link`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenRaw}`,
        'Content-Type': 'application/json',
      },
      // Body is empty — FastAPI derives customer_id from authenticated session.
      body: JSON.stringify({}),
    });

    const result = await upstream.json();
    return res.status(upstream.status).json(result);
  } catch (err) {
    console.error('practikah/billing/portal-link: upstream fetch failed', err);
    return res.status(502).json({ error: 'Upstream API unreachable' });
  }
}
