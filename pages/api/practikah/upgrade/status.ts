/**
 * BFF route: GET /api/practikah/upgrade/status?run_id=...
 *
 * Long-lived Server-Sent Events (SSE) passthrough for the doctor's Pro upgrade
 * saga progress UI (Phase 13-07 / D-16, 3-minute live UX). Forwards the
 * authenticated physician's NextAuth HS256 JWT to the FastAPI
 * `/practikah/upgrade/status` StreamingResponse and pipes raw bytes back to
 * the browser EventSource.
 *
 * DEVIATES from the regular request/response BFF pattern:
 *   - `responseLimit: false` — disables Next.js's 4MB cap on response body.
 *   - NO `res.json()` anywhere — we write raw chunks via `res.write(buffer)`.
 *   - Headers reproduced verbatim so Netlify edge / nginx do not buffer
 *     (Cache-Control: no-cache, no-transform; X-Accel-Buffering: no — D-16).
 *
 * Owner-only authorization (T-13-07-01): FastAPI re-validates the run_id
 * against the JWT physician_id BEFORE opening the stream. This BFF does
 * NOT need a redundant ownership check — JWT-forwarding is sufficient.
 *
 * No audit log — read-only stream.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { authOptions } from '../../auth/[...nextauth]';

// Disable Next.js's response size cap — SSE streams are long-lived and may
// exceed the default 4MB ceiling over a 3-minute saga.
export const config = { api: { responseLimit: false } };

const FASTAPI_URL =
  process.env.PRACTIKAH_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8000';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  // 1. Method check — SSE is GET only.
  if (req.method !== 'GET') {
    res.status(405).end();
    return;
  }

  // 2. Session check (browser httpOnly cookie).
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    res.status(401).end();
    return;
  }

  // 3. Extract raw NextAuth HS256 JWT for FastAPI verification (D-04).
  const tokenRaw = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    raw: true,
  });
  if (!tokenRaw) {
    res.status(401).end();
    return;
  }

  // 4. Required query param.
  const runId = String(req.query.run_id || '');
  if (!runId) {
    res.status(400).end();
    return;
  }

  // 5. Open the upstream stream.
  let upstream: Response;
  try {
    upstream = await fetch(
      `${FASTAPI_URL}/practikah/upgrade/status?run_id=${encodeURIComponent(runId)}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${tokenRaw}` },
      },
    );
  } catch (err) {
    console.error('Exception opening SSE upstream:', err);
    res.status(502).end();
    return;
  }

  if (!upstream.ok || !upstream.body) {
    // Forward the upstream status (e.g. 403 owner mismatch, 404 not found).
    res.status(upstream.status).end();
    return;
  }

  // 6. Write SSE headers and start streaming raw bytes.
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const reader = upstream.body.getReader();
  // If the client disconnects mid-stream, abort the upstream read.
  req.on('close', () => {
    try {
      reader.cancel();
    } catch {
      // Best-effort cancel.
    }
  });

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
      // Force-flush each chunk so the EventSource sees events live.
      const flush = (res as unknown as { flush?: () => void }).flush;
      if (typeof flush === 'function') flush.call(res);
    }
  } catch (err) {
    console.error('Exception streaming SSE upstream body:', err);
  } finally {
    res.end();
  }
}
