/**
 * Admin credential review (B3) — pure validation/mapping for approving or
 * rejecting the canonical specialty / education rows a physician self-enters.
 *
 * Those rows land at verification_status='pending' and the public page (B2
 * derive-at-read) shows only 'verified', so without an admin decision path a new
 * physician's specialty/education would never appear. An admin approve flips the
 * row to 'verified' (publicly visible); reject flips it to 'rejected' (stays
 * hidden, but records an explicit denial rather than leaving it pending).
 *
 * Kept pure + tested so the endpoint's guards (which table, which status) can't
 * drift from what the DB CHECK constraints allow (see migration 038).
 */

export const REVIEWABLE_TABLES = ['physician_specialties', 'physician_education'] as const;
export type ReviewableTable = (typeof REVIEWABLE_TABLES)[number];

export type CredentialDecisionAction = 'approve' | 'reject';

/** A self-declared row is reviewable only in the two canonical credential stores. */
export function isReviewableTable(value: unknown): value is ReviewableTable {
  return typeof value === 'string' && (REVIEWABLE_TABLES as readonly string[]).includes(value);
}

/**
 * Map an admin action to the verification_status to write. Returns null for any
 * unrecognized action so the endpoint can 400 rather than write a bad value.
 */
export function decisionToStatus(action: unknown): 'verified' | 'rejected' | null {
  if (action === 'approve') return 'verified';
  if (action === 'reject') return 'rejected';
  return null;
}
