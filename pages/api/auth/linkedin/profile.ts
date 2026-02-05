/**
 * GET /api/auth/linkedin/profile
 *
 * Retrieves LinkedIn profile data for an onboarding session.
 * Called by the frontend after OAuth callback to get the pulled data.
 *
 * Query params:
 * - session_id: Onboarding session ID
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  getLinkedInSession,
  mapLinkedInToPhysicianData,
  LinkedInProfile,
} from '../../../../lib/linkedin';

interface ProfileResponse {
  success: boolean;
  profile?: LinkedInProfile;
  mappedData?: ReturnType<typeof mapLinkedInToPhysicianData>;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ProfileResponse>
) {
  // Only allow GET
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, error: `Method ${req.method} not allowed` });
  }

  const { session_id } = req.query;

  if (!session_id || typeof session_id !== 'string') {
    return res.status(400).json({ success: false, error: 'session_id is required' });
  }

  try {
    const profile = await getLinkedInSession(session_id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'LinkedIn profile not found for this session',
      });
    }

    // Map to physician data format
    const mappedData = mapLinkedInToPhysicianData(profile);

    return res.status(200).json({
      success: true,
      profile,
      mappedData,
    });
  } catch (err) {
    console.error('Error fetching LinkedIn profile:', err);
    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch profile',
    });
  }
}
