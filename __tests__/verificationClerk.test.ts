// @vitest-environment node
/**
 * Verification clerk standing agent (sprint task #27):
 *  - signed one-tap approval token (Phase-18 D-14 pattern: type-isolated,
 *    physician-bound, time-boxed; single-use enforced at consume),
 *  - deterministic packet builder (one-tap eligibility bar: title on file +
 *    MX cédula + uploaded docs; everything else is cockpit-only),
 *  - the one-tap route's fail-closed gates (admin session BEFORE token work;
 *    replayed link after verify = no state change).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  signClerkApprovalToken,
  verifyClerkApprovalToken,
} from '../lib/verification/clerkApprovalTokens';
import { buildClerkPacket } from '../lib/verification/clerkPacket';

beforeEach(() => {
  vi.stubEnv('NEXTAUTH_SECRET', 'test-secret-for-clerk-tokens');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// ---------------------------------------------------------------------------
// Token
// ---------------------------------------------------------------------------

describe('clerk approval token', () => {
  it('round-trips a signed token', async () => {
    const token = await signClerkApprovalToken({ physician_id: 'phys-1', jti: 'jti-1' });
    const payload = await verifyClerkApprovalToken(token);
    expect(payload).toEqual({ physician_id: 'phys-1', jti: 'jti-1' });
  });

  it('rejects a token of a different type (cross-type replay)', async () => {
    // Simulate a foreign token signed with the same secret but another type
    const { SignJWT } = await import('jose');
    const foreign = await new SignJWT({ physician_id: 'phys-1', jti: 'x', type: 'totp_reset_approval' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .sign(Buffer.from('test-secret-for-clerk-tokens', 'utf8'));
    expect(await verifyClerkApprovalToken(foreign)).toBeNull();
  });

  it('rejects garbage', async () => {
    expect(await verifyClerkApprovalToken('not-a-jwt')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Packet builder
// ---------------------------------------------------------------------------

function fakeDb(rows: {
  licenses?: Array<Record<string, unknown>>;
  docCount?: number;
}) {
  return {
    from: (table: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        then: undefined,
      };
      chain.eq = () => {
        if (table === 'physician_licenses') {
          return Promise.resolve({ data: rows.licenses ?? [] });
        }
        return Promise.resolve({ count: rows.docCount ?? 0 });
      };
      return chain;
    },
  };
}

const PHYSICIAN = {
  id: 'phys-1',
  full_name: 'María García Hernández',
  title: 'Dra',
  email: 'maria@example.com',
  primary_specialty: 'Cardiología',
  onboarding_completed_at: '2026-07-01T00:00:00Z',
};

describe('buildClerkPacket eligibility bar', () => {
  it('title + MX cédula + docs → one-tap eligible', async () => {
    const db = fakeDb({
      licenses: [{ license_number: '1234567', license_type: 'cedula', country_code: 'MX', verification_status: 'pending' }],
      docCount: 2,
    });
    const p = await buildClerkPacket(db, PHYSICIAN);
    expect(p.oneTapEligible).toBe(true);
    expect(p.blockers).toEqual([]);
    expect(p.cedulas[0].number).toBe('1234567');
  });

  it('missing title → cockpit-only (honorific is never guessed)', async () => {
    const db = fakeDb({
      licenses: [{ license_number: '1234567', license_type: 'cedula', country_code: 'MX', verification_status: 'pending' }],
      docCount: 1,
    });
    const p = await buildClerkPacket(db, { ...PHYSICIAN, title: null });
    expect(p.oneTapEligible).toBe(false);
    expect(p.blockers.join(' ')).toContain('honorífico');
  });

  it('no MX cédula and no docs → both blockers listed', async () => {
    const db = fakeDb({
      licenses: [{ license_number: 'A99', license_type: 'state_license', country_code: 'US', verification_status: 'pending' }],
      docCount: 0,
    });
    const p = await buildClerkPacket(db, PHYSICIAN);
    expect(p.oneTapEligible).toBe(false);
    expect(p.blockers).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// One-tap route gates
// ---------------------------------------------------------------------------

const getAdminUser = vi.fn();
vi.mock('../lib/adminAuth', () => ({
  getAdminUser: (...a: unknown[]) => getAdminUser(...a),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let physicianRow: any = null;
const physicianUpdates: Array<Record<string, unknown>> = [];
vi.mock('../lib/supabaseServer', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        single: async () => ({ data: physicianRow, error: physicianRow ? null : { message: 'not found' } }),
        insert: async () => ({ error: null }),
        update: (payload: Record<string, unknown>) => {
          if (table === 'physicians') physicianUpdates.push(payload);
          return { eq: async () => ({ error: null }) };
        },
      };
      return chain;
    },
  },
}));
vi.mock('../lib/mailcowProvisioner', () => ({
  provisionWorkspaceMailbox: vi.fn(async () => ({
    status: 'provisioned', localPart: 'dra-garcia', mailboxAddress: 'dra-garcia@medikah.health',
  })),
}));
vi.mock('../lib/activationEmail', () => ({
  triggerWorkspaceActivation: vi.fn(async () => ({ status: 'sent' })),
}));

import clerkApproveHandler from '../pages/api/admin/clerk-approve';

function mockRes() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res: any = {};
  res.statusCode = 200;
  res.body = null;
  res.status = vi.fn((c: number) => { res.statusCode = c; return res; });
  res.json = vi.fn((b: unknown) => { res.body = b; return res; });
  res.setHeader = vi.fn(() => res);
  res.send = vi.fn((b: unknown) => { res.body = b; return res; });
  return res;
}

function mockReq(query: Record<string, string> = {}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { method: 'GET', headers: {}, query } as any;
}

describe('clerk-approve one-tap gates', () => {
  beforeEach(() => {
    physicianUpdates.length = 0;
    getAdminUser.mockReset();
  });

  it('401 page when no admin session — BEFORE any token processing', async () => {
    getAdminUser.mockResolvedValue(null);
    const res = mockRes();
    await clerkApproveHandler(mockReq({ token: 'anything' }), res);
    expect(res.statusCode).toBe(401);
    expect(physicianUpdates).toHaveLength(0);
  });

  it('400 page on invalid token', async () => {
    getAdminUser.mockResolvedValue({ id: 'adm-1', email: 'a@medikah.health', role: 'admin' });
    const res = mockRes();
    await clerkApproveHandler(mockReq({ token: 'garbage' }), res);
    expect(res.statusCode).toBe(400);
    expect(physicianUpdates).toHaveLength(0);
  });

  it('replayed link after verify → already-verified page, no state change', async () => {
    getAdminUser.mockResolvedValue({ id: 'adm-1', email: 'a@medikah.health', role: 'admin' });
    physicianRow = {
      id: 'phys-1', full_name: 'María García', title: 'Dra',
      email: 'm@example.com', verification_status: 'verified',
    };
    const token = await signClerkApprovalToken({ physician_id: 'phys-1', jti: 'j1' });
    const res = mockRes();
    await clerkApproveHandler(mockReq({ token }), res);
    expect(res.statusCode).toBe(200);
    expect(String(res.body)).toContain('Ya estaba verificado');
    expect(physicianUpdates).toHaveLength(0);
  });

  it('pending physician → verify flip + provision + activation, success page', async () => {
    getAdminUser.mockResolvedValue({ id: 'adm-1', email: 'a@medikah.health', role: 'admin' });
    physicianRow = {
      id: 'phys-1', full_name: 'María García', title: 'Dra',
      email: 'm@example.com', verification_status: 'pending',
    };
    const token = await signClerkApprovalToken({ physician_id: 'phys-1', jti: 'j2' });
    const res = mockRes();
    await clerkApproveHandler(mockReq({ token }), res);
    expect(res.statusCode).toBe(200);
    expect(physicianUpdates[0]?.verification_status).toBe('verified');
    expect(String(physicianUpdates[0]?.verified_by)).toContain('clerk-one-tap:');
    expect(String(res.body)).toContain('dra-garcia@medikah.health');
    expect(String(res.body)).toContain('verificado y activado');
  });
});
