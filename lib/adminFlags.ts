/**
 * Phase 9 ADMN-02: Canonical registry of admin flag categories surfaced on the
 * physicians list and dashboard. Used by:
 *   - pages/api/admin/physicians.ts to compute per-physician flag_counts
 *   - pages/api/admin/physicians.ts to filter by ?flag=<key>
 *   - pages/admin/physicians.tsx to render the chip bar with counts
 *
 * Adding a new flag: extend AdminFlagKey, add a label, and add a SQL predicate
 * branch in pages/api/admin/physicians.ts (computeFlagsForPhysician + flag-filter switch).
 */

export type AdminFlagKey =
  | 'incomplete_profile'        // ADMN-02: missing core fields, no verification_status set
  | 'unverified_credentials'    // ADMN-02: any license/cert with verification_status in ('pending','manual_review')
  | 'expiring_90d'              // ADMN-02: any license/cert with expiration_flag = TRUE
  | 'consejo_recert_due'        // ADMN-02: any consejo cert where is_consejo_recertification_due = TRUE
  | 'disciplinary_found'        // ADMN-02: any verification_record with source='fsmb' and disciplinary action found
  | 'manual_review_pending';    // ADMN-02: any license/cert with manual_review_required = TRUE

export const ADMIN_FLAG_KEYS: readonly AdminFlagKey[] = [
  'incomplete_profile',
  'unverified_credentials',
  'expiring_90d',
  'consejo_recert_due',
  'disciplinary_found',
  'manual_review_pending',
] as const;

export const ADMIN_FLAG_LABELS: Record<AdminFlagKey, string> = {
  incomplete_profile: 'Incomplete Profile',
  unverified_credentials: 'Unverified Credentials',
  expiring_90d: 'Expiring (≤90 days)',
  consejo_recert_due: 'Consejo Recert Due',
  disciplinary_found: 'Disciplinary Action',
  manual_review_pending: 'Manual Review',
};

/** Severity tier for Tailwind class selection in the UI (Plan 09-02). */
export const ADMIN_FLAG_SEVERITY: Record<AdminFlagKey, 'amber' | 'garnet'> = {
  incomplete_profile: 'amber',
  unverified_credentials: 'amber',
  expiring_90d: 'amber',
  consejo_recert_due: 'amber',
  disciplinary_found: 'garnet',
  manual_review_pending: 'garnet',
};

/** Per-physician flag-count map returned by the list API. */
export type FlagCounts = Record<AdminFlagKey, number>;

/** Aggregate flag-bucket totals used by the chip bar at the top of the list. */
export type FlagSummary = Record<AdminFlagKey, number>;

export function emptyFlagCounts(): FlagCounts {
  return {
    incomplete_profile: 0,
    unverified_credentials: 0,
    expiring_90d: 0,
    consejo_recert_due: 0,
    disciplinary_found: 0,
    manual_review_pending: 0,
  };
}

/** Type guard for query-param validation in API routes. */
export function isAdminFlagKey(value: unknown): value is AdminFlagKey {
  return typeof value === 'string' && (ADMIN_FLAG_KEYS as readonly string[]).includes(value);
}
