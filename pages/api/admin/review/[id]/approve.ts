import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminUser } from '../../../../../lib/adminAuth';
import { approveManualReview } from '../../../../../lib/verification/verificationService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const admin = await getAdminUser(req, res);
  if (!admin) {
    return res.status(401).json({ error: 'Admin access required' });
  }

  const reviewId = req.query.id as string;
  if (!reviewId) {
    return res.status(400).json({ error: 'Review ID is required' });
  }

  const { notes } = req.body || {};

  try {
    const result = await approveManualReview(reviewId, admin.id, notes);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error approving review:', err);
    return res.status(500).json({ error: 'Failed to approve review' });
  }
}
