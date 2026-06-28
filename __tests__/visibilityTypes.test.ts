import { describe, it, expect } from 'vitest';
import {
  DEFAULT_VISIBILITY,
  normalizeVisibility,
} from '../lib/visibilityTypes';

describe('visibility toggles (Phase B2)', () => {
  it('defaults are all-on (no regression for existing profiles)', () => {
    expect(Object.values(DEFAULT_VISIBILITY).every((v) => v === true)).toBe(true);
  });

  it('normalizeVisibility merges partial blobs over defaults', () => {
    const merged = normalizeVisibility({ phone: false, bogus: 123 });
    expect(merged.phone).toBe(false);
    expect(merged.specialty).toBe(true); // untouched -> default
    expect('bogus' in merged).toBe(false); // unknown keys dropped
  });

  it('normalizeVisibility tolerates null/garbage', () => {
    expect(normalizeVisibility(null)).toEqual(DEFAULT_VISIBILITY);
    expect(normalizeVisibility('nope')).toEqual(DEFAULT_VISIBILITY);
  });
});
