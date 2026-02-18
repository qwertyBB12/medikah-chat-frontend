import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseServer';
import { nameToSlug } from '../../../lib/slug';

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
      .select('full_name, primary_specialty, sub_specialties, board_certifications, licenses, photo_url, linkedin_url, bio, available_days, available_hours, timezone, languages, residency, fellowships, medical_school, graduation_year, publications, verification_status, slug')
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

    // Strip sensitive fields - only return public-safe data
    const publicFields = [
      'full_name', 'primary_specialty', 'sub_specialties', 'board_certifications',
      'licenses', 'photo_url', 'linkedin_url', 'bio', 'available_days',
      'available_hours', 'timezone', 'languages', 'residency', 'fellowships',
      'medical_school', 'graduation_year', 'publications', 'verification_status',
      'slug',
    ];
    const sanitized = Object.fromEntries(
      Object.entries(physician).filter(([key]) => publicFields.includes(key))
    );

    return res.status(200).json({ data: sanitized });
  } catch (err) {
    console.error('Error fetching physician by slug:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
