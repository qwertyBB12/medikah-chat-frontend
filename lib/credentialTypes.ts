/** US credential types for Phase 5 — maps to physician_licenses and physician_certifications tables */

// Matches physician_licenses table row for license_type='npi'
export interface NPIEntry {
  id?: string;
  npiNumber: string; // 10-digit NPI
  fullName?: string; // auto-populated from NPI Registry
  primarySpecialty?: string; // auto-populated taxonomy
  practiceState?: string; // auto-populated state
  verificationStatus: 'pending' | 'verified' | 'failed' | 'manual_review';
  verifiedAt?: string;
}

// Matches physician_licenses table row for license_type='state_medical'
export interface USLicenseEntry {
  id?: string;
  state: string; // US state abbreviation: 'TX', 'CA', etc.
  licenseNumber: string;
  expirationDate: string; // ISO date string YYYY-MM-DD
  issuedDate?: string;
  isPrimary: boolean; // per USCR-03
  verificationStatus: 'pending' | 'verified' | 'failed' | 'manual_review';
}

// Matches physician_certifications table row for certification_type='board_cert'
export interface USBoardCertEntry {
  id?: string;
  certifyingBoard: string; // e.g., 'ABIM', 'ABP', 'ABS'
  specialty: string;
  certificationDate: string; // ISO date string
  expirationDate?: string; // ISO date string, nullable if lifetime
  verificationStatus: 'pending' | 'verified' | 'failed' | 'manual_review';
}

// Matches physician_certifications table row for certification_type='sub_specialty' or 'fellowship'
export interface USSubSpecialtyEntry {
  id?: string;
  type: 'sub_specialty' | 'fellowship';
  name: string; // sub-specialty or fellowship name
  certifyingBodyOrInstitution: string;
  completionDate: string; // ISO date string
  expirationDate?: string; // ISO date string, nullable
  verificationStatus: 'pending' | 'verified' | 'failed' | 'manual_review';
}

// Discriminated union for credential save operations
export type CredentialSection = 'npi' | 'state_license' | 'board_cert' | 'sub_specialty';

export interface SaveCredentialPayload {
  section: CredentialSection;
  data: NPIEntry | USLicenseEntry | USBoardCertEntry | USSubSpecialtyEntry;
}

export interface DeleteCredentialPayload {
  section: CredentialSection;
  credentialId: string;
}

// Response from GET /api/physicians/[id]/credentials
export interface CredentialResponse {
  npi: NPIEntry | null;
  stateLicenses: USLicenseEntry[];
  boardCertifications: USBoardCertEntry[];
  subSpecialties: USSubSpecialtyEntry[];
  fsmb: {
    status: 'pending' | 'clear' | 'flagged' | 'error';
    checkedAt?: string;
  } | null;
}
