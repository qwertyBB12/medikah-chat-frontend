import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseServer';

function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/^(dr\.?\s+|dra\.?\s+)/i, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { slug } = req.query;

  if (!slug || typeof slug !== 'string') {
    return res.status(400).json({ error: 'Slug is required' });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    const { data: physicians, error } = await supabaseAdmin
      .from('physicians')
      .select('*')
      .eq('verification_status', 'verified');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const physician = physicians?.find(
      (p: { full_name: string }) => nameToSlug(p.full_name) === slug
    );

    if (!physician) {
      return res.status(404).json({ error: 'Physician not found' });
    }

    return res.status(200).json({ data: physician });
  } catch (err) {
    console.error('Error fetching physician by slug:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
