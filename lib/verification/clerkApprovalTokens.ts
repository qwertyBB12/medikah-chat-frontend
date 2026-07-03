/**
 * Verification clerk — signed one-tap approval token (sprint 2026-07, task #27).
 *
 * Mirrors lib/auth/totpResetApprovalTokens.ts (the Phase-18 D-14 pattern): an
 * HS256 JWT signed with NEXTAUTH_SECRET, type-isolated so no other token kind
 * can be replayed against the clerk-approve verifier.
 *
 * Security contract:
 *   - `type` claim must equal 'clerk_verify_approval' — anything else → null.
 *   - Bound to exactly one physician via the `physician_id` claim.
 *   - Expiry 72h (the packet is a morning docket; Aguirre may review same-day
 *     or next — longer than the 30-min TOTP window, still bounded).
 *   - Single-use at CONSUME time: the approve route requires the physician to
 *     still be verification_status='pending'|'in_review'. Once verified, a
 *     replayed link finds no pending doctor → "already verified" page.
 *   - The tap is ADDITIONALLY admin-gated (getAdminUser) exactly like the
 *     Phase-18 one-tap: a stolen email link without an admin session gets 401.
 *   - No console.* in this file — tokens must never reach logs.
 */

import { SignJWT, jwtVerify } from 'jose';

function secretKey(): Uint8Array {
  return Buffer.from(process.env.NEXTAUTH_SECRET!, 'utf8');
}

export interface ClerkApprovalTokenPayload {
  physician_id: string;
  jti: string;
}

/** Sign a 72-hour, single-use clerk verify-approval token. */
export async function signClerkApprovalToken(
  payload: ClerkApprovalTokenPayload,
): Promise<string> {
  const secret = secretKey();
  return new SignJWT({ ...payload, type: 'clerk_verify_approval' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('72h')
    .setJti(payload.jti)
    .sign(secret);
}

/**
 * Verify and decode a clerk approval token. Returns null on bad signature,
 * expiry, wrong `type` claim, or malformed payload. Never throws.
 */
export async function verifyClerkApprovalToken(
  token: string,
): Promise<ClerkApprovalTokenPayload | null> {
  try {
    const secret = secretKey();
    const { payload } = await jwtVerify(token, secret);
    if (payload.type !== 'clerk_verify_approval') return null;
    const { physician_id, jti } = payload as Record<string, unknown>;
    if (typeof physician_id !== 'string' || typeof jti !== 'string') {
      return null;
    }
    return { physician_id, jti };
  } catch {
    return null;
  }
}
