// @vitest-environment node

/**
 * Phase 17 — Wave-0 activation token tests (AUTH-02)
 *
 * Covers: signActivationToken, verifyActivationToken, hashToken from
 * lib/auth/activationTokens.ts.
 *
 * These tests run without staging credentials — NEXTAUTH_SECRET is stubbed
 * via vi.stubEnv so the suite stays green in CI.
 *
 * Note per plan: these tests are RED-allowed for assertions that depend on
 * downstream production code (verify-token API, DB token table). All
 * assertions in THIS file exercise the utility functions that land in Plan
 * 17-01 and must pass GREEN.
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

// Stub NEXTAUTH_SECRET before importing the module so SignJWT picks it up.
// vi.stubEnv is synchronous and takes effect before the import below.
beforeAll(() => {
  vi.stubEnv('NEXTAUTH_SECRET', 'test-secret-for-unit-tests-at-least-32-chars-long!!');
});

afterAll(() => {
  vi.unstubAllEnvs();
});

// Dynamic import after stubbing env — ensures the module sees the test secret.
import {
  signActivationToken,
  verifyActivationToken,
  hashToken,
} from '../lib/auth/activationTokens';

const TEST_PAYLOAD = {
  physician_id: '00000000-0000-0000-0000-000000000001',
  email: 'doctor@medikah.health',
  jti: '00000000-0000-0000-0000-000000000002',
};

describe('signActivationToken / verifyActivationToken', () => {
  it('round-trips: sign then verify returns the original payload', async () => {
    const token = await signActivationToken(TEST_PAYLOAD);
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3); // JWT has three parts

    const result = await verifyActivationToken(token);
    expect(result).not.toBeNull();
    expect(result!.physician_id).toBe(TEST_PAYLOAD.physician_id);
    expect(result!.email).toBe(TEST_PAYLOAD.email);
    expect(result!.jti).toBe(TEST_PAYLOAD.jti);
  });

  it('returns null when type claim is not workspace_activation', async () => {
    // Sign a token with a wrong type manually to exercise the guard.
    // We sign a valid token first, then tamper by signing one with a different
    // type using the raw jose API to construct the payload directly.
    const { SignJWT } = await import('jose');
    const secret = Buffer.from(process.env.NEXTAUTH_SECRET!, 'utf8');
    const tampered = await new SignJWT({
      ...TEST_PAYLOAD,
      type: 'password_reset', // wrong type
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('30m')
      .setJti(TEST_PAYLOAD.jti)
      .sign(secret);

    const result = await verifyActivationToken(tampered);
    expect(result).toBeNull();
  });

  it('returns null for an expired token', async () => {
    // Sign with 1-second expiry and wait for it to pass.
    const { SignJWT } = await import('jose');
    const secret = Buffer.from(process.env.NEXTAUTH_SECRET!, 'utf8');
    const expiredToken = await new SignJWT({ ...TEST_PAYLOAD, type: 'workspace_activation' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1s')
      .setJti(TEST_PAYLOAD.jti)
      .sign(secret);

    // Wait 1100ms for the token to expire.
    await new Promise((r) => setTimeout(r, 1100));

    const result = await verifyActivationToken(expiredToken);
    expect(result).toBeNull();
  });

  it('returns null for a garbage string', async () => {
    const result = await verifyActivationToken('not.a.jwt');
    expect(result).toBeNull();
  });

  it('returns null for an empty string', async () => {
    const result = await verifyActivationToken('');
    expect(result).toBeNull();
  });
});

describe('hashToken', () => {
  it('is deterministic: same input produces the same SHA-256 hex', () => {
    const token = 'some-raw-token-string';
    const h1 = hashToken(token);
    const h2 = hashToken(token);
    expect(h1).toBe(h2);
    // SHA-256 hex is always 64 chars
    expect(h1.length).toBe(64);
    expect(/^[0-9a-f]{64}$/.test(h1)).toBe(true);
  });

  it('differs for different inputs', () => {
    const h1 = hashToken('token-a');
    const h2 = hashToken('token-b');
    expect(h1).not.toBe(h2);
  });

  it('produces the expected SHA-256 for a known value', () => {
    // SHA-256('abc') = ba7816bf8f01cfea414140de5dae2ec73b00361bbef0469f492d90ba52a76c9
    // Using Node crypto to verify our implementation is correct
    const { createHash } = require('crypto');
    const expected = createHash('sha256').update('abc').digest('hex');
    expect(hashToken('abc')).toBe(expected);
  });
});
