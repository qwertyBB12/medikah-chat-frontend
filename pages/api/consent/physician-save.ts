import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { supabaseAdmin } from '../../../lib/supabaseServer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    const { physicianId, formType, formVersion, language, sections, recordingConsent } = req.body;

    if (!physicianId) {
      return res.status(400).json({ error: 'physicianId is required' });
    }

    // Insert consent record
    const { error: insertError } = await supabaseAdmin
      .from('physician_consent_records')
      .insert({
        physician_id: physicianId,
        form_type: formType || 'network_agreement',
        form_version: formVersion || '1.0',
        language: language || 'en',
        sections: sections || {},
        recording_consent: recordingConsent,
        signed_at: new Date().toISOString(),
        user_agent: req.headers['user-agent'] || null,
      });

    if (insertError) {
      console.error('Error saving physician consent:', insertError);
      return res.status(500).json({ error: insertError.message });
    }

    // Update physician consent_signed_at and consent_version
    const { error: updateError } = await supabaseAdmin
      .from('physicians')
      .update({
        consent_signed_at: new Date().toISOString(),
        consent_version: formVersion || '1.0',
      })
      .eq('id', physicianId);

    if (updateError) {
      console.error('Error updating physician consent timestamp:', updateError);
      // Don't fail - the consent record was saved successfully
    }

    return res.status(201).json({ success: true });
  } catch (err) {
    console.error('Exception saving physician consent:', err);
    return res.status(500).json({ error: 'Failed to save consent' });
  }
}
