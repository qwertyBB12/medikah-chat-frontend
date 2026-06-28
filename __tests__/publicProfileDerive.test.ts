import { describe, it, expect } from 'vitest';
import { derivePublicProfile, deriveContact } from '../lib/publicProfileDerive';
import type {
  DeriveSpecialtyRow,
  DeriveEducationRow,
} from '../lib/publicProfileDerive';
import { DEFAULT_VISIBILITY } from '../lib/visibilityTypes';

const specs: DeriveSpecialtyRow[] = [
  { name: 'Internal Medicine', role: 'primary', verification_status: 'verified' },
  { name: 'Cardiology', role: 'subspecialty', verification_status: 'verified' },
  { name: 'Unconfirmed Sub', role: 'subspecialty', verification_status: 'manual_review' },
];

const education: DeriveEducationRow[] = [
  {
    kind: 'medical_school',
    institution: 'Harvard Medical School',
    country: 'United States',
    specialty: null,
    start_year: null,
    end_year: 2008,
    verification_status: 'verified',
  },
  {
    kind: 'residency',
    institution: 'Mass General',
    country: null,
    specialty: 'Internal Medicine',
    start_year: 2008,
    end_year: 2011,
    verification_status: 'verified',
  },
  {
    kind: 'fellowship',
    institution: 'Cleveland Clinic',
    country: null,
    specialty: 'Cardiology',
    start_year: 2011,
    end_year: 2014,
    verification_status: 'manual_review', // not verified -> must be held back
  },
];

const flatBoardCerts = [{ board: 'ABIM', certification: 'Internal Medicine', year: 2009 }];

describe('derivePublicProfile (Phase B2 derive-at-read)', () => {
  it('NO-REGRESSION: verified physician with all toggles on shows all verified data', () => {
    const out = derivePublicProfile({
      specialties: specs,
      education,
      toggles: DEFAULT_VISIBILITY,
      flatBoardCertifications: flatBoardCerts,
    });
    expect(out.primarySpecialty).toBe('Internal Medicine');
    expect(out.subSpecialties).toEqual(['Cardiology']); // unverified sub excluded
    expect(out.medicalSchool).toBe('Harvard Medical School');
    expect(out.medicalSchoolCountry).toBe('United States');
    expect(out.graduationYear).toBe(2008);
    expect(out.residency).toEqual([
      { institution: 'Mass General', specialty: 'Internal Medicine', startYear: 2008, endYear: 2011 },
    ]);
    expect(out.fellowships).toEqual([]); // unverified fellowship held back
    expect(out.boardCertifications).toEqual(flatBoardCerts);
  });

  it('verification gate: unverified specialty/education is never shown even with toggle on', () => {
    const pendingSpecs: DeriveSpecialtyRow[] = [
      { name: 'Internal Medicine', role: 'primary', verification_status: 'pending' },
    ];
    const out = derivePublicProfile({
      specialties: pendingSpecs,
      education: [{ ...education[0], verification_status: 'pending' }],
      toggles: DEFAULT_VISIBILITY,
      flatBoardCertifications: flatBoardCerts,
    });
    expect(out.primarySpecialty).toBeNull();
    expect(out.medicalSchool).toBeNull();
    expect(out.graduationYear).toBeNull();
  });

  it('toggle gate: a toggle off hides verified data', () => {
    const out = derivePublicProfile({
      specialties: specs,
      education,
      toggles: {
        ...DEFAULT_VISIBILITY,
        specialty: false,
        subspecialties: false,
        medicalSchool: false,
        residency: false,
        certifications: false,
      },
      flatBoardCertifications: flatBoardCerts,
    });
    expect(out.primarySpecialty).toBeNull();
    expect(out.subSpecialties).toEqual([]);
    expect(out.medicalSchool).toBeNull();
    expect(out.residency).toEqual([]);
    expect(out.boardCertifications).toEqual([]); // certifications toggle off
  });

  it('empty canonical store yields empty fields (no crash)', () => {
    const out = derivePublicProfile({
      specialties: [],
      education: [],
      toggles: DEFAULT_VISIBILITY,
      flatBoardCertifications: [],
    });
    expect(out.primarySpecialty).toBeNull();
    expect(out.subSpecialties).toEqual([]);
    expect(out.medicalSchool).toBeNull();
    expect(out.residency).toEqual([]);
    expect(out.fellowships).toEqual([]);
    expect(out.boardCertifications).toEqual([]);
  });
});

describe('deriveContact (Annotation #9 source-of-truth split)', () => {
  const canonical = {
    practiceAddressLine1: '123 Medical Center Blvd, Suite 200',
    practiceAddressCity: 'Mexico City',
    practiceAddressCountry: 'Mexico',
    phoneNumber: '+52 55 1234 5678',
    officeEmail: 'doctor@clinic.com',
    appointmentUrl: 'https://calendly.com/dr',
  };

  it('address + phone come from Credentials; email + appt URL from website store', () => {
    const out = deriveContact({ ...canonical, toggles: DEFAULT_VISIBILITY });
    expect(out.officeAddress).toBe('123 Medical Center Blvd, Suite 200');
    expect(out.officeCity).toBe('Mexico City');
    expect(out.officeCountry).toBe('Mexico');
    expect(out.officePhone).toBe('+52 55 1234 5678');
    expect(out.officeEmail).toBe('doctor@clinic.com');
    expect(out.appointmentUrl).toBe('https://calendly.com/dr');
  });

  it('each field is gated by its own toggle (no verification gate — self-declared)', () => {
    const out = deriveContact({
      ...canonical,
      toggles: {
        ...DEFAULT_VISIBILITY,
        officeAddress: false,
        phone: false,
        officeEmail: false,
        appointmentUrl: false,
      },
    });
    expect(out.officeAddress).toBeNull();
    expect(out.officeCity).toBeNull();
    expect(out.officeCountry).toBeNull();
    expect(out.officePhone).toBeNull();
    expect(out.officeEmail).toBeNull();
    expect(out.appointmentUrl).toBeNull();
  });

  it('officeAddress toggle gates the whole address (line/city/country) together', () => {
    const out = deriveContact({
      ...canonical,
      toggles: { ...DEFAULT_VISIBILITY, officeAddress: false },
    });
    expect(out.officeAddress).toBeNull();
    expect(out.officeCity).toBeNull();
    expect(out.officeCountry).toBeNull();
    expect(out.officePhone).toBe('+52 55 1234 5678'); // phone unaffected
  });

  it('empty stores yield nulls, not empty strings (no crash)', () => {
    const out = deriveContact({
      practiceAddressLine1: '',
      practiceAddressCity: null,
      practiceAddressCountry: '',
      phoneNumber: null,
      officeEmail: '',
      appointmentUrl: null,
      toggles: DEFAULT_VISIBILITY,
    });
    expect(out.officeAddress).toBeNull();
    expect(out.officeCity).toBeNull();
    expect(out.officeCountry).toBeNull();
    expect(out.officePhone).toBeNull();
    expect(out.officeEmail).toBeNull();
    expect(out.appointmentUrl).toBeNull();
  });
});
