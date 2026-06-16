/**
 * Phase 18 — Workspace Recovery Token Utility
 *
 * Provides signed single-use magic-link tokens for the physician workspace
 * recovery flow (AUTH-07, FLOW-05).
 *
 * Security contract (T-18-01-03):
 *   - Tokens are HS256 JWTs signed with NEXTAUTH_SECRET.
 *   - `type` claim must equal 'workspace_recovery' — any other value returns null.
 *     This ensures activation tokens cannot be replayed as recovery tokens.
 *   - Expiry is 30 minutes; expired tokens return null.
 *   - hashToken produces a SHA-256 hex digest for DB storage; the raw token
 *     is NEVER stored.
 *   - No console.* calls in this file — tokens and secrets must not reach logs.
 *
 * Mirrors lib/auth/activationTokens.ts exactly; only the type claim and export
 * names differ (type claim: workspace_recovery; exports: signRecoveryToken, verifyRecoveryToken).
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

export interface RecoveryTokenPayload {
  physician_id: string;
  email: string;
  jti: string;
}

// ---------------------------------------------------------------------------
// signRecoveryToken
// ---------------------------------------------------------------------------

/**
 * Sign a 30-minute single-use recovery token.
 *
 * @param payload - physician_id, email, and a caller-supplied jti (UUID).
 * @returns Signed JWT string.
 */
export async function signRecoveryToken(payload: RecoveryTokenPayload): Promise<string> {
  const secret = secretKey();
  return new SignJWT({ ...payload, type: 'workspace_recovery' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30m')
    .setJti(payload.jti)
    .sign(secret);
}

// ---------------------------------------------------------------------------
// verifyRecoveryToken
// ---------------------------------------------------------------------------

/**
 * Verify and decode a recovery token.
 *
 * Returns null when:
 *   - Signature verification fails
 *   - Token is expired
 *   - `type` claim is not 'workspace_recovery'
 *
 * The type-claim check ensures activation tokens cannot be replayed as
 * recovery tokens (T-18-01-03).
 *
 * Never throws; all errors are caught and return null.
 */
export async function verifyRecoveryToken(
  token: string,
): Promise<RecoveryTokenPayload | null> {
  try {
    const secret = secretKey();
    const { payload } = await jwtVerify(token, secret);
    if (payload.type !== 'workspace_recovery') return null;
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
 * Identical implementation to activationTokens.ts hashToken — re-exported
 * here so callers only need to import from recoveryTokens.
 *
 * Deterministic: same input always produces the same output.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
