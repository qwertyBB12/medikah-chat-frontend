/**
 * Unified cross-surface sign-out (Phase 21).
 *
 * Single endpoint that BOTH the SOGo masthead power button (via the
 * window.mc_logout hook in custom-sogo.js) and the React rail Power navigate
 * to, top-level. It:
 *   1. reads the session (for the audit row) BEFORE clearing anything,
 *   2. expires the parent-domain NextAuth cookies with byte-exact attributes
 *      (otherwise the browser expires a *different* cookie and the real session
 *      survives — silent logout failure),
 *   3. emits Clear-Site-Data + no-store so cached/bfcache PHI can't be revealed
 *      on a shared device,
 *   4. hands off to the nginx /practikah-logout route which kills the SOGo
 *      server-side session + cookie and lands the user on /chat.
 *
 * Hardened per the 2026-06-20 security panel (ship-now scope). KNOWN RESIDUAL:
 * the NextAuth session is a stateless JWT — clearing the cookie does not revoke
 * a *copied* token before its exp (≤1h). The authoritative fix (server-side
 * revocation epoch checked in sso-verify) is the next task; see 21-CONTEXT.md.
 *
 * Open-redirect guard: the redirect target is a module constant and is NEVER
 * read from req.query (no callbackUrl).
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import { logEvent } from '../../../lib/workspaceAuditService';

// Constant. Do NOT make this user-controllable (no req.query.callbackUrl).
const SOGO_LOGOUT = 'https://practikah.medikah.health/practikah-logout';

// Byte-exact mirrors of the set attributes (pages/api/auth/[...nextauth].ts
// cookies config). Domain + Secure + Path must match or the expiry no-ops.
const EXPIRE = 'Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
const CLEAR_COOKIES = [
  `__Secure-next-auth.session-token=; Domain=.medikah.health; Path=/; Secure; HttpOnly; SameSite=Lax; ${EXPIRE}`,
  `__Secure-next-auth.callback-url=; Domain=.medikah.health; Path=/; Secure; HttpOnly; SameSite=Lax; ${EXPIRE}`,
  // __Host- prefix forbids Domain; host-only on medikah.health.
  `__Host-next-auth.csrf-token=; Path=/; Secure; HttpOnly; SameSite=Lax; ${EXPIRE}`,
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // GET only — both callers navigate here top-level (anchor / location.replace).
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).end('Method Not Allowed');
    return;
  }

  // Audit the sign-out BEFORE the cookie is cleared (best-effort, never blocks).
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const physicianId = (token?.physician_id as string | undefined) ?? undefined;
    if (physicianId) {
      const xff = req.headers['x-forwarded-for'];
      const ipAddress =
        (Array.isArray(xff) ? xff[0] : xff)?.split(',')[0]?.trim() ||
        req.socket?.remoteAddress ||
        undefined;
      const ua = req.headers['user-agent'];
      void logEvent({
        physicianId,
        actorRole: 'physician',
        action: 'workspace.logout',
        ipAddress,
        userAgent: Array.isArray(ua) ? ua[0] : ua,
      });
    }
  } catch {
    // Never let audit failure block sign-out.
  }

  res.setHeader('Set-Cookie', CLEAR_COOKIES);
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Vary', 'Cookie');
  res.setHeader('Referrer-Policy', 'no-referrer');
  // Honored by Chromium/Firefox; Safari ignores it (bfcache there is covered by
  // no-store on the authenticated pages + the nginx /SOGo/ no-store).
  res.setHeader('Clear-Site-Data', '"cache", "cookies", "storage"');
  res.writeHead(302, { Location: SOGO_LOGOUT });
  res.end();
}
