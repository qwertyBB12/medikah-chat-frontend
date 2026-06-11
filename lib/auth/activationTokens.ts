/**
 * Phase 17 — Workspace Activation Token Utility
 *
 * Provides signed single-use magic-link tokens for the physician workspace
 * activation flow (AUTH-02, FLOW-03).
 *
 * Security contract (T-17-01-01 / T-17-01-03):
 *   - Tokens are HS256 JWTs signed with NEXTAUTH_SECRET.
 *   - `type` claim must equal 'workspace_activation' — any other value returns null.
 *   - Expiry is 30 minutes; expired tokens return null.
 *   - hashToken produces a SHA-256 hex digest for DB storage; the raw token
 *     is NEVER stored.
 *   - No console.* calls in this file — tokens and secrets must not reach logs.
 */

import { SignJWT, jwtVerify } from 'jose';
import crypto from 'crypto';

// Use Buffer.from with encoding rather than TextEncoder to ensure the secret
// is always a proper Node.js Uint8Array — TextEncoder in jsdom environments
// can produce a subclass that jose's Uint8Array instanceof check rejects.
function secretKey(): Uint8Array {
  return Buffer.from(process.env.NEXTAUTH_SECRET!, 'utf8');
}

// ---------------------------------------------------------------------------
// Token payload shape
// ---------------------------------------------------------------------------

export interface ActivationTokenPayload {
  physician_id: string;
  email: string;
  jti: string;
}

// ---------------------------------------------------------------------------
// signActivationToken
// ---------------------------------------------------------------------------

/**
 * Sign a 30-minute single-use activation token.
 *
 * @param payload - physician_id, email, and a caller-supplied jti (UUID).
 * @returns Signed JWT string.
 */
export async function signActivationToken(payload: ActivationTokenPayload): Promise<string> {
  const secret = secretKey();
  return new SignJWT({ ...payload, type: 'workspace_activation' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30m')
    .setJti(payload.jti)
    .sign(secret);
}

// ---------------------------------------------------------------------------
// verifyActivationToken
// ---------------------------------------------------------------------------

/**
 * Verify and decode an activation token.
 *
 * Returns null when:
 *   - Signature verification fails
 *   - Token is expired
 *   - `type` claim is not 'workspace_activation'
 *
 * Never throws; all errors are caught and return null.
 */
export async function verifyActivationToken(
  token: string,
): Promise<ActivationTokenPayload | null> {
  try {
    const secret = secretKey();
    const { payload } = await jwtVerify(token, secret);
    if (payload.type !== 'workspace_activation') return null;
    const { physician_id, email, jti } = payload as Record<string, unknown>;
    if (typeof physician_id !== 'string' || typeof email !== 'string' || typeof jti !== 'string') {
      return null;
    }
    return { physician_id, email, jti };
  } catch {
    // Catches ExpiredJWTError, JWSInvalidSignature, etc. — all return null.
    return null;
  }
}

// ---------------------------------------------------------------------------
// hashToken
// ---------------------------------------------------------------------------

/**
 * Produce a SHA-256 hex digest of a raw token string.
 *
 * Used for single-use enforcement: the DB stores only the hash, never
 * the raw JWT (COMMENT ON COLUMN ... "SHA-256 of the raw single-use JWT").
 *
 * Deterministic: same input always produces the same output.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
