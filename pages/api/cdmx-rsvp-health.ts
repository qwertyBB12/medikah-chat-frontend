import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../lib/supabaseServer';

/**
 * Read-only health probe for the CDMX RSVP intake (`cdmx_rsvps`).
 *
 * Returns COUNTS / STATUS ONLY — never names, emails, or any row content.
 * This metadata-not-content discipline is load-bearing: the probe is consumed
 * by the `cdmx-rsvp-health` GitHub Action, and a content digest landing in a
 * CI log would be a PII exposure. Counts + a bare timestamp are safe.
 *
 * Powers the weekend launch watch: if RSVP intake silently breaks (e.g. the
 * 2026-06-09 Supabase free-tier auto-pause that NXDOMAINed the DB), the head
 * COUNT query fails → 500 → the Action fails loud → Hector is pinged.
 *
 * Watch ownership: COO desk (kah-operations Paperclip tracker).
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  if (!supabaseAdmin) {
    return res.status(500).json({ ok: false, error: 'Database not configured' });
  }

  // COUNT only — head:true returns zero rows, so no PII ever leaves the DB.
  const { count, error } = await supabaseAdmin
    .from('cdmx_rsvps')
    .select('*', { count: 'exact', head: true });

  if (error) {
    // DB unreachable / table missing / paused — fail loud for the canary.
    return res.status(500).json({ ok: false, error: 'rsvp count query failed' });
  }

  // Best-effort freshness: the latest registration TIMESTAMP only (no PII).
  // Never fail the probe on this secondary query.
  let latest_at: string | null = null;
  try {
    const { data } = await supabaseAdmin
      .from('cdmx_rsvps')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data && typeof data.created_at === 'string') latest_at = data.created_at;
  } catch {
    /* freshness is optional; the count is the health signal */
  }

  return res.status(200).json({ ok: true, count: count ?? 0, latest_at });
}
