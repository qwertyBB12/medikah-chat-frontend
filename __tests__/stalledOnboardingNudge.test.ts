/**
 * Gate tests for POST /api/internal/stalled-onboarding-nudge:
 * fail-closed auth (X-Internal-Secret) and the STALLED_NUDGE_ENABLED dark
 * switch. The selection pipeline itself is exercised against prod data (zero
 * candidates as of 2026-07-02) and bounded by MAX_NUDGES_PER_RUN.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../lib/supabaseServer', () => ({ supabaseAdmin: {} }));
vi.mock('../lib/physicianEmail', () => ({ sendOnboardingNudgeEmail: vi.fn() }));

import handler from '../pages/api/internal/stalled-onboarding-nudge';

function mockRes() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res: any = {};
  res.statusCode = 200;
  res.body = null;
  res.status = vi.fn((c: number) => { res.statusCode = c; return res; });
  res.json = vi.fn((b: unknown) => { res.body = b; return res; });
  res.setHeader = vi.fn(() => res);
  res.end = vi.fn(() => res);
  return res;
}

function mockReq(overrides: Record<string, unknown> = {}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { method: 'POST', headers: {}, body: {}, ...overrides } as any;
}

beforeEach(() => {
  vi.stubEnv('INTERNAL_API_SHARED_SECRET', 'test-secret');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('stalled-onboarding-nudge gates', () => {
  it('rejects non-POST', async () => {
    const res = mockRes();
    await handler(mockReq({ method: 'GET' }), res);
    expect(res.statusCode).toBe(405);
  });

  it('403 when secret header missing', async () => {
    const res = mockRes();
    await handler(mockReq(), res);
    expect(res.statusCode).toBe(403);
  });

  it('403 when secret is wrong (fail closed)', async () => {
    const res = mockRes();
    await handler(mockReq({ headers: { 'x-internal-secret': 'nope' } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('403 when INTERNAL_API_SHARED_SECRET is not configured', async () => {
    vi.stubEnv('INTERNAL_API_SHARED_SECRET', '');
    const res = mockRes();
    await handler(mockReq({ headers: { 'x-internal-secret': 'anything' } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('answers disabled (200) while STALLED_NUDGE_ENABLED is not true', async () => {
    vi.stubEnv('STALLED_NUDGE_ENABLED', 'false');
    const res = mockRes();
    await handler(mockReq({ headers: { 'x-internal-secret': 'test-secret' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: 'disabled', sent: 0 });
  });
});
