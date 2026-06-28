/**
 * BFF route: GET /api/practikah/theme
 *
 * Retrieves the physician's Práctikah website theme from FastAPI
 * /practikah/theme. Returns DEFAULT_THEME if the FastAPI endpoint 404s
 * (theme row not yet created — doctor hasn't claimed Try Pro).
 *
 * Authentication: NextAuth session + minted HS256 JWS forwarded as Bearer (D-04/D-05).
 * No audit log — this is a read-only GET.
 *
 * 12-05 will add the PUT /api/practikah/theme/update BFF route (theme editor save).
 *
 * Error handling:
 *  - 404 from FastAPI → 200 + DEFAULT_THEME with _default:true flag (editor renders defaults)
 *  - 401/403 from FastAPI → forwarded verbatim (WSPC_NOT_VERIFIED bilingual envelope, D-07)
 *  - Other non-2xx → forwarded verbatim
 *  - Network error → 502 Upstream unreachable
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { authOptions } from '../../auth/[...nextauth]';
import { mintBackendToken } from '../../../../lib/auth/backendToken';
import { DEFAULT_THEME } from '../../../../lib/practikahTheme';

const FASTAPI_URL =
  process.env.PRACTIKAH_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8000';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  // 1. Method guard
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. Session check (browser httpOnly cookie)
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

  // 4. Forward to FastAPI
  try {
    const upstream = await fetch(`${FASTAPI_URL}/practikah/theme`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenRaw}`,
        'Content-Type': 'application/json',
      },
    });

    // 404 → Try Pro not yet claimed; return default so editor can render
    if (upstream.status === 404) {
      return res.status(200).json({
        ...DEFAULT_THEME,
        physician_id: null,
        updated_at: null,
        _default: true,
      });
    }

    // All other responses — forward verbatim (preserves D-07 bilingual 403 envelope)
    const body: unknown = await upstream.json();
    return res.status(upstream.status).json(body);
  } catch (err) {
    console.error('Exception in theme/get BFF:', err);
    return res.status(502).json({ error: 'Upstream API unreachable' });
  }
}
