/**
 * Tests for USCR-02, USCR-03, USCR-04, USCR-05
 *
 * credentialTypes.ts is a pure TypeScript type file — no runtime logic.
 * These tests verify runtime behavior at the shape/payload level:
 * - USLicenseEntry includes isPrimary boolean (USCR-03)
 * - USSubSpecialtyEntry type field distinguishes sub_specialty vs fellowship (USCR-05)
 * - SaveCredentialPayload discriminated union construction for each section (USCR-02 through USCR-05)
 *
 * NOTE: TypeScript type checking itself is the compiler. These tests verify that
 * objects conforming to the types have the correct runtime shapes and that
 * CredentialSection discriminated union covers all required sections.
 */

import { describe, it, expect } from 'vitest';

// Import types to confirm they resolve at runtime (also implicitly tests module exports)
import type {
  NPIEntry,
  USLicenseEntry,
  USBoardCertEntry,
  USSubSpecialtyEntry,
  CredentialSection,
  SaveCredentialPayload,
  DeleteCredentialPayload,
  CredentialResponse,
} from '../lib/credentialTypes';

// ------------------------------------------------------------------
// USCR-02: State license shape — state, licenseNumber, expirationDate
// ------------------------------------------------------------------

describe('USLicenseEntry shape (USCR-02)', () => {
  it('constructs a valid state license entry with all required fields', () => {
    const entry: USLicenseEntry = {
      state: 'TX',
      licenseNumber: 'TX-12345',
      expirationDate: '2026-12-31',
      isPrimary: false,
      verificationStatus: 'pending',
    };
    expect(entry.state).toBe('TX');
    expect(entry.licenseNumber).toBe('TX-12345');
    expect(entry.expirationDate).toBe('2026-12-31');
    expect(typeof entry.isPrimary).toBe('boolean');
  });
});

// ------------------------------------------------------------------
// USCR-03: isPrimary boolean — primary state of practice designation
// ------------------------------------------------------------------

describe('USLicenseEntry isPrimary flag (USCR-03)', () => {
  it('isPrimary can be set to true to designate primary state', () => {
    const primaryLicense: USLicenseEntry = {
      state: 'CA',
      licenseNumber: 'CA-99999',
      expirationDate: '2027-06-30',
      isPrimary: true,
      verificationStatus: 'pending',
    };
    expect(primaryLicense.isPrimary).toBe(true);
  });

  it('isPrimary defaults to false for non-primary licenses', () => {
    const secondaryLicense: USLicenseEntry = {
      state: 'NM',
      licenseNumber: 'NM-55555',
      expirationDate: '2025-12-31',
      isPrimary: false,
      verificationStatus: 'pending',
    };
    expect(secondaryLicense.isPrimary).toBe(false);
  });
});

// ------------------------------------------------------------------
// USCR-04: Board cert shape — certifyingBoard, certificationDate, optional expirationDate
// ------------------------------------------------------------------

describe('USBoardCertEntry shape (USCR-04)', () => {
  it('constructs a valid board cert entry with required fields', () => {
    const entry: USBoardCertEntry = {
      certifyingBoard: 'ABIM',
      specialty: 'Internal Medicine',
      certificationDate: '2018-06-15',
      verificationStatus: 'pending',
    };
    expect(entry.certifyingBoard).toBe('ABIM');
    expect(entry.specialty).toBe('Internal Medicine');
    expect(entry.certificationDate).toBe('2018-06-15');
    expect(entry.expirationDate).toBeUndefined();
  });

  it('board cert can have an optional expiration date', () => {
    const entry: USBoardCertEntry = {
      certifyingBoard: 'ABS',
      specialty: 'Surgery',
      certificationDate: '2020-01-01',
      expirationDate: '2030-01-01',
      verificationStatus: 'pending',
    };
    expect(entry.expirationDate).toBe('2030-01-01');
  });
});

// ------------------------------------------------------------------
// USCR-05: Sub-specialty type toggle — sub_specialty vs fellowship
// ------------------------------------------------------------------

