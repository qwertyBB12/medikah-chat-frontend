/**
 * GET /api/practikah/sso-verify
 *
 * nginx auth_request verify endpoint for practikah.medikah.health SSO handoff.
 * Phase 17, Plan 17-05 (deferred from Phase 16 SC2 AUTH-06).
 *
 * Called exclusively as an nginx internal sub-request (location = /__auth_verify
 * in site.practikah-sso.custom). Never exposed publicly — the nginx location is
 * `internal;` so direct browser access to /__auth_verify is rejected by nginx.
 *
 * Flow:
 *   1. nginx forwards the browser's Cookie header via X-Forwarded-Cookie (D-06).
 *   2. This route parses that header into req.cookies so next-auth's getToken()
 *      can locate __Secure-next-auth.session-token.
 *   3. getToken() verifies the HS256 signature using NEXTAUTH_SECRET.
 *   4. Asserts: role === 'physician' AND verification_status === 'verified'.
 *   5. On pass: 200 + X-Auth-Mailbox + X-Auth-User headers.
 *      On fail: 401 — nginx falls through to SOGo login form (D-08 graceful degradation).
 *
 * Security:
 *   T-17-05-01: Client-supplied x-webobjects-remote-user is irrelevant here; nginx
 *               overwrites it from auth_request_set on 200, or clears it to "" in
 *               @sogo_fallback on 401.
 *   T-17-05-02: /__auth_verify is `internal;` — not externally reachable. This route
 *               trusts only the signed cookie (NEXTAUTH_SECRET HS256), never headers
 *               other than X-Forwarded-Cookie.
 *   T-17-05-03: proxy_cache_key in nginx is per-user ($cookie___Secure_next_auth_session_token)
 *               — cache poisoning between users is prevented at the nginx layer.
 *
 * Cookie note: the .medikah.health session cookie name is __Secure-next-auth.session-token
 * (Phase 16-04). nginx forwards the raw Cookie header via X-Forwarded-Cookie.
 *
 * Do not log cookie values or token contents.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';

/**
 * Parse a raw Cookie header string into a key→value map.
 * Returns an empty object on malformed input.
 */
function parseCookieHeader(cookieHeader: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pair of cookieHeader.split(';')) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx === -1) continue;
    const key = pair.slice(0, eqIdx).trim();
    const val = pair.slice(eqIdx + 1).trim();
    if (key) out[key] = val;
  }
  return out;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  // Only GET — nginx auth_request fires a GET sub-request.
  if (req.method !== 'GET') {
    res.status(405).end();
    return;
  }

  // nginx forwards the browser's Cookie header via X-Forwarded-Cookie (D-06).
  // Reconstruct req.cookies from this header so getToken() can find the session token.
  const forwardedCookie = req.headers['x-forwarded-cookie'];
  if (typeof forwardedCookie === 'string' && forwardedCookie.length > 0) {
    // Overwrite req.cookies with the forwarded values. getToken() reads req.cookies
    // internally; this is the standard workaround for nginx auth_request sub-requests
    // where the browser cookies arrive as a header rather than parsed cookies.
    (req as NextApiRequest & { cookies: Record<string, string> }).cookies =
      parseCookieHeader(forwardedCookie);
  }
  // If no X-Forwarded-Cookie header is present, req.cookies stays as-is (empty for
  // sub-requests). getToken() will return null → 401 path below.

  let token: Awaited<ReturnType<typeof getToken>>;
  try {
    token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });
  } catch {
    // Token parse failure — treat as unauthenticated (D-08)
    res.status(401).end();
    return;
  }

  // Validate physician role + verification gate
  if (
    !token ||
    token.role !== 'physician' ||
    token.verification_status !== 'verified'
  ) {
    // D-08: nginx @sogo_fallback intercepts 401 and shows SOGo login form.
    // No body — auth_request only inspects the status code.
    res.status(401).end();
    return;
  }

  // Verified physician: return mailbox so nginx can set x-webobjects-remote-user.
  // X-Auth-Mailbox is captured by auth_request_set in site.practikah-sso.custom.
  res.setHeader('X-Auth-Mailbox', (token.mailbox_email as string) ?? '');
  res.setHeader('X-Auth-User', (token.physician_id as string) ?? '');

  // No body — auth_request only needs the status + headers.
  res.status(200).end();
}
