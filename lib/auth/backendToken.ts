/**
 * lib/auth/backendToken.ts — mint the HS256 JWS that the FastAPI physician gate
 * (`medikah-chat-api/utils/auth.py` → `_decode_and_lookup`) verifies.
 *
 * ROOT CAUSE this fixes (2026-06-27, prod): every authenticated physician →
 * FastAPI call routed through a Next.js BFF was forwarding the RAW NextAuth
 * session token (`getToken({ raw: true })`). NextAuth v4 with the default config
 * (no custom `jwt.encode/decode`) issues an ENCRYPTED JWE, not an HS256-signed
 * JWS. The backend does `jwt.decode(token, NEXTAUTH_SECRET, algorithms=["HS256"])`
 * — PyJWT HS256-verifying a JWE ALWAYS throws InvalidTokenError → 401
 * `{"detail":"Invalid token"}`, REGARDLESS of whether the secret matches. So the
 * whole `/practikah/*` workspace surface (and the dashboard) 401'd on every call.
 *
 * Fix: the BFF already holds the DECRYPTED session (NextAuth decrypts the JWE for
 * us via getToken/getServerSession), so we mint a fresh, short-lived HS256 JWS
 * carrying exactly the claims the gate needs — `{ userId, role, email,
 * physician_id? }` (utils/auth.py §5/§8) — signed with the SHARED NEXTAUTH_SECRET,
 * and forward THAT. The backend's existing HS256 verification is correct for a
 * JWS; only the token TYPE the BFF sent was wrong.
 *
 * This is the generalization of the earlier `lib/cue/backendToken.ts` fix (which
 * resolved the same bug for the Cue BFFs on 2026-06-23) to the rest of the
 * physician surface.
 *
 * REQUIRES the SAME NEXTAUTH_SECRET on Netlify (signs) and Render (verifies).
 *
 * Pure (claims in → JWS out); the caller gathers the session/token. Signed with
 * jose (already a NextAuth dep), HS256.
 */

import { SignJWT } from 'jose';

export interface BackendTokenClaims {
  userId: string;
  role: string;
  email: string;
  /**
   * Canonical physician id (the `physician_id` session claim — same key Fix A
   * uses). When present, the backend resolves the physician by
   * `physicians.id == physician_id` instead of `auth_user_id == userId` (the
   * latter can be unlinked → 403 "No physician profile linked").
   */
  physicianId?: string;
}

/**
 * Mint a short-lived HS256 JWS the FastAPI physician gate verifies.
 *
 * @param claims    The decrypted session claims to embed.
 * @param expiresIn jose duration string. Defaults to '5m' — ample for a single
 *                  BFF → FastAPI round-trip, short enough to limit replay. Pass a
 *                  longer window ('1h') for browser-held tokens that authenticate
 *                  many direct calls over the life of a page.
 * @throws if NEXTAUTH_SECRET is unset (the caller maps that to a 503/401).
 */
export async function mintBackendToken(
  claims: BackendTokenClaims,
  expiresIn: string = '5m',
): Promise<string> {
  const secretStr = process.env.NEXTAUTH_SECRET;
  if (!secretStr) {
    throw new Error('NEXTAUTH_SECRET is not configured');
  }
  const key = new TextEncoder().encode(secretStr);
  return new SignJWT({
    userId: claims.userId,
    role: claims.role,
    email: claims.email,
    ...(claims.physicianId ? { physician_id: claims.physicianId } : {}),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(key);
}
