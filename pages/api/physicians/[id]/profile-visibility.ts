import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { supabaseAdmin } from '../../../../lib/supabaseServer';
import { sessionOwnsPhysician } from '../../../../lib/physicianAuthz';
import { normalizeVisibility } from '../../../../lib/visibilityTypes';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  if (typeof id !== 'string' || !UUID_REGEX.test(id)) {
    return res.status(400).json({ error: 'Invalid physician id' });
  }
  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const session = await getServerSession(req, res, authOptions);
  const { data: physician, error: physErr } = await supabaseAdmin
    .from('physicians')
    .select('id, email')
    .eq('id', id)
    .single();
  if (physErr || !physician) {
    return res.status(404).json({ error: 'Physician not found' });
  }
  if (!sessionOwnsPhysician(session, physician, id)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('physician_profile_visibility')
      .select('toggles')
      .eq('physician_id', id)
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    // No row yet → defaults (migration backfills rows, but be resilient).
    return res.status(200).json({ toggles: normalizeVisibility(data?.toggles) });
  }

  if (req.method === 'PUT') {
    const toggles = normalizeVisibility((req.body as { toggles?: unknown })?.toggles);
    const { error } = await supabaseAdmin
      .from('physician_profile_visibility')
      .upsert(
        { physician_id: id, toggles, updated_at: new Date().toISOString() },
        { onConflict: 'physician_id' }
      );
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, toggles });
  }

  res.setHeader('Allow', 'GET, PUT');
  return res.status(405).json({ error: 'Method not allowed' });
}
