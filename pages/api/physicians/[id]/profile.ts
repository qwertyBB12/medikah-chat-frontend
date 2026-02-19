import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { supabaseAdmin } from '../../../../lib/supabaseServer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
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
    const { data: physician, error } = await supabaseAdmin
      .from('physicians')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !physician) {
      return res.status(404).json({ error: 'Physician not found' });
    }

    // Verify the session email matches the physician's email
    if (physician.email.toLowerCase() !== session.user.email.toLowerCase()) {
      return res.status(403).json({ error: 'Not authorized to view this profile' });
    }

    return res.status(200).json({
      id: physician.id,
      fullName: physician.full_name,
      email: physician.email,
      bio: physician.bio || '',
      photoUrl: physician.photo_url,
      linkedinUrl: physician.linkedin_url,
      primarySpecialty: physician.primary_specialty,
      subSpecialties: physician.sub_specialties || [],
      boardCertifications: physician.board_certifications || [],
      medicalSchool: physician.medical_school,
      medicalSchoolCountry: physician.medical_school_country,
      graduationYear: physician.graduation_year,
      residency: physician.residency || [],
      fellowships: physician.fellowships || [],
      publications: physician.publications || [],
      currentInstitutions: physician.current_institutions || [],
      languages: physician.languages || [],
      websiteUrl: physician.website_url,
      linkedinImported: physician.linkedin_imported,
    });
  } catch (err) {
    console.error('Exception fetching physician profile:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
