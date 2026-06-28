// @vitest-environment node
// This helper is server-side (BFF) and signs with jose. jose v4's internal
// `instanceof Uint8Array` check fails under the suite's default jsdom realm;
// run this file in the node environment (where Next.js/serverless also runs it).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { jwtVerify, decodeProtectedHeader } from 'jose';
import { mintBackendToken } from './backendToken';

const SECRET = 'test-nextauth-secret-value-1234567890';

describe('mintBackendToken', () => {
  beforeEach(() => {
    process.env.NEXTAUTH_SECRET = SECRET;
  });
  afterEach(() => {
    delete process.env.NEXTAUTH_SECRET;
  });

  it('mints an HS256 JWS the FastAPI gate can verify, carrying userId/role/email/physician_id', async () => {
    const jws = await mintBackendToken({
      userId: 'auth-user-1',
      role: 'physician',
      email: 'doc@medikah.health',
      physicianId: 'phys-uuid-1',
    });
    // It is a 3-part JWS (NOT a 5-part JWE) — the whole point of this fix.
    expect(jws.split('.')).toHaveLength(3);
    expect(decodeProtectedHeader(jws).alg).toBe('HS256');

    // Verify exactly as utils/auth.py does: HS256 with the same secret.
    const { payload } = await jwtVerify(jws, new TextEncoder().encode(SECRET), {
      algorithms: ['HS256'],
    });
    expect(payload.userId).toBe('auth-user-1');
    expect(payload.role).toBe('physician');
    expect(payload.email).toBe('doc@medikah.health');
    expect(payload.physician_id).toBe('phys-uuid-1'); // canonical key for the backend lookup
    expect(typeof payload.exp).toBe('number');
  });

  it('omits physician_id when not provided', async () => {
    const jws = await mintBackendToken({ userId: 'u', role: 'physician', email: 'd@x.com' });
    const { payload } = await jwtVerify(jws, new TextEncoder().encode(SECRET), {
      algorithms: ['HS256'],
    });
    expect(payload.physician_id).toBeUndefined();
  });

  it('honors a custom expiresIn (1h for browser-held tokens)', async () => {
    const before = Math.floor(Date.now() / 1000);
    const jws = await mintBackendToken(
      { userId: 'u', role: 'physician', email: 'd@x.com' },
      '1h',
    );
    const { payload } = await jwtVerify(jws, new TextEncoder().encode(SECRET), {
      algorithms: ['HS256'],
    });
    // ~3600s window (allow generous slack for clock + execution).
    expect(payload.exp! - payload.iat!).toBe(3600);
    expect(payload.exp!).toBeGreaterThan(before + 3000);
  });

  it('rejects verification under a different secret (signature is enforced)', async () => {
    const jws = await mintBackendToken({ userId: 'u', role: 'physician', email: 'd@x.com' });
    await expect(
      jwtVerify(jws, new TextEncoder().encode('a-different-secret'), { algorithms: ['HS256'] }),
    ).rejects.toThrow();
  });

  it('throws when NEXTAUTH_SECRET is unset', async () => {
    delete process.env.NEXTAUTH_SECRET;
    await expect(
      mintBackendToken({ userId: 'u', role: 'physician', email: 'd@x.com' }),
    ).rejects.toThrow(/NEXTAUTH_SECRET/);
  });
});
