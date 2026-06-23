/**
 * BFF route: POST /api/cue/tts  (Phase 23 Plan 06 — VOICE-02/04 TTS)
 *
 * CueSurface posts { text, locale } HERE (same-origin); this proxy reads the
 * NextAuth session cookie and forwards the raw NextAuth HS256 JWT as
 * Authorization: Bearer to `${NEXT_PUBLIC_API_URL}/cue/tts` — the token type the
 * FastAPI cue gate verifies. A direct browser → FastAPI call with the Supabase
 * token would 401 (same family as the /cue/chat fix). The absolute backend
 * target lives HERE, server-side. Mirrors /api/cue/chat + /api/cue/transcribe.
 *
 * Upstream returns an audio StreamingResponse (audio/mpeg for the Voxtral cloud
 * default). We buffer it and return the bytes verbatim with the upstream
 * Content-Type so the browser can play it via an <audio>/Audio element.
 *
 * SECURITY: forwards ONLY the physician bearer token; never the service-role key.
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
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const tokenRaw = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    raw: true,
  });
  if (!tokenRaw) {
    res.status(401).json({ error: 'Session token unavailable' });
    return;
  }

  try {
    const upstream = await fetch(`${FASTAPI_URL}/cue/tts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenRaw}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body ?? {}),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      res.status(upstream.status);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.send(errText || JSON.stringify({ error: 'TTS failed' }));
      return;
    }

    const contentType = upstream.headers.get('content-type') || 'audio/mpeg';
    const audio = Buffer.from(await upstream.arrayBuffer());
    res.status(200);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'no-cache');
    res.send(audio);
  } catch (err) {
    console.error('Exception in cue/tts BFF:', err);
    res.status(502).json({ error: 'Upstream API unreachable' });
  }
}
