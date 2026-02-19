import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { supabaseAdmin } from '../../../../lib/supabaseServer';

// Map camelCase request fields to snake_case DB columns
const FIELD_MAP: Record<string, string> = {
  fullName: 'full_name',
  bio: 'bio',
  primarySpecialty: 'primary_specialty',
  subSpecialties: 'sub_specialties',
  boardCertifications: 'board_certifications',
  medicalSchool: 'medical_school',
  medicalSchoolCountry: 'medical_school_country',
  graduationYear: 'graduation_year',
  residency: 'residency',
  fellowships: 'fellowships',
  publications: 'publications',
  currentInstitutions: 'current_institutions',
  languages: 'languages',
  websiteUrl: 'website_url',
  linkedinUrl: 'linkedin_url',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Physician ID is required' });
  }

  try {
    // Verify ownership
    const { data: physician, error: fetchError } = await supabaseAdmin
      .from('physicians')
      .select('email')
      .eq('id', id)
      .single();

    if (fetchError || !physician) {
      return res.status(404).json({ error: 'Physician not found' });
    }

    if (physician.email.toLowerCase() !== session.user.email.toLowerCase()) {
      return res.status(403).json({ error: 'Not authorized to update this profile' });
    }

    // Build snake_case updates from request body
    const body = req.body;
    const updates: Record<string, unknown> = {};

    for (const [camelKey, snakeKey] of Object.entries(FIELD_MAP)) {
      if (body[camelKey] !== undefined) {
        updates[snakeKey] = body[camelKey];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const { error: updateError } = await supabaseAdmin
      .from('physicians')
      .update(updates)
      .eq('id', id);

    if (updateError) {
      console.error('Error updating physician profile:', updateError);
      return res.status(500).json({ error: 'Failed to update profile' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Exception updating physician profile:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
