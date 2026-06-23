/**
 * BFF route: DELETE /api/cue/credential  (Phase 23 Plan 23-04 — HANDS-09)
 *
 * Forwards the authenticated physician's "Disconnect Cue" request to the FastAPI
 * DELETE /cue/credential endpoint, forwarding the NextAuth HS256 JWT as
 * Authorization: Bearer (Phase 11 D-04 — the browser never touches FastAPI
 * directly). FastAPI revokes ONLY the Cue app-passwd (never the doctor's login)
 * and is NOT fail-closed on the kill-switch, so this succeeds even during an
 * incident.
 *
 * SECURITY: this proxy forwards ONLY the physician bearer token. It never
 * references the Supabase service-role key (T-23-04-07 — a grep gate asserts no
 * such reference exists in this file).
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { authOptions } from '../auth/[...nextauth]';

const FASTAPI_URL =
  process.env.PRACTIKAH_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8000';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  // 1. Method check — Disconnect Cue is a single DELETE.
  if (req.method !== 'DELETE') {
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

  // 4. Forward DELETE to FastAPI — physician bearer only (never the service-role key)
  try {
    const upstream = await fetch(`${FASTAPI_URL}/cue/credential`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${tokenRaw}`,
        'Content-Type': 'application/json',
      },
    });

    const body: unknown = await upstream.json().catch(() => ({}));
    return res.status(upstream.status).json(body);
  } catch (err) {
    console.error('Exception in cue/credential BFF:', err);
    return res.status(502).json({ error: 'Upstream API unreachable' });
  }
}
