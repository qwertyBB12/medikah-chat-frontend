import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseServer';
import { CONSENT_FORM_VERSION } from '../../../lib/consentContent';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.query;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'userId is required' });
  }

  if (!supabaseAdmin) {
    // If no database, assume no consent
    return res.status(200).json({ hasConsent: false });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('consent_records')
      .select('id')
      .eq('user_id', userId)
      .eq('form_type', 'cross_border_ack')
      .eq('form_version', CONSENT_FORM_VERSION)
      .limit(1);

    if (error) {
      console.error('Error checking consent:', error);
      return res.status(200).json({ hasConsent: false });
    }

    return res.status(200).json({ hasConsent: Array.isArray(data) && data.length > 0 });
  } catch (err) {
    console.error('Exception checking consent:', err);
    return res.status(200).json({ hasConsent: false });
  }
}
