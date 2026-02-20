/**
 * PUT /api/physicians/{id}/narrative
 *
 * Saves narrative questionnaire responses to physician_website table.
 * Creates the physician_website row if it doesn't exist (upsert).
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { supabaseAdmin } from '../../../../lib/supabaseServer';
import { generateBioForPhysician } from '../../../../lib/bioGenerator';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
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
    // Verify the session user owns this physician record
    const { data: physician, error: lookupError } = await supabaseAdmin
      .from('physicians')
      .select('id, email')
      .eq('id', id)
      .single();

    if (lookupError || !physician) {
      return res.status(404).json({ error: 'Physician not found' });
    }

    if (physician.email.toLowerCase() !== session.user.email.toLowerCase()) {
      return res.status(403).json({ error: 'Not authorized to update this profile' });
    }

    const {
      firstConsultExpectation,
      communicationStyle,
      specialtyMotivation,
      careValues,
      originSentence,
      personalStatement,
      personalInterests,
    } = req.body;

    // Validate communication style enum
    const validStyles = ['thorough', 'collaborative', 'direct', 'reassuring'];
    if (communicationStyle && !validStyles.includes(communicationStyle)) {
      return res.status(400).json({ error: 'Invalid communication style' });
    }

    const { error } = await supabaseAdmin
      .from('physician_website')
      .upsert(
        {
          physician_id: id,
          first_consult_expectation: firstConsultExpectation || null,
          communication_style: communicationStyle || null,
          specialty_motivation: specialtyMotivation || null,
          care_values: careValues || null,
          origin_sentence: originSentence || null,
          personal_statement: personalStatement || null,
          personal_interests: personalInterests || null,
          narrative_status: 'collected',
          narrative_collected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'physician_id' }
      );

    if (error) {
      console.error('Error saving narrative responses:', error);
      return res.status(500).json({ error: 'Failed to save narrative responses' });
    }

    // Fire-and-forget generation so narrative save is never blocked by template processing.
    generateBioForPhysician(id).catch((generationError) => {
      console.error('Error auto-generating physician bio after narrative save:', generationError);
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Exception saving narrative responses:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
