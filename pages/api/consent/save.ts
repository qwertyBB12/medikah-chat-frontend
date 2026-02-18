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
    console.error('Supabase admin client not configured');
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    const { userId, language, checkboxes, recordingConsent, formVersion } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Verify userId matches authenticated session
    if (userId !== session.user.id) {
      return res.status(403).json({ error: 'User ID mismatch' });
    }

    const { error } = await supabaseAdmin.from('consent_records').insert({
      user_id: userId,
      form_type: 'cross_border_ack',
      form_version: formVersion || '1.0',
      language: language || 'en',
      checkboxes: checkboxes || {},
      recording_consent: recordingConsent,
      ip_address: null,
      user_agent: req.headers['user-agent'] || null,
    });

    if (error) {
      console.error('Error saving consent record:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ success: true });
  } catch (err) {
    console.error('Exception saving consent record:', err);
    return res.status(500).json({ error: 'Failed to save consent' });
  }
}
