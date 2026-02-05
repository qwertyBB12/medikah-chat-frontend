/**
 * POST /api/physicians/{id}/verify-credentials
 *
 * Triggers the credential verification process for a physician.
 * Runs through all 3 tiers:
 * - Tier 1: Auto-verify (COFEPRIS, State Medical Boards)
 * - Tier 2: Semi-auto (LinkedIn, Google Scholar)
 * - Tier 3: Queue for manual review if needed
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  verifyPhysicianCredentials,
  VerifyCredentialsResponse,
  VerificationType,
} from '../../../../lib/verification';

interface RequestBody {
  forceRecheck?: boolean;
  specificTypes?: VerificationType[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<VerifyCredentialsResponse | { error: string }>
) {
  // Only allow POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  // Get physician ID from URL
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Physician ID is required' });
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return res.status(400).json({ error: 'Invalid physician ID format' });
  }

  try {
    // Parse request body
    const body: RequestBody = req.body || {};
    const { forceRecheck, specificTypes } = body;

    // Validate specificTypes if provided
    if (specificTypes) {
      const validTypes: VerificationType[] = [
        'license_mexico',
        'license_usa',
        'education_linkedin',
        'publications_scholar',
        'professional_presence',
        'board_certification',
        'international_credential',
      ];

      const invalidTypes = specificTypes.filter(t => !validTypes.includes(t));
      if (invalidTypes.length > 0) {
        return res.status(400).json({
          error: `Invalid verification types: ${invalidTypes.join(', ')}`,
        });
      }
    }

    // Run verification
    const status = await verifyPhysicianCredentials(id, {
      forceRecheck,
      specificTypes,
    });

    // Return response
    const response: VerifyCredentialsResponse = {
      success: true,
      physicianId: id,
      status,
      message: getStatusMessage(status.overallStatus),
    };

    // Set appropriate status code
    const httpStatus = status.overallStatus === 'verified' ? 200 : 202;
    return res.status(httpStatus).json(response);
  } catch (error) {
    console.error('Verification error:', error);

    // Check if physician not found
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: 'Physician not found' });
    }

    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

function getStatusMessage(status: string): string {
  switch (status) {
    case 'verified':
      return 'All credentials verified successfully';
    case 'partially_verified':
      return 'Some credentials verified, others pending review';
    case 'in_progress':
      return 'Verification in progress, some items queued for manual review';
    case 'rejected':
      return 'One or more credentials could not be verified';
    case 'pending':
    default:
      return 'Verification initiated';
  }
}
