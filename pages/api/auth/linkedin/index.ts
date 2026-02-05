/**
 * GET /api/auth/linkedin
 *
 * Initiates LinkedIn OAuth flow.
 * Redirects user to LinkedIn authorization page.
 *
 * Query params:
 * - session_id: Onboarding session ID to link the OAuth result
 * - redirect: Optional path to redirect after completion
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getLinkedInAuthUrl, isLinkedInConfigured, LinkedInOAuthState } from '../../../../lib/linkedin';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  // Check if LinkedIn OAuth is configured
  if (!isLinkedInConfigured()) {
    return res.status(503).json({
      error: 'LinkedIn OAuth not configured',
      message: 'Please configure LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, and LINKEDIN_REDIRECT_URI',
    });
  }

  // Get session ID from query
  const { session_id, redirect } = req.query;

  if (!session_id || typeof session_id !== 'string') {
    return res.status(400).json({ error: 'session_id is required' });
  }

  // Create state object for CSRF protection
  const state: LinkedInOAuthState = {
    sessionId: session_id,
    redirectPath: typeof redirect === 'string' ? redirect : undefined,
    timestamp: Date.now(),
  };

  // Encode state as base64
  const stateString = Buffer.from(JSON.stringify(state)).toString('base64');

  // Store state in cookie for verification on callback
  res.setHeader('Set-Cookie', [
    `linkedin_oauth_state=${stateString}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`,
  ]);

  // Redirect to LinkedIn authorization
  const authUrl = getLinkedInAuthUrl(stateString);
  res.redirect(302, authUrl);
}
