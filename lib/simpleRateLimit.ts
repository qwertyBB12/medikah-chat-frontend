// In-process IP rate limiter for public unauthenticated endpoints that send
// email (waitlist, cdmx-rsvp) — they share the Resend daily quota, so bot
// bursts must be cut off cheaply. Same in-process Map approach as
// pages/api/auth/activate/send-link.ts: per-instance burst protection is the
// goal; Netlify reuses warm instances, and a distributed attacker is bounded
// by the per-email unique constraint anyway.

import type { NextApiRequest } from 'next';

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

export function checkRateLimit(
  scope: string,
  key: string,
  max: number,
  windowMs: number
): boolean {
  let store = stores.get(scope);
  if (!store) {
    store = new Map();
    stores.set(scope, store);
  }
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now - entry.windowStart > windowMs) {
    // Opportunistic sweep so the map cannot grow unbounded in a long-lived instance
    if (store.size > 5000) {
      store.forEach((v, k) => {
        if (now - v.windowStart > windowMs) store.delete(k);
      });
    }
    store.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count += 1;
  return true;
}

// Source IP extraction (Phase 16-03 pattern from mailcowImapProvider.ts)
export function extractSourceIp(req: NextApiRequest): string {
  const nfIp = req.headers['x-nf-client-connection-ip'];
  const fromNetlify =
    typeof nfIp === 'string' ? nfIp : Array.isArray(nfIp) ? nfIp[0] : undefined;
  if (fromNetlify) return fromNetlify;

  const forwarded = req.headers['x-forwarded-for'];
  const fromForwarded =
    typeof forwarded === 'string'
      ? forwarded.split(',')[0]?.trim()
      : Array.isArray(forwarded)
        ? forwarded[0]
        : undefined;
  if (fromForwarded) return fromForwarded;

  return req.socket?.remoteAddress ?? 'unknown';
}
