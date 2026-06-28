/**
 * BFF route: POST /api/practikah/wizard/local-part-suggestions
 *
 * Wizard Step 2 — checks Mailcow availability for a list of mailbox local-part candidates.
 * Forwards to FastAPI /practikah/wizard/local-part-suggestions which queries the
 * Mailcow API for each candidate and returns availability flags.
 *
 * Read-only — no audit log. Mirrors workspace-status.ts skeleton.
 *
 * Per T-12-01-06: FastAPI rate-limits this endpoint to 10/minute (12-02 implements).
 *
 * Request body: { title: 'Dr' | 'Dra', candidates: string[] }
 * Response: { suggestions: Array<{ local_part: string; available: boolean; source: 'mailcow_check' | 'reserved' | 'invalid' }> }
 *
 * 405 on wrong method. 401 on missing session / token. 502 on FastAPI unreachable.
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

const VALID_TITLES = ['Dr', 'Dra'];
const LOCAL_PART_PATTERN = /^[a-z0-9._-]+$/;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  // 1. Method check
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. Session check
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // 3. Raw NextAuth JWT for FastAPI (D-04)
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

  // 4. Light validation
  const body = req.body as Record<string, unknown>;
  const title = body?.title;
  const candidates = body?.candidates;

  if (!title || !VALID_TITLES.includes(title as string)) {
    return res
      .status(400)
      .json({ error: `title must be one of: ${VALID_TITLES.join(', ')}` });
  }

  if (!Array.isArray(candidates) || candidates.length === 0) {
    return res.status(400).json({ error: 'candidates must be a non-empty array' });
  }

  // Sanitize candidates — filter out any that don't match the allowed pattern
  const validCandidates = (candidates as unknown[])
    .filter((c): c is string => typeof c === 'string' && LOCAL_PART_PATTERN.test(c) && c.length <= 64);

  if (validCandidates.length === 0) {
    return res.status(400).json({ error: 'No valid candidates provided' });
  }

  // 5. Forward to FastAPI
  try {
    const upstream = await fetch(
      `${FASTAPI_URL}/practikah/wizard/local-part-suggestions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenRaw}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, candidates: validCandidates }),
      },
    );

    const result: unknown = await upstream.json();
    return res.status(upstream.status).json(result);
  } catch (err) {
    console.error('Exception in wizard/local-part-suggestions BFF:', err);
    return res.status(502).json({ error: 'Upstream API unreachable' });
  }
}
