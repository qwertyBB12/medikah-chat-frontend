/**
 * BFF route: GET /api/practikah/runs/[runId]
 *
 * Forwards a provisioning run log request to the FastAPI
 * /practikah/runs/{run_id} endpoint, forwarding the NextAuth HS256 JWT as
 * Authorization: Bearer per Phase 11 D-04.
 *
 * Per D-04: browser never touches FastAPI directly. This BFF reads the httpOnly
 * NextAuth session, mints a fresh HS256 JWS, and forwards it as a Bearer
 * token. FastAPI's verified_physician dependency re-verifies the HS256 signature
 * and asserts verification_status='verified' (D-05, D-06).
 *
 * Per D-07: FastAPI returns a bilingual structured 403 envelope on verification
 * failure. This BFF returns it verbatim — no collapse to { error: '...' }.
 * Phase 12 UI relies on body.detail.code === 'WSPC_NOT_VERIFIED'.
 *
 * No audit log — this is a read-only GET.
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
  // 1. Method check
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

  // 4. Extract dynamic route param
  const { runId } = req.query;
  if (!runId || typeof runId !== 'string') {
    return res.status(400).json({ error: 'runId parameter is required' });
  }

  // 5. Forward to FastAPI — pass through structured response verbatim (D-07)
  try {
    const upstream = await fetch(
      `${FASTAPI_URL}/practikah/runs/${encodeURIComponent(runId)}`,
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
    console.error('Exception in runs/[runId] BFF:', err);
    return res.status(502).json({ error: 'Upstream API unreachable' });
  }
}
