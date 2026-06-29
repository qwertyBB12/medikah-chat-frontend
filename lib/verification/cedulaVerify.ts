/**
 * Cédula-verification write builder (Cédula Verification Cockpit, slice 3).
 *
 * Translates a human admin's confirm/reject decision into the exact rows we
 * persist: an append-only `verification_records` audit row and a
 * `physician_licenses` badge flip. The AI (parse + name match) only RECOMMENDS;
 * the admin's decision is what this records — there is no auto-approve path.
 *
 * Pure: `now` is injected so the audit timestamp is deterministic and testable.
 * Column values are pinned to the verified live schema (migrations 013 + 016):
 *  - verification_records.source          free TEXT  → 'rnp_manual'
 *  - verification_records.result_status   free TEXT  → 'found' | 'not_found'
 *  - physician_licenses.verification_status            → 'verified' | 'failed'
 *  - physician_licenses.verification_source free TEXT → 'rnp_manual'
 */

import type { ConstanciaFields } from './constanciaParse';
import type { NameMatchResult } from './cedulaNameMatch';

/** Stable identifier for the manual RNP/Constancia review path. */
export const RNP_MANUAL_SOURCE = 'rnp_manual';

export type CedulaDecision = 'verified' | 'rejected';

export interface CedulaCommitInput {
  /** physicians.id of the doctor under review. */
  physicianId: string;
  /** physician_licenses.id of the cédula row being verified. */
  licenseId: string;
  /** The admin's terminal decision after reviewing the Constancia. */
  decision: CedulaDecision;
  /** Cédula number the admin checked on the RNP. */
  cedula: string;
  /** ISO country of the cédula (e.g. 'MX'). */
  pais: string;
  /** Email of the admin who reviewed (the legal verifier). */
  reviewerEmail: string;
  /** Fields parsed from the Constancia. */
  fields: ConstanciaFields;
  /** Name-match verdict between the Constancia and the doctor's profile. */
  match: NameMatchResult;
  /** Storage path of the filed Constancia, or null if no evidence was stored. */
  evidencePath: string | null;
  /** Whether the fields came from the text parse or the vision fallback. */
  source: 'text' | 'vision';
}

/** Row shape for an INSERT into verification_records (matches the live columns). */
export interface VerificationRecordInsert {
  physician_id: string;
  source: typeof RNP_MANUAL_SOURCE;
  related_table: 'physician_licenses';
  related_id: string;
  lookup_input: { cedula: string; pais: string; reviewer: string };
  raw_response: { fields: ConstanciaFields; source: 'text' | 'vision'; match: NameMatchResult };
  result_status: 'found' | 'not_found';
  summary: {
    verdict: NameMatchResult['verdict'];
    score: number;
    decision: CedulaDecision;
    evidence_path: string | null;
    reviewer: string;
    reviewed_at: string;
  };
}

/** Partial UPDATE for physician_licenses (verification tracking columns only). */
export interface LicenseVerificationUpdate {
  verification_status: 'verified' | 'failed';
  verified_at: string;
  verification_source: typeof RNP_MANUAL_SOURCE;
}

export interface CedulaWrites {
  record: VerificationRecordInsert;
  licenseUpdate: LicenseVerificationUpdate;
}

/**
 * Build the audit row + license update for a committed cédula decision.
 * `now` is an ISO timestamp supplied by the caller.
 */
export function buildCedulaWrites(input: CedulaCommitInput, now: string): CedulaWrites {
  const confirmed = input.decision === 'verified';

  const record: VerificationRecordInsert = {
    physician_id: input.physicianId,
    source: RNP_MANUAL_SOURCE,
    related_table: 'physician_licenses',
    related_id: input.licenseId,
    lookup_input: { cedula: input.cedula, pais: input.pais, reviewer: input.reviewerEmail },
    raw_response: { fields: input.fields, source: input.source, match: input.match },
    result_status: confirmed ? 'found' : 'not_found',
    summary: {
      verdict: input.match.verdict,
      score: input.match.score,
      decision: input.decision,
      evidence_path: input.evidencePath,
      reviewer: input.reviewerEmail,
      reviewed_at: now,
    },
  };

  const licenseUpdate: LicenseVerificationUpdate = {
    verification_status: confirmed ? 'verified' : 'failed',
    verified_at: now,
    verification_source: RNP_MANUAL_SOURCE,
  };

  return { record, licenseUpdate };
}
