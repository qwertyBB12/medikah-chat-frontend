/**
 * lib/cue/backendToken.ts — mint the HS256 JWS the FastAPI cue gate verifies.
 *
 * ROOT CAUSE this fixes (2026-06-23, prod): the Cue BFFs forwarded the RAW
 * NextAuth session token (`getToken({ raw: true })`). NextAuth v4 with the
 * default config (no custom `jwt.encode/decode`) issues an ENCRYPTED JWE, not
 * an HS256-signed JWS. The backend does `jwt.decode(token, NEXTAUTH_SECRET,
 * algorithms=["HS256"])` (utils/auth.py) — PyJWT HS256-verifying a JWE ALWAYS
 * throws InvalidTokenError → 401 `{"detail":"Invalid token"}`, regardless of
 * whether the secret matches. So the BFF→FastAPI handshake never worked.
 *
 * Fix (the planned "Fix B" pattern): the BFF already holds the DECRYPTED
 * session (NextAuth decrypts the JWE for us via getServerSession/getToken), so
 * we mint a fresh, short-lived HS256 JWS carrying exactly the claims the gate
 * needs — `{ userId, role, email }` (utils/auth.py §5) — signed with the SHARED
 * NEXTAUTH_SECRET, and forward THAT. The backend's existing HS256 verification
 * is correct for a JWS; only the token TYPE the BFF sent was wrong.
 *
 * REQUIRES the SAME NEXTAUTH_SECRET on Netlify (signs) and Render (verifies).
 *
 * Pure (claims in → JWS out); the BFF gathers the session/token. Signed with
 * jose (already a NextAuth dep), HS256, 5-minute expiry — ample for a single
 * BFF→FastAPI round-trip, short enough to limit replay.
 */

import { SignJWT } from 'jose';

export interface CueBackendClaims {
  userId: string;
  role: string;
  email: string;
  /**
   * Canonical physician id (the `physician_id` session claim — same key Fix A
   * uses). When present, the backend cue gate resolves the physician by
   * `physicians.id == physician_id` instead of `auth_user_id == userId`
   * (the latter can be unlinked → 403 "No physician profile linked").
   */
  physicianId?: string;
}

/**
 * Mint a short-lived HS256 JWS the FastAPI cue gate (utils/auth.py) verifies.
 * Throws if NEXTAUTH_SECRET is unset (the caller maps that to a 503).
 */
export async function mintCueBackendToken(claims: CueBackendClaims): Promise<string> {
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
    .setExpirationTime('5m')
    .sign(key);
}
