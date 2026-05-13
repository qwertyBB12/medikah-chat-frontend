/**
 * Phase 16 — Mailcow IMAP provider integration test (Plan 16-05, Task 3).
 *
 * Exercises the real `mailcowImapAuthorize()` pipeline against the staging
 * Mailcow IMAP server (imap.medikah.health:993) and the live Supabase
 * `auth_probe_attempts` ledger.
 *
 * The suite is `describe.skipIf`-guarded so CI without staging credentials
 * stays green — set the four env vars below to run locally:
 *   STAGING_MAILCOW_TEST_EMAIL       e.g. "e2etest@medikah.health"
 *   STAGING_MAILCOW_TEST_PASSWORD    the mailbox password
 *   NEXT_PUBLIC_SUPABASE_URL         standard Medikah env
 *   SUPABASE_SERVICE_ROLE_KEY        standard Medikah env
 *
 * Tests cover ROADMAP Success Criterion 5 (every probe writes a row) plus
 * spot-checks for SC1, SC3, SC4 invariants (D-04 rate-limit, D-09 status
 * non-gating, D-10 claim set).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { mailcowImapAuthorize } from '../lib/auth/mailcowImapProvider';
import { supabaseAdmin } from '../lib/supabaseServer';

const STAGING_EMAIL = process.env.STAGING_MAILCOW_TEST_EMAIL ?? '';
const STAGING_PASS = process.env.STAGING_MAILCOW_TEST_PASSWORD ?? '';
const SYNTHETIC_IP = '203.0.113.42';
const SYNTHETIC_UA = 'vitest-mailcow-e2e/1.0';

const ROW_TIMEOUT = 15_000;

function mockReq() {
  return {
    headers: {
      'x-nf-client-connection-ip': SYNTHETIC_IP,
      'user-agent': SYNTHETIC_UA,
    },
    socket: { remoteAddress: '127.0.0.1' },
  };
}

async function deleteSyntheticRows(sinceISO: string) {
  if (!supabaseAdmin) return;
  await supabaseAdmin
    .from('auth_probe_attempts')
    .delete()
    .eq('source_ip', SYNTHETIC_IP)
    .gte('attempted_at', sinceISO);
}

async function fetchSyntheticRows(sinceISO: string) {
  if (!supabaseAdmin) return [];
  const { data, error } = await supabaseAdmin
    .from('auth_probe_attempts')
    .select('id, outcome, attempted_at')
    .eq('source_ip', SYNTHETIC_IP)
    .gte('attempted_at', sinceISO)
    .order('attempted_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

describe.skipIf(!STAGING_PASS || !STAGING_EMAIL || !supabaseAdmin)(
  'mailcowImapAuthorize — staging Mailcow integration',
  () => {
    let testStartIso = new Date().toISOString();

    beforeEach(async () => {
      testStartIso = new Date().toISOString();
      // Belt-and-suspenders: drop any prior synthetic-IP rows so the rate-limit
      // window from a previous run does not leak in.
      await deleteSyntheticRows('1970-01-01T00:00:00Z');
    });

    afterEach(async () => {
      await deleteSyntheticRows(testStartIso);
    });

    it(
      'writes one auth_probe_attempts row per attempt (success + bad_password)',
      async () => {
        const ok = await mailcowImapAuthorize(
          { email: STAGING_EMAIL, password: STAGING_PASS },
          mockReq(),
        );
        expect(ok).not.toBeNull();

        const bad = await mailcowImapAuthorize(
          { email: STAGING_EMAIL, password: 'definitely-wrong-password' },
          mockReq(),
        );
        expect(bad).toBeNull();

        const rows = await fetchSyntheticRows(testStartIso);
        expect(rows.length).toBe(2);
        expect(rows[0].outcome).toBe('success');
        expect(rows[1].outcome).toBe('bad_password');
      },
      ROW_TIMEOUT,
    );

    it(
      'returns a user object with role=physician and the D-10 claim set on success',
      async () => {
        const user = await mailcowImapAuthorize(
          { email: STAGING_EMAIL, password: STAGING_PASS },
          mockReq(),
        );

        expect(user).not.toBeNull();
        if (!user) return;

        expect(user.role).toBe('physician');
        expect(user.mailbox_email).toBe(STAGING_EMAIL.toLowerCase());
        expect(user.physician_id).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        );
        expect(['pending', 'in_review', 'verified', 'rejected']).toContain(
          user.verification_status,
        );
        expect(user.workspace_role).toBe('owner');
      },
      ROW_TIMEOUT,
    );

    // D-09 runs BEFORE the rate-limit test because the 4-attempt burst in the
    // rate-limit test can trip Mailcow's fail2ban for the host's IP, which
    // would cause subsequent IMAP probes (including this test's success
    // probe) to time out. Ordering D-09 first keeps it on a clean Mailcow.
    it(
      'JWT issuance is NOT gated on verification_status (D-09)',
      async () => {
        // The success path returns a user object regardless of whether the
        // staging mailbox's physician row is verified. Reading the returned
        // status without filtering proves the predicate is not in the gate.
        const user = await mailcowImapAuthorize(
          { email: STAGING_EMAIL, password: STAGING_PASS },
          mockReq(),
        );
        expect(user).not.toBeNull();
        if (!user) return;
        // status may be any of the four enum values — the assertion is that
        // we received a user object at all, not what its status happens to be.
        expect(['pending', 'in_review', 'verified', 'rejected']).toContain(
          user.verification_status,
        );
      },
      ROW_TIMEOUT,
    );

    // Runs LAST because the 4-attempt burst can trip Mailcow fail2ban for the
    // host's source IP. Any test that depends on a fresh IMAP probe must
    // execute before this one.
    it(
      'rate-limits to locked_out after 3 failures in 5 minutes from the same source IP',
      async () => {
        // Four consecutive bad-password attempts. The first three should hit
        // IMAP and write `bad_password`; the fourth should short-circuit at
        // the rate-limit gate and write `locked_out`.
        for (let i = 0; i < 4; i++) {
          await mailcowImapAuthorize(
            { email: STAGING_EMAIL, password: `wrong-${i}` },
            mockReq(),
          );
        }

        const rows = await fetchSyntheticRows(testStartIso);
        const lockedRows = rows.filter((r) => r.outcome === 'locked_out');
        expect(lockedRows.length).toBeGreaterThanOrEqual(1);
      },
      ROW_TIMEOUT * 2,
    );
  },
);
