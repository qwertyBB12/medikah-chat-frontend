/**
 * GET /api/physicians/{id}/verification-status
 *
 * Returns the current verification status for a physician.
 * Includes:
 * - Overall status (pending, in_progress, verified, partially_verified, rejected)
 * - Verification tier (tier1, tier2, tier3)
 * - Individual verification results
 * - Summary of verified/pending/failed items
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getVerificationStatus, PhysicianVerificationStatus } from '../../../../lib/verification';

interface VerificationStatusResponse {
  success: boolean;
  status: PhysicianVerificationStatus | null;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<VerificationStatusResponse>
) {
  // Only allow GET
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({
      success: false,
      status: null,
      error: `Method ${req.method} not allowed`,
    });
  }

  // Get physician ID from URL
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      success: false,
      status: null,
      error: 'Physician ID is required',
    });
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return res.status(400).json({
      success: false,
      status: null,
      error: 'Invalid physician ID format',
    });
  }

  try {
    const status = await getVerificationStatus(id);

    if (!status) {
      return res.status(404).json({
        success: false,
        status: null,
        error: 'Physician not found',
      });
    }

    // Add cache headers for non-completed verifications
    if (status.overallStatus !== 'verified' && status.overallStatus !== 'rejected') {
      // Cache for 30 seconds if verification is in progress
      res.setHeader('Cache-Control', 'private, max-age=30');
    } else {
      // Cache for 5 minutes if verification is complete
      res.setHeader('Cache-Control', 'private, max-age=300');
    }

    return res.status(200).json({
      success: true,
      status,
    });
  } catch (error) {
    console.error('Error fetching verification status:', error);
    return res.status(500).json({
      success: false,
      status: null,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
