/**
 * BFF route: POST /api/cue/appointments/confirm-write  (appointments vertical)
 *
 * Forwards the authenticated physician's appointment confirm-write
 * (create/move/cancel) to the FastAPI POST /cue/appointments/confirm-write
 * endpoint — the ONLY appointment mutation path. The model tools that produced
 * the confirm card are pure proposers; this route is reached only when the
 * doctor clicks Confirm in CueSurface.
 *
 * Identical idiom to the calendar sibling (pages/api/cue/calendar/confirm-write.ts):
 * same session check, same minted HS256 bearer, same error mapping. Only the
 * upstream path differs. physician_id and confirmed-ness are derived by FastAPI
 * from auth + the route call; they are NEVER trusted from the forwarded body.
 * The backend is idempotent on (physician_id, idempotency_token), so a
 * double-clicked Confirm cannot book the same patient twice.
 *
 * SECURITY: this proxy forwards ONLY the physician bearer token. It never
 * references the Supabase service-role key (same gate as the calendar sibling).
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { authOptions } from '../../auth/[...nextauth]';
import { applyCueBffCors } from '../../../../lib/cue/bffCors';
import { mintCueBackendToken } from '../../../../lib/cue/backendToken';

const FASTAPI_URL =
  process.env.PRACTIKAH_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8000';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  // 0. CORS — the SOGo-injected surface (practikah subdomain) confirms writes
  //    cross-origin with credentials. Answer the preflight first.
  if (applyCueBffCors(req, res)) return;

  // 1. Method check — confirm-write is a POST.
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. Session check (browser httpOnly cookie)
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // 3. Mint a fresh HS256 JWS from the decrypted session claims (D-04). NextAuth
  //    v4 issues an ENCRYPTED JWE; forwarding it raw 401s the FastAPI HS256 gate.
  //    See lib/cue/backendToken.ts and the calendar sibling's note.
  const sessionToken = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!sessionToken?.userId || !sessionToken?.role) {
    return res.status(401).json({ error: 'Session token unavailable' });
  }
  let tokenRaw: string;
  try {
    tokenRaw = await mintCueBackendToken({
      userId: String(sessionToken.userId),
      role: String(sessionToken.role),
      email: session.user.email,
      physicianId: sessionToken.physician_id ? String(sessionToken.physician_id) : undefined,
    });
  } catch {
    return res.status(503).json({ error: 'Auth not configured' });
  }

  // 4. Forward POST to FastAPI — physician bearer only (never the service-role key).
  //    The body { action, appointment_id?, patient_name?, start_iso?, end_iso?,
  //    idempotency_token, locale? } is passed through; FastAPI validates it and
  //    ignores any identity in it (CUE-11).
  try {
    const upstream = await fetch(`${FASTAPI_URL}/cue/appointments/confirm-write`, {
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
    console.error('Exception in cue/appointments/confirm-write BFF:', err);
    return res.status(502).json({ error: 'Upstream API unreachable' });
  }
}
