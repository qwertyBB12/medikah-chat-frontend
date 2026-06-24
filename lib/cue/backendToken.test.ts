// @vitest-environment node
// This helper is server-side (BFF) and signs with jose. jose v4's internal
// `instanceof Uint8Array` check fails under the suite's default jsdom realm;
// run this file in the node environment (where Next.js/serverless also runs it).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { jwtVerify, decodeProtectedHeader } from 'jose';
import { mintCueBackendToken } from './backendToken';

const SECRET = 'test-nextauth-secret-value-1234567890';

describe('mintCueBackendToken', () => {
  beforeEach(() => {
    process.env.NEXTAUTH_SECRET = SECRET;
  });
  afterEach(() => {
    delete process.env.NEXTAUTH_SECRET;
  });

  it('mints an HS256 JWS the backend can verify with NEXTAUTH_SECRET, carrying userId/role/email', async () => {
    const jws = await mintCueBackendToken({
      userId: 'auth-user-1',
      role: 'physician',
      email: 'doc@medikah.health',
      physicianId: 'phys-uuid-1',
    });
    // It is a 3-part JWS (NOT a 5-part JWE) with alg HS256.
    expect(jws.split('.')).toHaveLength(3);
    expect(decodeProtectedHeader(jws).alg).toBe('HS256');

    // Verify exactly as the FastAPI cue gate does: HS256 with the same secret.
    const { payload } = await jwtVerify(jws, new TextEncoder().encode(SECRET), {
      algorithms: ['HS256'],
    });
    expect(payload.userId).toBe('auth-user-1');
    expect(payload.role).toBe('physician');
    expect(payload.email).toBe('doc@medikah.health');
    expect(payload.physician_id).toBe('phys-uuid-1'); // canonical key for the backend lookup
    expect(typeof payload.exp).toBe('number'); // short expiry present
  });

  it('rejects verification under a different secret (signature is enforced)', async () => {
    const jws = await mintCueBackendToken({ userId: 'u', role: 'physician', email: 'd@x.com' });
    await expect(
      jwtVerify(jws, new TextEncoder().encode('a-different-secret'), { algorithms: ['HS256'] }),
    ).rejects.toThrow();
  });

  it('throws when NEXTAUTH_SECRET is unset', async () => {
    delete process.env.NEXTAUTH_SECRET;
    await expect(
      mintCueBackendToken({ userId: 'u', role: 'physician', email: 'd@x.com' }),
    ).rejects.toThrow(/NEXTAUTH_SECRET/);
  });
});
