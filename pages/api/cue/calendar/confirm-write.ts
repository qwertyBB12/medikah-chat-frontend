/**
 * BFF route: POST /api/cue/calendar/confirm-write  (Phase 23 Plan 23-04 — D-03)
 *
 * Forwards the authenticated physician's confirm-write (block/clear) request to
 * the FastAPI POST /cue/calendar/confirm-write endpoint — the ONLY calendar
 * mutation path. The model loop never writes; this route is reached only when
 * the doctor clicks Confirm in CueSurface.
 *
 * Forwards the NextAuth HS256 JWT as Authorization: Bearer (Phase 11 D-04 — the
 * browser never touches FastAPI directly). physician_id and confirmed-ness are
 * derived by FastAPI from auth + the route call; they are NEVER trusted from the
 * forwarded body. The backend is idempotent on (physician_id, idempotency_token).
 *
 * SECURITY: this proxy forwards ONLY the physician bearer token. It never
 * references the Supabase service-role key (T-23-04-07 — a grep gate asserts no
 * such reference exists in this file).
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
  // 1. Method check — confirm-write is a POST.
  if (req.method !== 'POST') {
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

  // 4. Forward POST to FastAPI — physician bearer only (never the service-role key).
  //    The body { action, start_iso, end_iso, title?, idempotency_token, locale? }
  //    is passed through; FastAPI ignores any identity in it (CUE-11).
  try {
    const upstream = await fetch(`${FASTAPI_URL}/cue/calendar/confirm-write`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenRaw}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body ?? {}),
    });

    const body: unknown = await upstream.json().catch(() => ({}));
    return res.status(upstream.status).json(body);
  } catch (err) {
    console.error('Exception in cue/calendar/confirm-write BFF:', err);
    return res.status(502).json({ error: 'Upstream API unreachable' });
  }
}
