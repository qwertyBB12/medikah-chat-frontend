// @vitest-environment node

/**
 * Option A any-email onboarding — pure local-part derivation logic.
 *
 * Pins the gendered mailbox scheme (dra-/dr-) and the reserved/format guards.
 * The honorific is NEVER guessed from a name (feedback_dr_dra_title_mexico) — these
 * tests assert the derivation only ever uses the explicitly supplied title.
 */

import { describe, it, expect } from 'vitest';
import { slugifySegment, deriveLocalPart, isUsableLocalPart } from '../lib/mailcowProvisioner';

describe('slugifySegment', () => {
  it('strips diacritics and lowercases', () => {
    expect(slugifySegment('López')).toBe('lopez');
    expect(slugifySegment('Núñez')).toBe('nunez');
    expect(slugifySegment('García')).toBe('garcia');
  });

  it('collapses non-alphanumerics to single hyphens and trims', () => {
    expect(slugifySegment('  Saint-Exupéry ')).toBe('saint-exupery');
    expect(slugifySegment("O'Brien")).toBe('o-brien');
  });

  it('returns empty string for empty input', () => {
    expect(slugifySegment('')).toBe('');
  });
});

describe('deriveLocalPart', () => {
  it('uses dra- for Doctora and dr- for Doctor', () => {
    expect(deriveLocalPart('Ana García', 'Dra')).toBe('dra-garcia');
    expect(deriveLocalPart('Héctor López', 'Dr')).toBe('dr-lopez');
  });

  it('takes the last meaningful token as the surname', () => {
    expect(deriveLocalPart('Juan Carlos Pérez', 'Dr')).toBe('dr-perez');
  });

  it('drops Spanish particles when picking the surname', () => {
    expect(deriveLocalPart('María de la Cruz', 'Dra')).toBe('dra-cruz');
  });

  it('handles a single-name input', () => {
    expect(deriveLocalPart('Madonna', 'Dra')).toBe('dra-madonna');
  });

  it('returns empty string when no usable token exists', () => {
    expect(deriveLocalPart('   ', 'Dr')).toBe('');
    expect(deriveLocalPart('', 'Dra')).toBe('');
  });

  it('never produces a gendered prefix the caller did not ask for', () => {
    // Same name, opposite titles → opposite prefixes, nothing inferred from the name.
    expect(deriveLocalPart('Alex Smith', 'Dr')).toBe('dr-smith');
    expect(deriveLocalPart('Alex Smith', 'Dra')).toBe('dra-smith');
  });
});

describe('isUsableLocalPart', () => {
  it('accepts well-formed local-parts', () => {
    expect(isUsableLocalPart('dr-lopez')).toBe(true);
    expect(isUsableLocalPart('dra-garcia2')).toBe(true);
    expect(isUsableLocalPart('a.b_c-d')).toBe(true);
  });

  it('rejects reserved local-parts', () => {
    expect(isUsableLocalPart('admin')).toBe(false);
    expect(isUsableLocalPart('postmaster')).toBe(false);
    expect(isUsableLocalPart('medikah')).toBe(false);
  });

  it('rejects bad formats and overlong values', () => {
    expect(isUsableLocalPart('Dr Lopez')).toBe(false); // space + uppercase
    expect(isUsableLocalPart('josé')).toBe(false); // non-ascii
    expect(isUsableLocalPart('')).toBe(false);
    expect(isUsableLocalPart('a'.repeat(65))).toBe(false);
  });
});
