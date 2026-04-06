/**
 * Tests for USCR-02: State board verification for TX, NM, CA launch states
 *
 * Covers:
 * - Non-launch state returns immediately (no network call)
 * - Launch state TX/NM/CA triggers verification
 * - Graceful degradation to manual_review on network error
 * - Launch state gating: only TX, NM, CA get automated checks
 *
 * supabaseAdmin is mocked to prevent real DB calls.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// We need to mock supabaseAdmin before importing stateBoardVerify
vi.mock('../lib/supabaseServer', () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
}));

import { verifyStateLicense } from '../lib/stateBoardVerify';

const PHYSICIAN_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const LICENSE_ID = 'b2c3d4e5-f6a7-8901-bcde-f01234567891';

beforeEach(() => {
  vi.restoreAllMocks();
  // Re-apply the supabaseAdmin mock after restoreAllMocks resets spies
  // (module mocks are not affected by restoreAllMocks)
});

describe('State board gating: non-launch states', () => {
  it('returns immediately without making any network call for a non-launch state (FL)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    await verifyStateLicense(LICENSE_ID, 'FL', 'FL-99999', PHYSICIAN_ID);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns immediately for NY (not a launch state)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    await verifyStateLicense(LICENSE_ID, 'NY', 'NY-12345', PHYSICIAN_ID);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns immediately for empty string state', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    await verifyStateLicense(LICENSE_ID, '', 'NONE', PHYSICIAN_ID);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('is case-sensitive — lowercase tx is not a launch state', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    await verifyStateLicense(LICENSE_ID, 'tx', 'TX-99999', PHYSICIAN_ID);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('State board gating: launch states trigger network call', () => {
  it('makes a network call for TX (Texas Medical Board)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => '',
    } as Response);

    await verifyStateLicense(LICENSE_ID, 'TX', 'TX-12345', PHYSICIAN_ID);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toContain('tmb.state.tx.us');
  });

  it('makes a network call for NM (New Mexico Medical Board)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => '',
    } as Response);

    await verifyStateLicense(LICENSE_ID, 'NM', 'NM-99999', PHYSICIAN_ID);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toContain('nmmb.state.nm.us');
  });

  it('makes a network call for CA (Medical Board of California)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => '',
    } as Response);

    await verifyStateLicense(LICENSE_ID, 'CA', 'CA-55555', PHYSICIAN_ID);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toContain('breeze.ca.gov');
  });
});

describe('State board graceful degradation', () => {
  it('completes without throwing when state board returns an error status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => '',
    } as Response);

    // Should not throw — degrades gracefully
    await expect(
      verifyStateLicense(LICENSE_ID, 'TX', 'TX-BAD', PHYSICIAN_ID)
    ).resolves.toBeUndefined();
  });

  it('completes without throwing when fetch throws a network error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('ECONNREFUSED'));

    await expect(
      verifyStateLicense(LICENSE_ID, 'CA', 'CA-BAD', PHYSICIAN_ID)
    ).resolves.toBeUndefined();
  });
});
