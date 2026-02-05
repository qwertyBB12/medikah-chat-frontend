// Verification system types

export type VerificationTier = 'tier1' | 'tier2' | 'tier3';

export type VerificationType =
  | 'license_mexico'
  | 'license_usa'
  | 'education_linkedin'
  | 'publications_scholar'
  | 'professional_presence'
  | 'board_certification'
  | 'international_credential';

export type VerificationStatus = 'pending' | 'verified' | 'failed' | 'manual_review' | 'rejected';

export type VerificationMethod =
  | 'cofepris_api'
  | 'state_medical_board'
  | 'linkedin_match'
  | 'scholar_fetch'
  | 'manual_review';

export type ManualReviewType =
  | 'license_not_found'
  | 'international_credential'
  | 'data_discrepancy'
  | 'board_certification';

export type ReviewPriority = 'urgent' | 'high' | 'normal' | 'low';

export type ReviewStatus = 'pending' | 'in_progress' | 'approved' | 'rejected' | 'escalated';

// Credential reference for tracking which credential was verified
export interface CredentialReference {
  licenseIndex?: number;
  country?: string;
  countryCode?: string;
  number?: string;
  state?: string;
  certificationIndex?: number;
  board?: string;
}

// Discrepancy found during verification
export interface VerificationDiscrepancy {
  field: string;
  submitted: string | number | null;
  found: string | number | null;
  severity: 'low' | 'medium' | 'high';
}

// Verification result record
export interface VerificationResult {
  id?: string;
  physicianId: string;
  verificationType: VerificationType;
  credentialReference?: CredentialReference;
  status: VerificationStatus;
  verificationMethod: VerificationMethod;
  externalData?: Record<string, unknown>;
  matchConfidence?: number;
  discrepancies?: VerificationDiscrepancy[];
  verifiedAt?: string;
  verifiedBy?: string;
  notes?: string;
}

// Manual review queue item
export interface ManualReviewItem {
  id?: string;
  physicianId: string;
  verificationResultId?: string;
  reviewType: ManualReviewType;
  priority: ReviewPriority;
  reviewData: Record<string, unknown>;
  reason: string;
  slaDeadline?: string;
  assignedTo?: string;
  assignedAt?: string;
  status: ReviewStatus;
  resolutionNotes?: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

// COFEPRIS API response (Mexico)
export interface CofeprisResponse {
  found: boolean;
  cedula?: string;
  nombre?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  institucion?: string;
  carrera?: string;
  anioEgreso?: number;
  tipo?: string; // 'profesional', 'especialidad', etc.
  rawResponse?: Record<string, unknown>;
}

// USA State Medical Board response
export interface StateMedicalBoardResponse {
  found: boolean;
  licenseNumber?: string;
  licenseeFullName?: string;
  licenseType?: string;
  licenseStatus?: string; // 'active', 'inactive', 'expired', 'revoked'
  issueDate?: string;
  expirationDate?: string;
  specialty?: string;
  state?: string;
  rawResponse?: Record<string, unknown>;
}

// LinkedIn profile data for verification
export interface LinkedInVerificationData {
  profileUrl?: string;
  fullName?: string;
  headline?: string;
  photoUrl?: string;
  currentPosition?: {
    title: string;
    company: string;
  };
  education?: Array<{
    school: string;
    degree?: string;
    field?: string;
    startYear?: number;
    endYear?: number;
  }>;
  rawData?: Record<string, unknown>;
}

// Google Scholar profile data
export interface ScholarVerificationData {
  profileUrl?: string;
  scholarId?: string;
  name?: string;
  affiliation?: string;
  citationCount?: number;
  hIndex?: number;
  i10Index?: number;
  publications?: Array<{
    title: string;
    authors: string;
    journal?: string;
    year?: number;
    citations?: number;
  }>;
  rawData?: Record<string, unknown>;
}

// Overall verification status for a physician
export interface PhysicianVerificationStatus {
  physicianId: string;
  overallStatus: 'pending' | 'in_progress' | 'verified' | 'partially_verified' | 'rejected';
  tier: VerificationTier | null;
  verifiedAt: string | null;
  verifiedBy: string | null;
  results: VerificationResult[];
  pendingManualReviews: number;
  summary: {
    total: number;
    verified: number;
    failed: number;
    pending: number;
    manualReview: number;
  };
}

// Verification request
export interface VerifyCredentialsRequest {
  physicianId: string;
  forceRecheck?: boolean; // Re-run verification even if already done
  specificTypes?: VerificationType[]; // Only verify specific types
}

// Verification response
export interface VerifyCredentialsResponse {
  success: boolean;
  physicianId: string;
  status: PhysicianVerificationStatus;
  message?: string;
  error?: string;
}
