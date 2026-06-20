// @vitest-environment node

/**
 * Phase 21 — server-side JWT revocation core (lib/auth/sessionRevocation.ts).
 *
 * The SSO gate (pages/api/practikah/sso-verify.ts) admits a physician to webmail
 * on every nginx auth_request. A *copied* NextAuth JWT replays into that gate for
 * up to an hour after logout unless we check a server-side watermark. These tests
 * pin the two security properties of that watermark:
 *
 *   1. A token whose pinned session_iat is OLDER than the physician's session_epoch
 *      is REVOKED (true). A token at/after the epoch is live (false).
 *   2. FAIL OPEN — any missing input, missing row, or DB error returns NOT revoked
 *      (false). Rationale: the epoch check is an *additional* layer on top of the
 *      signature/role/verified checks; a Supabase blip (free-tier autopause has
 *      happened) must never drop us below the pre-revocation security baseline by
 *      locking the whole launch cohort out of email.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Shared mutable mock state, hoisted so the vi.mock factory can close over it.
const h = vi.hoisted(() => ({
  adminPresent: true,
  readResult: { data: null as null | { session_epoch: number }, error: null as null | { message: string } },
  writeResult: { error: null as null | { message: string } },
  updateArg: undefined as undefined | Record<string, unknown>,
  eqArgs: [] as unknown[],
}));

vi.mock('../lib/supabaseServer', () => {
  const makeBuilder = () => {
    const builder: Record<string, unknown> = {
      from: vi.fn(() => builder),
      select: vi.fn(() => builder),
      update: vi.fn((arg: Record<string, unknown>) => {
        h.updateArg = arg;
        return builder;
      }),
      eq: vi.fn((_col: string, val: unknown) => {
        h.eqArgs.push(val);
        return builder;
      }),
      maybeSingle: vi.fn(() => Promise.resolve(h.readResult)),
      // Thenable so the write path (`await ...update().eq()`) resolves.
      then: (resolve: (v: unknown) => void) => resolve(h.writeResult),
    };
    return builder;
  };
  return {
    get supabaseAdmin() {
      return h.adminPresent ? makeBuilder() : null;
    },
  };
});

import { isSessionRevoked, bumpSessionEpoch, nowEpochSeconds } from '../lib/auth/sessionRevocation';

beforeEach(() => {
  h.adminPresent = true;
  h.readResult = { data: null, error: null };
  h.writeResult = { error: null };
  h.updateArg = undefined;
  h.eqArgs = [];
});

describe('isSessionRevoked', () => {
  const PID = '11111111-1111-1111-1111-111111111111';

  it('is NOT revoked when the token was issued at/after the epoch', async () => {
    h.readResult = { data: { session_epoch: 1000 }, error: null };
    expect(await isSessionRevoked(PID, 1000)).toBe(false); // exactly at epoch → live
    expect(await isSessionRevoked(PID, 1500)).toBe(false); // after epoch → live
  });

  it('IS revoked when the token was issued before the epoch', async () => {
    h.readResult = { data: { session_epoch: 2000 }, error: null };
    expect(await isSessionRevoked(PID, 1999)).toBe(true);
    expect(await isSessionRevoked(PID, 0)).toBe(true);
  });

  it('treats a default/zero epoch as never-revoked (deploy safety)', async () => {
    h.readResult = { data: { session_epoch: 0 }, error: null };
    expect(await isSessionRevoked(PID, 1)).toBe(false);
  });

  it('fails OPEN when session_iat is missing', async () => {
    h.readResult = { data: { session_epoch: 9999 }, error: null };
    expect(await isSessionRevoked(PID, undefined)).toBe(false);
  });

  it('fails OPEN when physician_id is missing', async () => {
    h.readResult = { data: { session_epoch: 9999 }, error: null };
    expect(await isSessionRevoked(undefined, 1)).toBe(false);
  });

  it('fails OPEN when the epoch read errors (DB unreachable)', async () => {
    h.readResult = { data: null, error: { message: 'connection refused' } };
    expect(await isSessionRevoked(PID, 1)).toBe(false);
  });

  it('fails OPEN when there is no workspace row for the physician', async () => {
    h.readResult = { data: null, error: null };
    expect(await isSessionRevoked(PID, 1)).toBe(false);
  });

  it('fails OPEN when supabaseAdmin is not configured', async () => {
    h.adminPresent = false;
    expect(await isSessionRevoked(PID, 1)).toBe(false);
  });

  it('queries by the given physician_id', async () => {
    h.readResult = { data: { session_epoch: 5 }, error: null };
    await isSessionRevoked(PID, 10);
    expect(h.eqArgs).toContain(PID);
  });
});

describe('bumpSessionEpoch', () => {
  const PID = '22222222-2222-2222-2222-222222222222';

  it('writes session_epoch ~= now and returns true', async () => {
    const before = nowEpochSeconds();
    const ok = await bumpSessionEpoch(PID);
    expect(ok).toBe(true);
    expect(h.updateArg).toBeDefined();
    const written = Number((h.updateArg as { session_epoch: number }).session_epoch);
    expect(written).toBeGreaterThanOrEqual(before);
    expect(written).toBeLessThanOrEqual(nowEpochSeconds() + 1);
    expect(h.eqArgs).toContain(PID);
  });

  it('returns false (never throws) when the write errors', async () => {
    h.writeResult = { error: { message: 'permission denied' } };
    await expect(bumpSessionEpoch(PID)).resolves.toBe(false);
  });

  it('returns false when physician_id is missing', async () => {
    expect(await bumpSessionEpoch(undefined)).toBe(false);
  });

  it('returns false when supabaseAdmin is not configured', async () => {
    h.adminPresent = false;
    expect(await bumpSessionEpoch(PID)).toBe(false);
  });
});
