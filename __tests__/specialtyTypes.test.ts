import { describe, it, expect } from 'vitest';
import type { PhysicianSpecialty } from '../lib/specialtyTypes';
import { isPubliclyVisibleSpecialty } from '../lib/specialtyTypes';

describe('PhysicianSpecialty shape + visibility gate (Phase B1)', () => {
  it('constructs a board-certified primary specialty', () => {
    const s: PhysicianSpecialty = {
      country: 'US', name: 'Internal Medicine', role: 'primary',
      boardCertified: true, certifyingBoard: 'ABIM', expirationYear: 2030,
      verificationStatus: 'verified', verificationSource: 'npi_registry',
    };
    expect(s.role).toBe('primary');
    expect(s.boardCertified).toBe(true);
  });

  it('isPubliclyVisibleSpecialty requires verified AND toggle on', () => {
    const verified: PhysicianSpecialty = {
      country: 'US', name: 'Cardiology', role: 'subspecialty',
      boardCertified: false, verificationStatus: 'verified',
    };
    const pending: PhysicianSpecialty = { ...verified, verificationStatus: 'pending' };
    expect(isPubliclyVisibleSpecialty(verified, true)).toBe(true);
    expect(isPubliclyVisibleSpecialty(verified, false)).toBe(false); // toggle off
    expect(isPubliclyVisibleSpecialty(pending, true)).toBe(false); // not verified
  });
});
