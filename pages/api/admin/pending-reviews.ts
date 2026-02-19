import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminUser } from '../../../lib/adminAuth';
import { getPendingManualReviews } from '../../../lib/verification/verificationService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const admin = await getAdminUser(req, res);
  if (!admin) {
    return res.status(401).json({ error: 'Admin access required' });
  }

  try {
    const reviews = await getPendingManualReviews();
    return res.status(200).json({ reviews });
  } catch (err) {
    console.error('Error fetching pending reviews:', err);
    return res.status(500).json({ error: 'Failed to fetch pending reviews' });
  }
}
