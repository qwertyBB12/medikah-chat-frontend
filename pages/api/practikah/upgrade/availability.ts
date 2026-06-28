/**
 * BFF route: GET /api/practikah/upgrade/availability?domain=foo.com
 *
 * Forwards a Pro-upsell domain availability check to the FastAPI
 * /practikah/upgrade/availability endpoint, forwarding the NextAuth HS256 JWT
 * as Authorization: Bearer per Phase 11 D-04.
 *
 * Consumed by the Plan 13-04 DomainSearch component — debounced 300ms while
 * the doctor types (D-20). FastAPI applies CF Registrar primary + RDAP
 * fallback (Plan 13-02) and a 30/min per-physician rate limit (T-13-04-03).
 *
 * Per T-13-04-01: this endpoint is auth-gated to verified physicians so it
 * cannot be used as an anonymous domain-enumeration scraper.
 *
 * No audit log — this is a read-only check with no side effects.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { authOptions } from '../../auth/[...nextauth]';

import { mintBackendToken } from '../../../../lib/auth/backendToken';
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

  const domainRaw = req.query.domain;
  const domain = Array.isArray(domainRaw) ? domainRaw[0] : domainRaw;
  if (!domain || typeof domain !== 'string' || domain.length > 253) {
    return res.status(400).json({ error: 'Invalid domain' });
  }

  try {
    const upstream = await fetch(
      `${FASTAPI_URL}/practikah/upgrade/availability?domain=${encodeURIComponent(domain)}`,
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
    console.error('Exception in upgrade/availability BFF:', err);
    return res.status(502).json({ error: 'Upstream API unreachable' });
  }
}
