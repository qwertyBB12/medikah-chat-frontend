import { describe, it, expect } from 'vitest';
import type { PhysicianEducation } from '../lib/educationTypes';
import { isPubliclyVisibleEducation } from '../lib/educationTypes';

describe('PhysicianEducation shape + visibility gate (Phase B2 — Education)', () => {
  it('constructs a medical-school entry (single, grad year in endYear)', () => {
    const e: PhysicianEducation = {
      kind: 'medical_school',
      institution: 'Harvard Medical School',
      country: 'United States',
      endYear: 2008,
      verificationStatus: 'verified',
      verificationSource: 'migration',
    };
    expect(e.kind).toBe('medical_school');
    expect(e.endYear).toBe(2008);
  });

  it('constructs a residency entry (institution + specialty + years)', () => {
    const e: PhysicianEducation = {
      kind: 'residency',
      institution: 'Mass General',
      specialty: 'Internal Medicine',
      startYear: 2008,
      endYear: 2011,
      verificationStatus: 'manual_review',
    };
    expect(e.kind).toBe('residency');
    expect(e.specialty).toBe('Internal Medicine');
  });

  it('isPubliclyVisibleEducation requires verified AND toggle on', () => {
    const verified: PhysicianEducation = {
      kind: 'fellowship',
      institution: 'Cleveland Clinic',
      specialty: 'Cardiology',
      verificationStatus: 'verified',
    };
    const pending: PhysicianEducation = { ...verified, verificationStatus: 'pending' };
    expect(isPubliclyVisibleEducation(verified, true)).toBe(true);
    expect(isPubliclyVisibleEducation(verified, false)).toBe(false); // toggle off
    expect(isPubliclyVisibleEducation(pending, true)).toBe(false); // not verified
  });
});
