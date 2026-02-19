import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminUser } from '../../../lib/adminAuth';
import { supabaseAdmin } from '../../../lib/supabaseServer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const admin = await getAdminUser(req, res);
  if (!admin) {
    return res.status(401).json({ error: 'Admin access required' });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    const {
      status,
      search,
      page = '1',
      limit = '20',
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    let query = supabaseAdmin
      .from('physicians')
      .select('id, full_name, email, primary_specialty, verification_status, verified_at, created_at, photo_url', { count: 'exact' });

    if (status) {
      query = query.eq('verification_status', status);
    }

    if (search) {
      // Sanitize to prevent PostgREST filter injection via special chars
      const safe = search.replace(/[%,.()\[\]\\]/g, '');
      if (safe) {
        query = query.or(`full_name.ilike.%${safe}%,email.ilike.%${safe}%`);
      }
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching physicians:', error);
      return res.status(500).json({ error: 'Failed to fetch physicians' });
    }

    return res.status(200).json({
      physicians: data || [],
      total: count || 0,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil((count || 0) / limitNum),
    });
  } catch (err) {
    console.error('Exception fetching physicians:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
