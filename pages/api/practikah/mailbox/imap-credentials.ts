/**
 * BFF route: GET /api/practikah/mailbox/imap-credentials
 *
 * Forwards the authenticated physician's IMAP/SMTP credential request to the
 * FastAPI /practikah/mailbox/imap-credentials endpoint.
 *
 * Returns deterministic JSON: host/ports/username for IMAP and SMTP connections.
 * Password is NEVER included — doctors set/rotate via /api/practikah/mailbox/change-password.
 *
 * Per D-07: FastAPI returns a bilingual structured 403 envelope on verification failure.
 * This BFF returns it verbatim. No audit log — read-only, non-sensitive public-shape config.
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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. Session check (browser httpOnly cookie)
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // 3. Extract raw NextAuth HS256 JWT for FastAPI verification (D-04)
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
    const upstream = await fetch(
      `${FASTAPI_URL}/practikah/mailbox/imap-credentials`,
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
    console.error('[imap-credentials BFF] Exception:', err instanceof Error ? err.message : String(err));
    return res.status(502).json({ error: 'Upstream API unreachable' });
  }
}
