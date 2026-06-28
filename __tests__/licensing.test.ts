import { describe, it, expect } from 'vitest';
import { toggleCountry } from '../lib/licensing';

describe('toggleCountry (Annotation 1 — multi-select licensure)', () => {
  it('adds a country when not present', () => {
    expect(toggleCountry([], 'US')).toEqual(['US']);
    expect(toggleCountry(['US'], 'MX')).toEqual(['US', 'MX']);
  });

  it('removes a country when already present', () => {
    expect(toggleCountry(['US', 'MX'], 'US')).toEqual(['MX']);
    expect(toggleCountry(['MX'], 'MX')).toEqual([]);
  });

  it('always returns canonical US-before-MX order', () => {
    expect(toggleCountry(['MX'], 'US')).toEqual(['US', 'MX']);
  });

  it('dedupes a country that appears twice in the input', () => {
    expect(toggleCountry(['US', 'US'], 'MX')).toEqual(['US', 'MX']);
  });
});
