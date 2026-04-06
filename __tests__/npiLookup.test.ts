/**
 * Tests for USCR-01 and ONBD-04
 *
 * USCR-01: Doctor can enter NPI number for initial identity verification
 * ONBD-04: System auto-populates fields via NPI Registry lookup
 *
 * Tests NPI format validation, Luhn check digit, and NPI Registry response parsing.
 * fetch is mocked globally — no real network calls are made.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { lookupNPI } from '../lib/npiLookup';

// ------------------------------------------------------------------
// Known-valid NPIs (pass Luhn with 80840 prefix)
// The NPI Luhn algorithm: prepend '80840', run standard Luhn, result must be divisible by 10.
// NPI 1234567893 is a well-known test NPI that is documented as passing the check.
// ------------------------------------------------------------------

const VALID_NPI = '1234567893';

// NPI that fails format (not 10 digits)
const SHORT_NPI = '123456';
const ALPHA_NPI = '123456789A';

// NPI that is 10 digits but fails the Luhn check
// We can derive one: take a valid NPI and flip the last digit.
// VALID_NPI = 1234567893, flip last digit → 1234567892 (different check digit)
const LUHN_FAIL_NPI = '1234567892';

// ------------------------------------------------------------------
// Mock helpers
// ------------------------------------------------------------------

function makeNPPESResponse(npiNumber: string) {
  return {
    result_count: 1,
    results: [
      {
        number: npiNumber,
        basic: {
          first_name: 'JOHN',
          last_name: 'DOE',
          middle_name: 'A',
          credential: 'MD',
          enumeration_date: '2005-05-23',
          status: 'A',
        },
        taxonomies: [
          {
            code: '207R00000X',
            desc: 'Internal Medicine',
            state: 'TX',
            license: '12345',
            primary: true,
          },
        ],
        addresses: [
          {
            country_code: 'US',
            address_purpose: 'LOCATION',
            city: 'Houston',
            state: 'TX',
          },
        ],
      },
    ],
  };
}

function makeEmptyNPPESResponse() {
  return { result_count: 0, results: [] };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

// ------------------------------------------------------------------
// USCR-01: NPI format validation (regex)
// ------------------------------------------------------------------

describe('NPI format validation', () => {
  it('rejects NPI that is not exactly 10 digits — returns found: false with error', async () => {
    const result = await lookupNPI(SHORT_NPI);
    expect(result.found).toBe(false);
    expect(result.error).toMatch(/10 digits/i);
  });

  it('rejects NPI containing non-digit characters', async () => {
    const result = await lookupNPI(ALPHA_NPI);
    expect(result.found).toBe(false);
    expect(result.error).toMatch(/10 digits/i);
  });

  it('rejects empty string as NPI', async () => {
    const result = await lookupNPI('');
    expect(result.found).toBe(false);
    expect(result.error).toMatch(/10 digits/i);
  });
});

// ------------------------------------------------------------------
// USCR-01: NPI Luhn check digit validation (80840 prefix algorithm)
// ------------------------------------------------------------------

describe('NPI Luhn check digit validation', () => {
  it('rejects a 10-digit NPI that fails the Luhn check — returns found: false', async () => {
    // LUHN_FAIL_NPI has wrong check digit — should fail before making any network call
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const result = await lookupNPI(LUHN_FAIL_NPI);
    expect(result.found).toBe(false);
    expect(result.error).toMatch(/check digit/i);
    // Luhn rejection must happen before fetch is called
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('passes Luhn validation for known-valid NPI and proceeds to network call', async () => {
    // Mock fetch to return a valid NPPES response so we can confirm Luhn passed
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => makeNPPESResponse(VALID_NPI),
    } as Response);

    const result = await lookupNPI(VALID_NPI);
    expect(result.found).toBe(true);
    // No Luhn error message
    expect(result.error).toBeUndefined();
  });
});

// ------------------------------------------------------------------
// ONBD-04: NPI Registry response parsing (auto-populate fields)
// ------------------------------------------------------------------

describe('NPI Registry response parsing for auto-populate', () => {
  it('returns fullName built from first, middle, last name parts', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => makeNPPESResponse(VALID_NPI),
    } as Response);

    const result = await lookupNPI(VALID_NPI);
    expect(result.found).toBe(true);
    expect(result.fullName).toBe('JOHN A DOE');
  });

  it('returns primarySpecialty from the primary taxonomy description', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => makeNPPESResponse(VALID_NPI),
    } as Response);

    const result = await lookupNPI(VALID_NPI);
    expect(result.primarySpecialty).toBe('Internal Medicine');
  });

  it('returns practiceState from the primary taxonomy state', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => makeNPPESResponse(VALID_NPI),
    } as Response);

    const result = await lookupNPI(VALID_NPI);
    expect(result.practiceState).toBe('TX');
  });

  it('returns npiNumber and credential fields', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => makeNPPESResponse(VALID_NPI),
    } as Response);

    const result = await lookupNPI(VALID_NPI);
    expect(result.npiNumber).toBe(VALID_NPI);
    expect(result.credential).toBe('MD');
    expect(result.status).toBe('A');
  });

  it('returns found: false when NPPES returns 0 results', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => makeEmptyNPPESResponse(),
    } as Response);

    const result = await lookupNPI(VALID_NPI);
    expect(result.found).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });

  it('returns found: false with error when NPPES API returns non-200 status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({}),
    } as Response);

    const result = await lookupNPI(VALID_NPI);
    expect(result.found).toBe(false);
    expect(result.error).toMatch(/503/);
  });

  it('returns found: false with error message when fetch throws (network error)', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network failure'));

    const result = await lookupNPI(VALID_NPI);
    expect(result.found).toBe(false);
    expect(result.error).toMatch(/network failure/i);
  });

  it('falls back to location address state when taxonomy has no state', async () => {
    const responseNoTaxonomyState = {
      result_count: 1,
      results: [
        {
          number: VALID_NPI,
          basic: { first_name: 'JANE', last_name: 'SMITH', status: 'A' },
          taxonomies: [
            {
              code: '207R00000X',
              desc: 'Family Medicine',
              state: '', // no state on taxonomy
              primary: true,
            },
          ],
          addresses: [
            {
              address_purpose: 'LOCATION',
              state: 'CA',
              city: 'Los Angeles',
            },
          ],
        },
      ],
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => responseNoTaxonomyState,
    } as Response);

    const result = await lookupNPI(VALID_NPI);
    expect(result.found).toBe(true);
    // Falls back to location address state
    expect(result.practiceState).toBe('CA');
  });
});
