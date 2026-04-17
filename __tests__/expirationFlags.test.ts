/**
 * Tests for VERF-02: expiration_flag 90-day detection helpers.
 *
 * Mirrors the DB trigger logic in migration 016:
 *   expiration_flag := (
 *     expiration_date IS NOT NULL
 *     AND expiration_date >= CURRENT_DATE
 *     AND expiration_date <= (CURRENT_DATE + INTERVAL '90 days')
 *   )
 *
 * Boundary cases covered: null, undefined, empty string, invalid string,
 * expired (past), same-day (today), day 90 (inclusive), day 91 (exclusive),
 * far future (>90 days out).
 */

import { describe, it, expect } from 'vitest';
import {
  isWithin90Days,
  daysUntilExpiration,
  classifyExpiration,
} from '../lib/expirationFlags';

// Fixed "today" for deterministic tests — matches project's current date context.
const TODAY = new Date('2026-04-16T00:00:00Z');

// ------------------------------------------------------------------
// isWithin90Days
// ------------------------------------------------------------------

describe('isWithin90Days', () => {
  it('returns false for null input', () => {
    expect(isWithin90Days(null, TODAY)).toBe(false);
  });

  it('returns false for undefined input', () => {
    expect(isWithin90Days(undefined, TODAY)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isWithin90Days('', TODAY)).toBe(false);
  });

  it('returns false for non-date garbage string', () => {
    expect(isWithin90Days('not-a-date', TODAY)).toBe(false);
  });

  it('returns false for a past date (expired)', () => {
    expect(isWithin90Days('2025-01-01', TODAY)).toBe(false);
  });

  it('returns true when date is today (day 0)', () => {
    expect(isWithin90Days('2026-04-16', TODAY)).toBe(true);
  });

  it('returns true at day 90 (inclusive boundary)', () => {
    // 2026-04-16 + 90 days = 2026-07-15
    expect(isWithin90Days('2026-07-15', TODAY)).toBe(true);
  });

  it('returns false at day 91 (just past boundary)', () => {
    expect(isWithin90Days('2026-07-16', TODAY)).toBe(false);
  });

  it('returns false for a far-future date (>90 days)', () => {
    expect(isWithin90Days('2030-01-01', TODAY)).toBe(false);
  });
});

// ------------------------------------------------------------------
// daysUntilExpiration
// ------------------------------------------------------------------

describe('daysUntilExpiration', () => {
  it('returns the positive day count for a near-future date', () => {
    expect(daysUntilExpiration('2026-04-20', TODAY)).toBe(4);
  });

  it('returns negative day count for a past date', () => {
    expect(daysUntilExpiration('2026-04-10', TODAY)).toBe(-6);
  });

  it('returns 0 for same-day', () => {
    expect(daysUntilExpiration('2026-04-16', TODAY)).toBe(0);
  });

  it('returns null for null input', () => {
    expect(daysUntilExpiration(null, TODAY)).toBeNull();
  });

  it('returns null for invalid string', () => {
    expect(daysUntilExpiration('not-a-date', TODAY)).toBeNull();
  });
});

// ------------------------------------------------------------------
// classifyExpiration
// ------------------------------------------------------------------

describe('classifyExpiration', () => {
  it('returns "none" for null input (lifetime cedula case)', () => {
    expect(classifyExpiration(null, TODAY)).toBe('none');
  });

  it('returns "none" for invalid input', () => {
    expect(classifyExpiration('garbage', TODAY)).toBe('none');
  });

  it('returns "expired" for a past date', () => {
    expect(classifyExpiration('2025-01-01', TODAY)).toBe('expired');
  });

  it('returns "within_90_days" for today', () => {
    expect(classifyExpiration('2026-04-16', TODAY)).toBe('within_90_days');
  });

  it('returns "within_90_days" for a date 15 days out', () => {
    expect(classifyExpiration('2026-05-01', TODAY)).toBe('within_90_days');
  });

  it('returns "within_90_days" at day 90 boundary', () => {
    expect(classifyExpiration('2026-07-15', TODAY)).toBe('within_90_days');
  });

  it('returns "future" at day 91 (just outside window)', () => {
    expect(classifyExpiration('2026-07-16', TODAY)).toBe('future');
  });

  it('returns "future" for a far-future date', () => {
    expect(classifyExpiration('2030-01-01', TODAY)).toBe('future');
  });
});
