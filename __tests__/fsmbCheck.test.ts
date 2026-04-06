/**
 * Tests for USCR-06
 *
 * USCR-06: System checks for disciplinary actions via FSMB/DocInfo
 *
 * Tests:
 * - Graceful degradation to 'manual_review' when DocInfo is unreachable
 * - 'clear' status when DocInfo returns no board actions
 * - 'flagged' status when DocInfo returns board actions
 * - Error path: invalid NPI format returns 'error' status
 * - Network failure degrades to 'manual_review'
 * - HTTP 4xx/5xx response degrades to 'manual_review'
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkFSMB } from '../lib/fsmbCheck';

const VALID_NPI = '1234567893';
const INVALID_NPI = '12345';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('FSMB check: input validation', () => {
  it('returns error status for NPI that is not 10 digits — no network call made', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const result = await checkFSMB(INVALID_NPI);
    expect(result.status).toBe('error');
    expect(result.hasActions).toBeNull();
    expect(result.error).toMatch(/invalid npi/i);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('always returns a checkedAt ISO timestamp', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    fetchSpy.mockRejectedValueOnce(new Error('Connection refused'));
    const result = await checkFSMB(VALID_NPI);
    expect(result.checkedAt).toBeDefined();
    expect(new Date(result.checkedAt).getTime()).not.toBeNaN();
  });
});

describe('FSMB check: graceful degradation to manual_review', () => {
  it('returns manual_review when DocInfo returns HTTP 404 (no public API)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as Response);

    const result = await checkFSMB(VALID_NPI);
    expect(result.status).toBe('manual_review');
    expect(result.hasActions).toBeNull();
    expect(result.source).toBe('manual');
  });

  it('returns manual_review when DocInfo returns HTTP 403 (access denied)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 403,
    } as Response);

    const result = await checkFSMB(VALID_NPI);
    expect(result.status).toBe('manual_review');
    expect(result.source).toBe('manual');
  });

  it('returns manual_review on network error (fetch throws)', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Connection refused'));

    const result = await checkFSMB(VALID_NPI);
    expect(result.status).toBe('manual_review');
    expect(result.hasActions).toBeNull();
    expect(result.source).toBe('manual');
    expect(result.error).toMatch(/connection refused/i);
  });

  it('returns manual_review on timeout (AbortError)', async () => {
    const abortError = new DOMException('The operation was aborted.', 'AbortError');
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(abortError);

    const result = await checkFSMB(VALID_NPI);
    expect(result.status).toBe('manual_review');
    expect(result.source).toBe('manual');
  });
});

describe('FSMB check: clear status when no board actions', () => {
  it('returns clear status and hasActions=false when DocInfo response has empty actions array', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ actions: [] }),
    } as Response);

    const result = await checkFSMB(VALID_NPI);
    expect(result.status).toBe('clear');
    expect(result.hasActions).toBe(false);
    expect(result.actionCount).toBe(0);
    expect(result.source).toBe('docinfo');
  });

  it('returns clear when DocInfo response has no actions field', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ physician: { name: 'JOHN DOE' } }),
    } as Response);

    const result = await checkFSMB(VALID_NPI);
    // actions is not an array → hasActions is false → clear
    expect(result.status).toBe('clear');
    expect(result.hasActions).toBe(false);
  });
});

describe('FSMB check: flagged status when board actions present', () => {
  it('returns flagged status and hasActions=true when DocInfo response has board actions', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        actions: [
          { type: 'Reprimand', date: '2020-01-15', state: 'TX' },
          { type: 'Probation', date: '2021-03-10', state: 'CA' },
        ],
      }),
    } as Response);

    const result = await checkFSMB(VALID_NPI, 'John Doe');
    expect(result.status).toBe('flagged');
    expect(result.hasActions).toBe(true);
    expect(result.actionCount).toBe(2);
    expect(result.source).toBe('docinfo');
  });
});
