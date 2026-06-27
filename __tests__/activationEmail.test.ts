// @vitest-environment node

/**
 * Phase 17 FLOW-03 + Onboarding Option B gate — triggerWorkspaceActivation.
 *
 * Design intent (project_onboarding_identity_flow / AUDIT-onboarding-readiness-2026-06-27):
 * the activation email lets a physician set their MAILCOW mailbox password (+TOTP),
 * which only works once the mailbox actually EXISTS. set-password.ts resolves the
 * mailbox via physician_workspace_accounts.mailbox_local_part, and NOTHING creates
 * that row at verify time — only the post-login workspace wizard / provisioning saga
 * sets mailbox_local_part. Sending activation before provisioning dead-ends:
 * set-password 404s AND burns the single-use token.
 *
 * These tests pin the gate: activation is sent ONLY when the mailbox is provisioned,
 * and the function reports a discriminated status so the admin UI can surface
 * "mailbox not provisioned yet" instead of a false "sent" toast.
 *
 * supabaseAdmin + the token signer are mocked; no real DB / Resend calls.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoisted shared mock state so the vi.mock factories can close over it.
const h = vi.hoisted(() => ({
  adminPresent: true,
  physician: {
    data: null as null | Record<string, unknown>,
    error: null as null | { message: string },
  },
  workspace: {
    data: null as null | Record<string, unknown>,
    error: null as null | { message: string },
  },
  existingToken: {
    data: null as null | Record<string, unknown>,
    error: null as null | { message: string },
  },
  insertResult: { error: null as null | { message: string } },
  insertedRows: [] as Array<{ table: string; row: unknown }>,
}));

vi.mock('../lib/supabaseServer', () => {
  const makeBuilder = (table: string) => {
    const builder: Record<string, unknown> = {
      select: () => builder,
      eq: () => builder,
      is: () => builder,
      gt: () => builder,
      maybeSingle: () => {
        if (table === 'physicians') return Promise.resolve(h.physician);
        if (table === 'physician_workspace_accounts') return Promise.resolve(h.workspace);
        if (table === 'physician_activation_tokens') return Promise.resolve(h.existingToken);
        return Promise.resolve({ data: null, error: null });
      },
      insert: (row: unknown) => {
        h.insertedRows.push({ table, row });
        return Promise.resolve(h.insertResult);
      },
    };
    return builder;
  };
  return {
    get supabaseAdmin() {
      return h.adminPresent ? { from: (t: string) => makeBuilder(t) } : null;
    },
  };
});

// Deterministic token signer — avoids jose/env coupling in the unit test.
vi.mock('../lib/auth/activationTokens', () => ({
  ACTIVATION_TTL_MINUTES: 1440,
  signActivationToken: vi.fn(async () => 'signed.jwt.token'),
  hashToken: vi.fn(() => 'hashed-token'),
}));

import { triggerWorkspaceActivation } from '../lib/activationEmail';

const PHYSICIAN_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

const PROVISIONED_PHYSICIAN = {
  id: PHYSICIAN_ID,
  email: 'doctor@example.com',
  full_name: 'Ada Lovelace',
  onboarding_language: 'en',
};

let fetchSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  // Clear spy call-history (re-spying globalThis.fetch reuses the same spy, so
  // call counts would otherwise leak across tests). Module mocks are unaffected.
  vi.restoreAllMocks();

  // Reset shared state between tests
  h.adminPresent = true;
  h.physician = { data: { ...PROVISIONED_PHYSICIAN }, error: null };
  h.workspace = { data: { mailbox_local_part: 'alovelace' }, error: null };
  h.existingToken = { data: null, error: null };
  h.insertResult = { error: null };
  h.insertedRows = [];

  process.env.RESEND_API_KEY = 'test-key';
  process.env.PRACTIKAH_EMAIL_FROM = 'activacion@medikah.health';

  // Resend HTTP call — succeed by default.
  fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ id: 'resend-email-id' }), { status: 200 }),
  );
});

describe('triggerWorkspaceActivation — Option B provisioning gate', () => {
  it('skips with reason mailbox_not_provisioned when no workspace row exists', async () => {
    h.workspace = { data: null, error: null };

    const result = await triggerWorkspaceActivation(PHYSICIAN_ID);

    expect(result).toEqual({ status: 'skipped', reason: 'mailbox_not_provisioned' });
    // No activation token minted, no email sent.
    expect(h.insertedRows).toHaveLength(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('skips with reason mailbox_not_provisioned when the row exists but mailbox_local_part is null', async () => {
    h.workspace = { data: { mailbox_local_part: null }, error: null };

    const result = await triggerWorkspaceActivation(PHYSICIAN_ID);

    expect(result).toEqual({ status: 'skipped', reason: 'mailbox_not_provisioned' });
    expect(h.insertedRows).toHaveLength(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('sends and reports status=sent when the mailbox is provisioned and no live token exists', async () => {
    const result = await triggerWorkspaceActivation(PHYSICIAN_ID);

    expect(result).toEqual({ status: 'sent' });
    // One activation token inserted, one Resend email sent.
    expect(h.insertedRows).toHaveLength(1);
    expect(h.insertedRows[0].table).toBe('physician_activation_tokens');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('is idempotent: skips with reason token_active when a live token already exists (provisioned)', async () => {
    h.existingToken = { data: { id: 'existing-token-id' }, error: null };

    const result = await triggerWorkspaceActivation(PHYSICIAN_ID);

    expect(result).toEqual({ status: 'skipped', reason: 'token_active' });
    expect(h.insertedRows).toHaveLength(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('skips with reason physician_not_found when the physician record is missing', async () => {
    h.physician = { data: null, error: null };

    const result = await triggerWorkspaceActivation(PHYSICIAN_ID);

    expect(result).toEqual({ status: 'skipped', reason: 'physician_not_found' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('skips with reason not_configured when supabaseAdmin is unavailable', async () => {
    h.adminPresent = false;

    const result = await triggerWorkspaceActivation(PHYSICIAN_ID);

    expect(result).toEqual({ status: 'skipped', reason: 'not_configured' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
