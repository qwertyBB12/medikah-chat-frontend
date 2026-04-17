/**
 * Phase 8 VERF-03: Read access to consejo_recertification_thresholds reference table.
 * Values are NEVER hardcoded in source — all reads go through this service.
 */

import { supabaseAdmin } from './supabaseServer';
import type { ConsejoThreshold } from './verificationTypes';

/** Look up threshold data for a Consejo by name. Returns null if unknown. */
export async function getThreshold(
  consejoName: string,
): Promise<ConsejoThreshold | null> {
  if (!supabaseAdmin) return null;
  if (!consejoName || consejoName.trim() === '') return null;

  try {
    const { data, error } = await supabaseAdmin
      .from('consejo_recertification_thresholds')
      .select('consejo_name, threshold_spec, cycle_years, source_url, notes')
      .eq('consejo_name', consejoName.trim())
      .maybeSingle();

    if (error) {
      console.error('[consejoThresholds.getThreshold] error', error.message);
      return null;
    }
    if (!data) return null;

    return {
      consejoName: data.consejo_name,
      thresholdSpec:
        (data.threshold_spec as ConsejoThreshold['thresholdSpec']) ?? {},
      cycleYears: data.cycle_years ?? null,
      sourceUrl: data.source_url ?? null,
      notes: data.notes ?? null,
    };
  } catch (err) {
    console.error('[consejoThresholds.getThreshold] exception', err);
    return null;
  }
}

/**
 * Client/server check: is a Consejo certification due for recertification?
 * Mirrors the DB function is_consejo_recertification_due() for app-layer use.
 * Returns null when threshold data is unknown (UI should show "unknown — manual review").
 */
export async function isRecertificationDue(
  consejoName: string,
  lastRecertificationYear: number | null,
): Promise<boolean | null> {
  if (lastRecertificationYear == null) return null;
  const threshold = await getThreshold(consejoName);
  if (!threshold || threshold.cycleYears == null) return null;

  const currentYear = new Date().getUTCFullYear();
  return lastRecertificationYear + threshold.cycleYears <= currentYear;
}
