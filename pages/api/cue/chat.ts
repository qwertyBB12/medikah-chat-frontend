/**
 * BFF route: POST /api/cue/chat  (Phase 23 — closes the /cue/chat auth mismatch)
 *
 * CueSurface's text path posts HERE (same-origin) instead of hitting FastAPI
 * directly. This proxy reads the NextAuth session cookie and forwards the raw
 * NextAuth HS256 JWT as Authorization: Bearer — the token type the FastAPI cue
 * gate (utils/auth.authenticated_physician) actually verifies
 * (jwt.decode(token, NEXTAUTH_SECRET, ["HS256"])). Posting the Supabase token
 * (useSupabaseToken) straight to FastAPI 401'd — same family as Fix B. The
 * browser never touches FastAPI directly (Phase 11 D-04); this mirrors the
 * confirm-write / credential BFF proxies added in Plan 23-04.
 *
 * Body shape forwarded verbatim: { messages, locale, opening? }. The upstream /cue/chat is a
 * text/plain StreamingResponse whose body may carry the \x1e pending_confirm
 * sentinel (D-03). CueSurface buffers the body (res.text()) and splits on the
 * sentinel, so this proxy buffers too and returns the body byte-for-byte
 * (sentinel preserved) — no streaming machinery needed for the current UX. If a
 * later plan makes the surface stream-read token-by-token, upgrade this to pipe
 * upstream.body instead of buffering.
 *
 * SECURITY: forwards ONLY the physician bearer token; it never references the
 * Supabase service-role key.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { authOptions } from '../auth/[...nextauth]';
import { applyCueBffCors } from '../../../lib/cue/bffCors';

const FASTAPI_URL =
  process.env.PRACTIKAH_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8000';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  // 0. CORS — the SOGo-injected surface (practikah subdomain) calls this BFF
  //    cross-origin with credentials. Answer the preflight before anything else.
  if (applyCueBffCors(req, res)) return;

  // 1. Method check — /cue/chat is a POST.
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // 2. Session check (browser httpOnly cookie)
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  // 3. Extract the raw NextAuth HS256 JWT for FastAPI verification (D-04)
  const tokenRaw = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    raw: true,
  });
  if (!tokenRaw) {
    res.status(401).json({ error: 'Session token unavailable' });
    return;
  }

  // 4. Forward POST to FastAPI — physician bearer only (never the service-role key)
  try {
    const upstream = await fetch(`${FASTAPI_URL}/cue/chat`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenRaw}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body ?? {}),
    });

    // Upstream is text/plain (with an optional \x1e pending_confirm sentinel).
    // CueSurface buffers + splits, so we buffer + return the body verbatim.
    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(text);
  } catch (err) {
    console.error('Exception in cue/chat BFF:', err);
    res.status(502).json({ error: 'Upstream API unreachable' });
  }
}
