/**
 * Phase 8 VERF-01: Persist raw external API lookup results to verification_records.
 * Called from existing API routes (npi-lookup, sep-lookup, fsmb-check, state-board)
 * AFTER the external API returns, regardless of success or failure.
 *
 * Writes are best-effort — they never block the API route from returning success
 * to the physician. A failed audit write is logged but does not propagate.
 */

import { supabaseAdmin } from './supabaseServer';
import type {
  VerificationRecordInput,
  VerificationRecordRow,
  VerificationSource,
} from './verificationTypes';

/**
 * Insert one verification_records row. Returns the inserted row id on success,
 * null on failure. NEVER throws — audit writes must not fail the parent operation.
 */
export async function recordLookup(
  input: VerificationRecordInput,
): Promise<string | null> {
  if (!supabaseAdmin) {
    console.error(
      '[verificationRecordService] supabaseAdmin not configured — lookup not persisted',
      {
        physicianId: input.physicianId,
        source: input.source,
      },
    );
    return null;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('verification_records')
      .insert({
        physician_id: input.physicianId,
        source: input.source,
        related_table: input.relatedTable ?? null,
        related_id: input.relatedId ?? null,
        lookup_input: input.lookupInput,
        raw_response: input.rawResponse,
        result_status: input.resultStatus,
        summary: input.summary ?? null,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[verificationRecordService] insert failed', {
        physicianId: input.physicianId,
        source: input.source,
        error: error.message,
      });
      return null;
    }

    return data?.id ?? null;
  } catch (err) {
    console.error('[verificationRecordService] exception', err);
    return null;
  }
}

/** Fetch the most recent verification_record for a physician + source pair. */
export async function getLatestRecord(
  physicianId: string,
  source: VerificationSource,
): Promise<VerificationRecordRow | null> {
  if (!supabaseAdmin) return null;

  try {
    const { data, error } = await supabaseAdmin
      .from('verification_records')
      .select('*')
      .eq('physician_id', physicianId)
      .eq('source', source)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[verificationRecordService.getLatestRecord] error', error.message);
      return null;
    }
    return (data as VerificationRecordRow | null) ?? null;
  } catch (err) {
    console.error('[verificationRecordService.getLatestRecord] exception', err);
    return null;
  }
}

/** List all verification records for a physician (admin view in Phase 9). */
export async function listRecordsForPhysician(
  physicianId: string,
): Promise<VerificationRecordRow[]> {
  if (!supabaseAdmin) return [];

  try {
    const { data, error } = await supabaseAdmin
      .from('verification_records')
      .select('*')
      .eq('physician_id', physicianId)
      .order('recorded_at', { ascending: false });

    if (error) {
      console.error(
        '[verificationRecordService.listRecordsForPhysician] error',
        error.message,
      );
      return [];
    }
    return (data ?? []) as VerificationRecordRow[];
  } catch (err) {
    console.error('[verificationRecordService.listRecordsForPhysician] exception', err);
    return [];
  }
}
