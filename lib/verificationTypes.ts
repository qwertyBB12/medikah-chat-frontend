/**
 * Phase 8 Verification Engine & Compliance — shared type definitions.
 * Maps to migration 016: verification_records, credential_audit_log,
 * consejo_recertification_thresholds, and the manual_review_required /
 * expiration_flag columns on physician_licenses and physician_certifications.
 */

/** Which external API produced a verification record. */
export type VerificationSource =
  | 'npi_registry'
  | 'sep_cedula'
  | 'fsmb'
  | 'state_medical_board'
  | 'cofepris_api'
  | 'manual';

/** Derived classification of an API lookup outcome. */
export type VerificationResultStatus = 'found' | 'not_found' | 'error' | 'timeout';

/** Credential table targeted by an audit or verification record. */
export type CredentialTable = 'physician_licenses' | 'physician_certifications' | 'physicians';

/** Change type recorded in credential_audit_log. */
export type CredentialChangeType = 'create' | 'update' | 'delete';

/** Who performed an auditable change. */
export type ActorRole = 'physician' | 'system' | 'admin';

/** Reason a credential was flagged for manual review (VERF-04). */
export type ManualReviewReason =
  | 'api_unavailable'
  | 'api_returned_not_found'
  | 'name_mismatch'
  | 'disciplinary_action_found'
  | 'data_discrepancy'
  | 'unsupported_country'
  | 'admin_override';

/** Input passed to verificationRecordService.recordLookup. */
export interface VerificationRecordInput {
  physicianId: string;
  source: VerificationSource;
  relatedTable?: CredentialTable | null;
  relatedId?: string | null;
  /** e.g., { npiNumber: '1234567890' } */
  lookupInput: Record<string, unknown>;
  /** Full external API response */
  rawResponse: Record<string, unknown>;
  resultStatus: VerificationResultStatus;
  summary?: Record<string, unknown> | null;
}

/** Row shape returned from SELECT on verification_records. */
export interface VerificationRecordRow {
  id: string;
  physician_id: string;
  source: VerificationSource;
  related_table: CredentialTable | null;
  related_id: string | null;
  lookup_input: Record<string, unknown>;
  raw_response: Record<string, unknown>;
  result_status: VerificationResultStatus;
  summary: Record<string, unknown> | null;
  /** ISO timestamp */
  recorded_at: string;
}

/** Input for credentialAuditService.logChange. */
export interface CredentialAuditEntry {
  physicianId: string;
  /** session.user.email (lowercased) or 'system' if not a human */
  actorEmail: string;
  actorRole: ActorRole;
  targetTable: CredentialTable;
  targetId: string;
  fieldName: string;
  /** Will be JSON.stringified into JSONB */
  oldValue: unknown;
  newValue: unknown;
  changeType: CredentialChangeType;
}

/** Consejo threshold data (VERF-03). */
export interface ConsejoThreshold {
  consejoName: string;
  thresholdSpec: {
    points_required?: number;
    cycle_years?: number;
    cme_required_hours?: number;
    [key: string]: unknown;
  };
  cycleYears: number | null;
  sourceUrl?: string | null;
  notes?: string | null;
}

/** Classification returned by expirationFlags.classifyExpiration. */
export type ExpirationClass = 'none' | 'future' | 'within_90_days' | 'expired';
