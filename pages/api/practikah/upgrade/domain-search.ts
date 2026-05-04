/**
 * BFF route: POST /api/practikah/upgrade/domain-search
 *
 * Returns the locked Pro-tier pricing matrix per (tld_class, country) so the
 * Plan 13-04 DomainSearch component can render the PRO-02 transparency
 * breakdown — wholesale TLD price (from CF Registrar Availability API) +
 * Práctikah service fee — without hardcoding the pricing matrix client-side.
 *
 * The actual suggestion generation runs client-side in
 * `lib/domainSuggestions.ts` (D-19 deterministic rules — NO LLM at search
 * time). This BFF only exposes pricing for the UI to display.
 *
 * Forwards the NextAuth HS256 JWT to FastAPI per Phase 11 D-04.
 *
 * Request body shape (validated client-side; backend re-validates):
 *   { country: 'MX' | 'US' }
 *
 * Response shape (mirrors FastAPI /practikah/upgrade/domain-search):
 *   {
 *     pricing: {
 *       standard: { annual: number; monthly: number; monthly_setup: number; currency: string };
 *       premium:  { annual: number; monthly: number; monthly_setup: number; currency: string };
 *     };
 *     country: 'MX' | 'US';
 *   }
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
    const upstream = await fetch(
      `${FASTAPI_URL}/practikah/upgrade/domain-search`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenRaw}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req.body ?? {}),
      },
    );

    const body: unknown = await upstream.json();
    return res.status(upstream.status).json(body);
  } catch (err) {
    console.error('Exception in upgrade/domain-search BFF:', err);
    return res.status(502).json({ error: 'Upstream API unreachable' });
  }
}
