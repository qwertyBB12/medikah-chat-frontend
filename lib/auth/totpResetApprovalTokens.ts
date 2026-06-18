/**
 * Phase 18 Plan 18-07 — TOTP Reset Approval Token Utility (D-14 security core)
 *
 * Provides the signed single-use one-tap approval link token carried in the
 * lost-2FA admin email. Mirrors lib/auth/recoveryTokens.ts exactly; only the
 * type claim, payload shape, and export names differ.
 *
 * Security contract (T-18-07-02):
 *   - Tokens are HS256 JWTs signed with NEXTAUTH_SECRET.
 *   - `type` claim must equal 'totp_reset_approval' — any other value returns
 *     null. A recovery or activation token therefore CANNOT be replayed against
 *     this verifier (cross-type replay rejected).
 *   - The token is bound to exactly one reset request via the `request_id`
 *     claim — a link minted for request A cannot approve request B.
 *   - Expiry is 30 minutes; expired tokens return null.
 *   - Single-use at CONSUME time is NOT done by the token alone — the approve
 *     route (Task 3) requires the bound physician_totp_resets row to still be
 *     status='pending'. Once approved, the row flips and a replayed link finds
 *     no pending row → rejected. hashToken is kept for store-side parity.
 *   - No console.* calls in this file — tokens and secrets must not reach logs.
 */

import { SignJWT, jwtVerify } from 'jose';

// Re-export the SHA-256 hash helper verbatim from recoveryTokens so callers
// have one import surface and the implementation cannot drift.
export { hashToken } from './recoveryTokens';

// Use Buffer.from with encoding rather than TextEncoder to ensure the secret
// is always a proper Node.js Uint8Array — TextEncoder in jsdom environments
// can produce a subclass that jose's Uint8Array instanceof check rejects.
function secretKey(): Uint8Array {
  return Buffer.from(process.env.NEXTAUTH_SECRET!, 'utf8');
}

// ---------------------------------------------------------------------------
// Token payload shape
// ---------------------------------------------------------------------------

export interface TotpResetApprovalTokenPayload {
  physician_id: string;
  request_id: string;
  jti: string;
}

// ---------------------------------------------------------------------------
// signTotpResetApprovalToken
// ---------------------------------------------------------------------------

/**
 * Sign a 30-minute single-use TOTP reset approval token.
 *
 * @param payload - physician_id, the bound request_id, and a caller-supplied jti (UUID).
 * @returns Signed JWT string.
 */
export async function signTotpResetApprovalToken(
  payload: TotpResetApprovalTokenPayload,
): Promise<string> {
  const secret = secretKey();
  return new SignJWT({ ...payload, type: 'totp_reset_approval' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30m')
    .setJti(payload.jti)
    .sign(secret);
}

// ---------------------------------------------------------------------------
// verifyTotpResetApprovalToken
// ---------------------------------------------------------------------------

/**
 * Verify and decode a TOTP reset approval token.
 *
 * Returns null when:
 *   - Signature verification fails
 *   - Token is expired
 *   - `type` claim is not 'totp_reset_approval'
 *
 * The type-claim check ensures recovery/activation tokens cannot be replayed
 * as approval tokens (T-18-07-02).
 *
 * Never throws; all errors are caught and return null.
 */
export async function verifyTotpResetApprovalToken(
  token: string,
): Promise<TotpResetApprovalTokenPayload | null> {
  try {
    const secret = secretKey();
    const { payload } = await jwtVerify(token, secret);
    if (payload.type !== 'totp_reset_approval') return null;
    const { physician_id, request_id, jti } = payload as Record<string, unknown>;
    if (
      typeof physician_id !== 'string' ||
      typeof request_id !== 'string' ||
      typeof jti !== 'string'
    ) {
      return null;
    }
    return { physician_id, request_id, jti };
  } catch {
    // Catches ExpiredJWTError, JWSInvalidSignature, etc. — all return null.
    return null;
  }
}
