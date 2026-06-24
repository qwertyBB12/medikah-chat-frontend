/**
 * BFF route: POST /api/cue/transcribe  (Phase 23 Plan 06 — VOICE-08 STT)
 *
 * CueSurface's mic path posts the recorded audio blob HERE (same-origin), NOT
 * directly to FastAPI. This proxy reads the NextAuth session cookie and forwards
 * the raw NextAuth HS256 JWT as Authorization: Bearer — the token type the
 * FastAPI cue gate (utils/auth.authenticated_physician) actually verifies. A
 * direct browser → `${NEXT_PUBLIC_API_URL}/cue/transcribe` call with the Supabase
 * token would 401 in prod (the same bug the /cue/chat BFF fixed). The absolute
 * backend target lives HERE, server-side, where it belongs — mirroring
 * /api/cue/chat + the confirm-write / credential BFFs.
 *
 * The request body is the RAW audio bytes (WAV/WebM/mp3); bodyParser is disabled
 * so the binary blob is forwarded untouched. The optional `X-Locale` header hints
 * the language; otherwise the backend auto-detects EN/ES (language=None).
 *
 * SECURITY: forwards ONLY the physician bearer token; never the service-role key.
 * The transcript is returned to the client and never persisted here (T-23-05-02).
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { authOptions } from '../auth/[...nextauth]';
import { applyCueBffCors } from '../../../lib/cue/bffCors';
import { mintCueBackendToken } from '../../../lib/cue/backendToken';

const FASTAPI_URL =
  process.env.PRACTIKAH_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8000';

const MAX_AUDIO_BYTES = 5 * 1024 * 1024; // mirror the backend cap

// Disable Next's body parser — the audio blob is raw binary, forwarded verbatim.
export const config = { api: { bodyParser: false } };

function readRawBody(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    req.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > MAX_AUDIO_BYTES) {
        reject(new Error('payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  if (applyCueBffCors(req, res)) return; // CORS preflight (cross-origin SOGo)
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  // Mint a fresh HS256 JWS the FastAPI cue gate verifies (utils/auth.py) — the
  // raw NextAuth token is an encrypted JWE that PyJWT's HS256 decode rejects.
  // See lib/cue/backendToken.ts.
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!token?.userId || !token?.role) {
    res.status(401).json({ error: 'Session token unavailable' });
    return;
  }
  let backendToken: string;
  try {
    backendToken = await mintCueBackendToken({
      userId: String(token.userId),
      role: String(token.role),
      email: session.user.email,
      physicianId: token.physician_id ? String(token.physician_id) : undefined,
    });
  } catch {
    res.status(503).json({ error: 'Auth not configured' });
    return;
  }

  let audio: Buffer;
  try {
    audio = await readRawBody(req);
  } catch {
    res.status(413).json({ error: 'Audio too large (max 5MB)' });
    return;
  }
  if (audio.length === 0) {
    res.status(400).json({ error: 'Empty audio' });
    return;
  }

  try {
    const upstream = await fetch(`${FASTAPI_URL}/cue/transcribe`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${backendToken}`,
        'Content-Type': req.headers['content-type'] || 'audio/webm',
        ...(req.headers['x-locale']
          ? { 'X-Locale': String(req.headers['x-locale']) }
          : {}),
      },
      // Buffer → BodyInit: wrap as a fresh Uint8Array (ArrayBufferView) so the
      // fetch typing accepts it (known Buffer→BodyInit compile blocker here).
      body: new Uint8Array(audio),
    });

    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.send(text);
  } catch (err) {
    console.error('Exception in cue/transcribe BFF:', err);
    res.status(502).json({ error: 'Upstream API unreachable' });
  }
}
