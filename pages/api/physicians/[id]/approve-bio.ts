import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { supabaseAdmin } from '../../../../lib/supabaseServer';

type ApprovalAction = 'approve' | 'reject';

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

  const action = req.body?.action as ApprovalAction | undefined;
  if (action !== 'approve' && action !== 'reject') {
    return res.status(400).json({ error: "Body must include action: 'approve' | 'reject'" });
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
      return res.status(403).json({ error: 'Not authorized to approve this profile bio' });
    }

    const nowIso = new Date().toISOString();

    const { data: websiteData, error: websiteLookupError } = await supabaseAdmin
      .from('physician_website')
      .select('generated_bio_en, generated_bio_es, generated_tagline_en, generated_tagline_es')
      .eq('physician_id', id)
      .maybeSingle();

    if (websiteLookupError || !websiteData) {
      return res.status(404).json({ error: 'Narrative data not found for this physician' });
    }

    if (action === 'approve') {

      const hasGeneratedContent = Boolean(
        websiteData.generated_bio_en ||
        websiteData.generated_bio_es ||
        websiteData.generated_tagline_en ||
        websiteData.generated_tagline_es
      );

      if (!hasGeneratedContent) {
        return res.status(400).json({ error: 'No generated bio content available to approve' });
      }

      const { data: updated, error: updateError } = await supabaseAdmin
        .from('physician_website')
        .update({
          narrative_status: 'approved',
          narrative_approved_at: nowIso,
          approved_bio_en: websiteData.generated_bio_en || null,
          approved_bio_es: websiteData.generated_bio_es || null,
          approved_tagline_en: websiteData.generated_tagline_en || null,
          approved_tagline_es: websiteData.generated_tagline_es || null,
          updated_at: nowIso,
        })
        .eq('physician_id', id)
        .select('narrative_status, narrative_generated_at, narrative_approved_at')
        .single();

      if (updateError || !updated) {
        console.error('Error approving physician narrative:', updateError);
        return res.status(500).json({ error: 'Failed to approve physician bio' });
      }

      return res.status(200).json({ data: updated });
    }

    const { data: updated, error: rejectError } = await supabaseAdmin
      .from('physician_website')
      .update({
        narrative_status: 'collected',
        narrative_generated_at: null,
        updated_at: nowIso,
      })
      .eq('physician_id', id)
      .select('narrative_status, narrative_generated_at, narrative_approved_at')
      .single();

    if (rejectError || !updated) {
      console.error('Error rejecting physician narrative:', rejectError);
      return res.status(500).json({ error: 'Failed to reject physician bio' });
    }

    return res.status(200).json({ data: updated });
  } catch (err) {
    console.error('Exception approving/rejecting physician bio:', err);
    return res.status(500).json({ error: 'Failed to process narrative approval action' });
  }
}
