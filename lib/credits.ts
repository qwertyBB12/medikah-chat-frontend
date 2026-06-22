/**
 * lib/credits.ts — CONACEM credit-award helpers (Phase 26 HAB-03 / CERT-04 / CERT-05)
 *
 * These helpers wrap the Supabase SECURITY DEFINER RPCs defined in
 * 030_credit_hours.sql. They are SERVER-SIDE ONLY — import from API routes,
 * never from client-side React.
 *
 * All writes are service-role only (supabaseAdmin). The GRANT on award_credit
 * and award_cdmx_attendance is restricted to service_role at the DB level; any
 * call made with the anon or authenticated key will be rejected by Postgres.
 *
 * CONACEM: 1 punto = 1 hora académica. Rates are the caller's responsibility.
 */

import { supabaseAdmin } from './supabaseServer';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AwardCreditParams {
  physicianId: string;
  /** Source slug — e.g. 'cdmx-attendance', 'online-module', 'congress-2026'. */
  source: string;
  /** Normalized credit-hour count (the canonical value that feeds totals). */
  creditHours: number;
  /** CONACEM puntos awarded (1 punto = 1 hora). Pass null if not applicable. */
  puntos?: number | null;
  /**
   * Whether this award passes the assessment gate (CERT-03).
   * Only pass_flag=true rows count toward totals in physician_credit_summary.
   * Default: false (safe default — callers must explicitly opt in to pass).
   */
  passFlag?: boolean;
  /** Human-readable label for the activity. */
  activity?: string | null;
}

export interface AwardCreditResult {
  /** UUID of the new physician_credit_logs row. */
  logId: string;
}

export interface AwardCdmxResult {
  /**
   * true = credit was newly awarded.
   * false + alreadyAwarded = physician already had a cdmx-attendance row (idempotent no-op).
   */
  awarded: boolean;
  alreadyAwarded: boolean;
  logId: string;
  creditHours: number;
  source: string;
}

export interface CreditSummaryRow {
  physicianId: string;
  totalCreditHours: number;
  bySource: Record<string, number>;
  passAwardCount: number;
  lastAwardedAt: string | null;
  target: number;
  certificateState: 'in_progress' | 'eligible' | 'issued';
  certificateLevel: number;
  avalIssuer: string | null;
  coIssuer: string | null;
}

// ---------------------------------------------------------------------------
// Core award function (wraps the award_credit SECURITY DEFINER RPC)
// ---------------------------------------------------------------------------

/**
 * Award credit hours to a physician.
 *
 * Calls the award_credit RPC (SECURITY DEFINER, service_role only).
 * Atomically inserts a physician_credit_logs row and upserts
 * physician_certification_progress.
 *
 * @throws Error if supabaseAdmin is not configured or the RPC returns an error.
 */
export async function awardCredit(params: AwardCreditParams): Promise<AwardCreditResult> {
  if (!supabaseAdmin) {
    throw new Error('supabaseAdmin not configured — SUPABASE_SERVICE_ROLE_KEY missing');
  }

  const { data, error } = await supabaseAdmin.rpc('award_credit', {
    p_physician_id: params.physicianId,
    p_source:       params.source,
    p_credit_hours: params.creditHours,
    p_puntos:       params.puntos ?? null,
    p_pass_flag:    params.passFlag ?? false,
    p_activity:     params.activity ?? null,
  });

  if (error) {
    throw new Error(`award_credit RPC failed: ${error.message}`);
  }

  // The RPC returns a UUID (the new log row id).
  return { logId: data as string };
}

// ---------------------------------------------------------------------------
// CDMX attendance award (wraps the award_cdmx_attendance SECURITY DEFINER RPC)
// ---------------------------------------------------------------------------

/**
 * Award the CDMX inaugural-event attendance credit (4 credit-hours, pass_flag=true).
 *
 * IDEMPOTENT: a second call for the same physicianId is a no-op.
 * Returns { awarded: false, alreadyAwarded: true } without double-counting.
 *
 * Calls the award_cdmx_attendance RPC (SECURITY DEFINER, service_role only).
 *
 * @throws Error if supabaseAdmin is not configured or the RPC returns an error.
 */
export async function awardCdmxAttendance(physicianId: string): Promise<AwardCdmxResult> {
  if (!supabaseAdmin) {
    throw new Error('supabaseAdmin not configured — SUPABASE_SERVICE_ROLE_KEY missing');
  }

  const { data, error } = await supabaseAdmin.rpc('award_cdmx_attendance', {
    p_physician_id: physicianId,
  });

  if (error) {
    throw new Error(`award_cdmx_attendance RPC failed: ${error.message}`);
  }

  // The RPC returns a JSONB object.
  const result = data as {
    awarded: boolean;
    already_awarded: boolean;
    log_id: string;
    credit_hours: number;
    source: string;
  };

  return {
    awarded:        result.awarded,
    alreadyAwarded: result.already_awarded,
    logId:          result.log_id,
    creditHours:    result.credit_hours,
    source:         result.source,
  };
}

// ---------------------------------------------------------------------------
// Credit summary read (reads physician_credit_summary VIEW)
// ---------------------------------------------------------------------------

/**
 * Fetch the credit summary for a physician.
 *
 * Reads from the physician_credit_summary VIEW (pass_flag=true rows only —
 * the CERT-03 gate is enforced in the view, not here).
 *
 * Returns null if the physician has no summary row (no credit activity yet).
 *
 * @throws Error if supabaseAdmin is not configured or the query fails.
 */
export async function getCreditSummary(physicianId: string): Promise<CreditSummaryRow | null> {
  if (!supabaseAdmin) {
    throw new Error('supabaseAdmin not configured — SUPABASE_SERVICE_ROLE_KEY missing');
  }

  const { data, error } = await supabaseAdmin
    .from('physician_credit_summary')
    .select('*')
    .eq('physician_id', physicianId)
    .maybeSingle();

  if (error) {
    throw new Error(`getCreditSummary query failed: ${error.message}`);
  }

  if (!data) return null;

  return {
    physicianId:       data.physician_id,
    totalCreditHours:  Number(data.total_credit_hours ?? 0),
    bySource:          (data.by_source as Record<string, number>) ?? {},
    passAwardCount:    Number(data.pass_award_count ?? 0),
    lastAwardedAt:     data.last_awarded_at ?? null,
    target:            Number(data.target ?? 40),
    certificateState:  data.certificate_state as CreditSummaryRow['certificateState'],
    certificateLevel:  Number(data.certificate_level ?? 0),
    avalIssuer:        data.aval_issuer ?? null,
    coIssuer:          data.co_issuer ?? null,
  };
}
