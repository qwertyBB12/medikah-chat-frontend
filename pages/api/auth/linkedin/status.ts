/**
 * GET /api/auth/linkedin/status
 *
 * Returns whether LinkedIn OAuth is configured.
 * Used by the frontend to determine if OAuth flow is available
 * before attempting to open a popup.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { isLinkedInConfigured } from '../../../../lib/linkedin';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ configured: boolean }>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end();
  }

  return res.status(200).json({ configured: isLinkedInConfigured() });
}
