import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { supabaseAdmin } from '../../../lib/supabaseServer';

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

  try {
    const email = session.user.email.toLowerCase();

    const { data: physician, error } = await supabaseAdmin
      .from('physicians')
      .select('id, verification_status, onboarding_completed_at, consent_signed_at')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      console.error('Error checking physician status:', error);
      return res.status(500).json({ error: 'Failed to check status' });
    }

    if (!physician) {
      return res.status(200).json({
        isOnboarded: false,
        physicianId: null,
        verificationStatus: null,
        hasConsent: false,
      });
    }

    return res.status(200).json({
      isOnboarded: !!physician.onboarding_completed_at,
      physicianId: physician.id,
      verificationStatus: physician.verification_status,
      hasConsent: !!physician.consent_signed_at,
    });
  } catch (err) {
    console.error('Exception checking physician status:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
