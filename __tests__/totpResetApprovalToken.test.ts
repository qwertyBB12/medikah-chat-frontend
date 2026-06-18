// @vitest-environment node

/**
 * Phase 18 Plan 18-07 — TOTP reset approval token tests (D-14 security core)
 *
 * Covers: signTotpResetApprovalToken, verifyTotpResetApprovalToken, hashToken
 * from lib/auth/totpResetApprovalTokens.ts.
 *
 * Security properties asserted:
 *   - request_id round-trips (link binds to exactly one reset request).
 *   - A token of a different type ('workspace_recovery') verifies to null here
 *     (cross-type replay rejected — T-18-07-02).
 *   - Expired and tampered tokens verify to null and never throw.
 *
 * NEXTAUTH_SECRET is stubbed via vi.stubEnv so the suite stays green in CI.
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

beforeAll(() => {
  vi.stubEnv('NEXTAUTH_SECRET', 'test-secret-for-unit-tests-at-least-32-chars-long!!');
});

afterAll(() => {
  vi.unstubAllEnvs();
});

import {
  signTotpResetApprovalToken,
  verifyTotpResetApprovalToken,
  hashToken,
} from '../lib/auth/totpResetApprovalTokens';

const TEST_PAYLOAD = {
  physician_id: '00000000-0000-0000-0000-000000000001',
  request_id: '00000000-0000-0000-0000-0000000000AA',
  jti: '00000000-0000-0000-0000-000000000002',
};

describe('signTotpResetApprovalToken / verifyTotpResetApprovalToken', () => {
  it('round-trips: sign then verify returns physician_id, request_id, jti', async () => {
    const token = await signTotpResetApprovalToken(TEST_PAYLOAD);
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3);

    const result = await verifyTotpResetApprovalToken(token);
    expect(result).not.toBeNull();
    expect(result!.physician_id).toBe(TEST_PAYLOAD.physician_id);
    expect(result!.request_id).toBe(TEST_PAYLOAD.request_id);
    expect(result!.jti).toBe(TEST_PAYLOAD.jti);
  });

  it('binds to one request: a token for request A yields A, never a different id', async () => {
    const tokenA = await signTotpResetApprovalToken({ ...TEST_PAYLOAD, request_id: 'request-A' });
    const tokenB = await signTotpResetApprovalToken({ ...TEST_PAYLOAD, request_id: 'request-B' });

    const a = await verifyTotpResetApprovalToken(tokenA);
    const b = await verifyTotpResetApprovalToken(tokenB);
    expect(a!.request_id).toBe('request-A');
    expect(b!.request_id).toBe('request-B');
    expect(a!.request_id).not.toBe(b!.request_id);
  });

  it('rejects a cross-type token (workspace_recovery must NOT verify here)', async () => {
    const { SignJWT } = await import('jose');
    const secret = Buffer.from(process.env.NEXTAUTH_SECRET!, 'utf8');
    const recoveryTyped = await new SignJWT({
      ...TEST_PAYLOAD,
      type: 'workspace_recovery', // wrong type for this verifier
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('30m')
      .setJti(TEST_PAYLOAD.jti)
      .sign(secret);

    const result = await verifyTotpResetApprovalToken(recoveryTyped);
    expect(result).toBeNull();
  });

  it('returns null for an expired token', async () => {
    const { SignJWT } = await import('jose');
    const secret = Buffer.from(process.env.NEXTAUTH_SECRET!, 'utf8');
    const expiredToken = await new SignJWT({ ...TEST_PAYLOAD, type: 'totp_reset_approval' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1s')
      .setJti(TEST_PAYLOAD.jti)
      .sign(secret);

    await new Promise((r) => setTimeout(r, 1100));

    const result = await verifyTotpResetApprovalToken(expiredToken);
    expect(result).toBeNull();
  });

  it('returns null for a tampered / garbage string and never throws', async () => {
    await expect(verifyTotpResetApprovalToken('not.a.jwt')).resolves.toBeNull();
    await expect(verifyTotpResetApprovalToken('')).resolves.toBeNull();
  });
});

describe('hashToken', () => {
  it('is deterministic SHA-256 hex', () => {
    const h1 = hashToken('some-raw-token');
    const h2 = hashToken('some-raw-token');
    expect(h1).toBe(h2);
    expect(h1.length).toBe(64);
    expect(/^[0-9a-f]{64}$/.test(h1)).toBe(true);
  });

  it('matches Node crypto for a known value', () => {
    const { createHash } = require('crypto');
    const expected = createHash('sha256').update('abc').digest('hex');
    expect(hashToken('abc')).toBe(expected);
  });
});
