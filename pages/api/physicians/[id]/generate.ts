import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { supabaseAdmin } from '../../../../lib/supabaseServer';
import { generateBioForPhysician } from '../../../../lib/bioGenerator';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Physician ID is required' });
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return res.status(400).json({ error: 'Invalid physician ID format' });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    const { data: physician, error: lookupError } = await supabaseAdmin
      .from('physicians')
      .select('id, email')
      .eq('id', id)
      .single();

    if (lookupError || !physician) {
      return res.status(404).json({ error: 'Physician not found' });
    }

    if (physician.email.toLowerCase() !== session.user.email.toLowerCase()) {
      return res.status(403).json({ error: 'Not authorized to regenerate this profile bio' });
    }

    const generated = await generateBioForPhysician(id);

    return res.status(200).json({ data: generated });
  } catch (err) {
    console.error('Exception generating physician bio:', err);
    return res.status(500).json({ error: 'Failed to generate physician bio' });
  }
}
