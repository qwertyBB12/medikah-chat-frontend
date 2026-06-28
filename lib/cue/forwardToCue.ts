/**
 * lib/cue/forwardToCue.ts
 * -----------------------
 * Shared BFF forwarder for the Cue memory endpoints. Mints an HS256 JWS from the
 * decrypted NextAuth session (the FastAPI gate rejects the raw JWE) and forwards
 * to FastAPI as Authorization: Bearer — the browser never touches FastAPI and the
 * service-role key is never referenced here (same contract as cue/chat, cue/credential).
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { authOptions } from '../../pages/api/auth/[...nextauth]';
import { mintCueBackendToken } from './backendToken';

const FASTAPI_URL =
  process.env.PRACTIKAH_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8000';

export async function forwardToCue(
  req: NextApiRequest,
  res: NextApiResponse,
  opts: { method: string; path: string; forwardBody?: boolean },
): Promise<void> {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const sessionToken = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!sessionToken?.userId || !sessionToken?.role) {
    res.status(401).json({ error: 'Session token unavailable' });
    return;
  }

  let token: string;
  try {
    token = await mintCueBackendToken({
      userId: String(sessionToken.userId),
      role: String(sessionToken.role),
      email: session.user.email,
      physicianId: sessionToken.physician_id ? String(sessionToken.physician_id) : undefined,
    });
  } catch {
    res.status(503).json({ error: 'Auth not configured' });
    return;
  }

  try {
    const upstream = await fetch(`${FASTAPI_URL}${opts.path}`, {
      method: opts.method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(opts.forwardBody && req.body ? { body: JSON.stringify(req.body) } : {}),
    });
    const body: unknown = await upstream.json().catch(() => ({}));
    res.status(upstream.status).json(body);
  } catch (err) {
    console.error(`Exception in cue memory BFF (${opts.method} ${opts.path}):`, err);
    res.status(502).json({ error: 'Upstream API unreachable' });
  }
}
