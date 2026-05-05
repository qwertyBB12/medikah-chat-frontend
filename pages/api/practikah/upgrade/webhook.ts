/**
 * BFF route: POST /api/practikah/upgrade/webhook (Phase 13-01)
 *
 * Stripe webhook entry point on the Netlify-hosted Next.js side.
 * Forwards the EXACT raw body bytes to the FastAPI /practikah/stripe/webhook
 * endpoint, which performs signature verification and idempotent dispatch
 * (per Phase 13-01 D-13 / T-13-01-01..07).
 *
 * CRITICAL: bodyParser MUST be disabled. Stripe's signature is an HMAC over
 * the exact raw bytes of the payload. Any JSON parse + re-stringify (which
 * Next.js does by default) re-serializes the body and breaks the HMAC,
 * causing FastAPI to reject the request with 400. See T-13-01-02.
 *
 * No NextAuth session — Stripe is the caller, not a logged-in user.
 * The Stripe-Signature header is the sole authentication mechanism.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

// Disable Next.js automatic body parsing — preserves raw bytes for Stripe HMAC.
// (T-13-01-02 — security gate. Do NOT remove.)
export const config = {
  api: {
    bodyParser: false,
  },
};

const FASTAPI_URL =
  process.env.PRACTIKAH_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8000';

async function readRawBody(req: NextApiRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : (chunk as Buffer));
  }
  return Buffer.concat(chunks);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  if (!sig || typeof sig !== 'string') {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  let rawBody: Buffer;
  try {
    rawBody = await readRawBody(req);
  } catch (err) {
    console.error('practikah/upgrade/webhook: failed to read raw body', err);
    return res.status(400).json({ error: 'Unable to read request body' });
  }

  try {
    const upstream = await fetch(`${FASTAPI_URL}/practikah/stripe/webhook`, {
      method: 'POST',
      headers: {
        // Forward the verbatim signature so FastAPI can re-verify HMAC over rawBody.
        'stripe-signature': sig,
        // application/json is what Stripe sends; preserve it for FastAPI's request.body() read.
        'Content-Type': req.headers['content-type'] || 'application/json',
      },
      body: new Uint8Array(rawBody.buffer, rawBody.byteOffset, rawBody.byteLength),
    });

    const text = await upstream.text();
    res.status(upstream.status);
    // Pass through Content-Type so JSON-formatted responses parse cleanly in tools/CLI.
    const upstreamCT = upstream.headers.get('content-type');
    if (upstreamCT) res.setHeader('Content-Type', upstreamCT);
    return res.send(text);
  } catch (err) {
    console.error('practikah/upgrade/webhook: upstream fetch failed', err);
    // Return 500 so Stripe retries — better than swallowing an unprocessed event.
    return res.status(500).json({ error: 'Upstream API unreachable' });
  }
}
