import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminUser } from '../../../../lib/adminAuth';
import { supabaseAdmin } from '../../../../lib/supabaseServer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await getAdminUser(req, res);
  if (!admin) {
    return res.status(401).json({ error: 'Admin access required' });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const physicianId = req.query.id as string;
  if (!physicianId) {
    return res.status(400).json({ error: 'Physician ID is required' });
  }

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabaseAdmin
        .from('physicians')
        .select('*')
        .eq('id', physicianId)
        .single();

      if (error || !data) {
        return res.status(404).json({ error: 'Physician not found' });
      }

      // Also fetch verification results
      const { data: verificationResults } = await supabaseAdmin
        .from('physician_verification_results')
        .select('*')
        .eq('physician_id', physicianId)
        .order('created_at', { ascending: false });

      // Fetch manual review history
      const { data: reviewHistory } = await supabaseAdmin
        .from('physician_manual_review_queue')
        .select('*')
        .eq('physician_id', physicianId)
        .order('created_at', { ascending: false });

      return res.status(200).json({
        physician: data,
        verificationResults: verificationResults || [],
        reviewHistory: reviewHistory || [],
      });
    } catch (err) {
      console.error('Error fetching physician:', err);
      return res.status(500).json({ error: 'Failed to fetch physician' });
    }
  }

  if (req.method === 'PUT') {
    if (admin.role !== 'admin' && admin.role !== 'super_admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    try {
      const body = req.body;
      if (!body || typeof body !== 'object') {
        return res.status(400).json({ error: 'Request body is required' });
      }

      // Whitelist: only allow admin-editable fields
      const ALLOWED_FIELDS = [
        'verification_status', 'verified_at', 'full_name', 'bio',
        'primary_specialty', 'sub_specialties', 'board_certifications',
        'medical_school', 'medical_school_country', 'graduation_year',
        'residency', 'fellowships', 'publications', 'current_institutions',
        'languages', 'licenses', 'honors',
      ];
      const updates: Record<string, unknown> = {};
      for (const field of ALLOWED_FIELDS) {
        if (body[field] !== undefined) updates[field] = body[field];
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      const { data, error } = await supabaseAdmin
        .from('physicians')
        .update(updates)
        .eq('id', physicianId)
        .select()
        .single();

      if (error) {
        console.error('Error updating physician:', error);
        return res.status(500).json({ error: 'Failed to update physician' });
      }

      return res.status(200).json({ physician: data });
    } catch (err) {
      console.error('Exception updating physician:', err);
      return res.status(500).json({ error: 'Internal error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