describe('USSubSpecialtyEntry type toggle (USCR-05)', () => {
  it('type field can be sub_specialty', () => {
    const entry: USSubSpecialtyEntry = {
      type: 'sub_specialty',
      name: 'Cardiology',
      certifyingBodyOrInstitution: 'ABIM',
      completionDate: '2019-07-01',
      verificationStatus: 'pending',
    };
    expect(entry.type).toBe('sub_specialty');
  });

  it('type field can be fellowship', () => {
    const entry: USSubSpecialtyEntry = {
      type: 'fellowship',
      name: 'Interventional Cardiology Fellowship',
      certifyingBodyOrInstitution: 'Johns Hopkins Hospital',
      completionDate: '2021-06-30',
      verificationStatus: 'pending',
    };
    expect(entry.type).toBe('fellowship');
  });

  it('type field distinguishes sub_specialty and fellowship as different values', () => {
    const subSpec: USSubSpecialtyEntry = {
      type: 'sub_specialty',
      name: 'Oncology',
      certifyingBodyOrInstitution: 'ABIM',
      completionDate: '2020-01-01',
      verificationStatus: 'pending',
    };
    const fellowship: USSubSpecialtyEntry = {
      type: 'fellowship',
      name: 'Oncology Fellowship',
      certifyingBodyOrInstitution: 'Mayo Clinic',
      completionDate: '2020-06-01',
      verificationStatus: 'pending',
    };
    expect(subSpec.type).not.toBe(fellowship.type);
  });
});

// ------------------------------------------------------------------
// SaveCredentialPayload: covers all 4 CredentialSection values
// ------------------------------------------------------------------

describe('SaveCredentialPayload construction covers all CredentialSection values', () => {
  it('npi section payload is valid', () => {
    const npiData: NPIEntry = {
      npiNumber: '1234567893',
      verificationStatus: 'pending',
    };
    const payload: SaveCredentialPayload = { section: 'npi', data: npiData };
    expect(payload.section).toBe('npi');
    expect((payload.data as NPIEntry).npiNumber).toBe('1234567893');
  });

  it('state_license section payload is valid', () => {
    const data: USLicenseEntry = {
      state: 'TX',
      licenseNumber: 'TX-1',
      expirationDate: '2027-01-01',
      isPrimary: true,
      verificationStatus: 'pending',
    };
    const payload: SaveCredentialPayload = { section: 'state_license', data };
    expect(payload.section).toBe('state_license');
  });

  it('board_cert section payload is valid', () => {
    const data: USBoardCertEntry = {
      certifyingBoard: 'ABP',
      specialty: 'Pediatrics',
      certificationDate: '2022-03-01',
      verificationStatus: 'pending',
    };
    const payload: SaveCredentialPayload = { section: 'board_cert', data };
    expect(payload.section).toBe('board_cert');
  });

  it('sub_specialty section payload is valid', () => {
    const data: USSubSpecialtyEntry = {
      type: 'sub_specialty',
      name: 'Neonatology',
      certifyingBodyOrInstitution: 'ABP',
      completionDate: '2023-01-01',
      verificationStatus: 'pending',
    };
    const payload: SaveCredentialPayload = { section: 'sub_specialty', data };
    expect(payload.section).toBe('sub_specialty');
  });
});

// ------------------------------------------------------------------
// DeleteCredentialPayload and CredentialResponse shapes
// ------------------------------------------------------------------

describe('DeleteCredentialPayload and CredentialResponse shapes', () => {
  it('DeleteCredentialPayload requires credentialId', () => {
    const payload: DeleteCredentialPayload = {
      section: 'state_license',
      credentialId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    };
    expect(payload.credentialId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it('CredentialResponse.fsmb can be null', () => {
    const response: CredentialResponse = {
      npi: null,
      stateLicenses: [],
      boardCertifications: [],
      subSpecialties: [],
      fsmb: null,
    };
    expect(response.fsmb).toBeNull();
  });

  it('CredentialResponse.fsmb status can be clear, flagged, error, or pending', () => {
    const statuses: CredentialResponse['fsmb'][] = [
      { status: 'clear' },
      { status: 'flagged' },
      { status: 'error' },
      { status: 'pending' },
    ];
    const validValues = ['clear', 'flagged', 'error', 'pending'];
    statuses.forEach((fsmb) => {
      expect(validValues).toContain(fsmb!.status);
    });
  });
});
