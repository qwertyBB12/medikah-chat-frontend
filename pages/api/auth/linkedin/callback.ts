/**
 * GET /api/auth/linkedin/callback
 *
 * LinkedIn OAuth callback handler.
 * Exchanges authorization code for access token,
 * fetches profile data, and stores it for the onboarding session.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  exchangeCodeForToken,
  fetchLinkedInProfile,
  storeLinkedInSession,
  LinkedInOAuthState,
} from '../../../../lib/linkedin';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const { code, state, error, error_description } = req.query;

  // Handle OAuth errors from LinkedIn
  if (error) {
    console.error('LinkedIn OAuth error:', error, error_description);
    return redirectWithError(res, 'LinkedIn authorization failed', error as string);
  }

  // Validate code and state
  if (!code || typeof code !== 'string') {
    return redirectWithError(res, 'Missing authorization code');
  }

  if (!state || typeof state !== 'string') {
    return redirectWithError(res, 'Missing state parameter');
  }

  // Verify state matches cookie (CSRF protection)
  const cookieState = req.cookies.linkedin_oauth_state;
  if (!cookieState || cookieState !== state) {
    return redirectWithError(res, 'State mismatch - possible CSRF attack');
  }

  // Decode state
  let stateData: LinkedInOAuthState;
  try {
    stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
  } catch {
    return redirectWithError(res, 'Invalid state parameter');
  }

  // Check state timestamp (10 minute expiry)
  if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
    return redirectWithError(res, 'OAuth session expired');
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForToken(code);

    // Fetch profile data
    const profile = await fetchLinkedInProfile(tokens.accessToken);

    // Store profile in session
    await storeLinkedInSession(stateData.sessionId, profile, tokens);

    // Clear the state cookie
    res.setHeader('Set-Cookie', [
      'linkedin_oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
    ]);

    // Redirect back to onboarding with success
    const redirectUrl = buildRedirectUrl(stateData, true, profile.fullName);
    res.redirect(302, redirectUrl);
  } catch (err) {
    console.error('LinkedIn OAuth callback error:', err);
    return redirectWithError(
      res,
      err instanceof Error ? err.message : 'Failed to complete LinkedIn authorization'
    );
  }
}

/**
 * Build redirect URL after OAuth completion
 */
function buildRedirectUrl(
  state: LinkedInOAuthState,
  success: boolean,
  name?: string
): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
  const redirectPath = state.redirectPath || '/physicians/onboard';

  const params = new URLSearchParams({
    linkedin: success ? 'connected' : 'error',
    session: state.sessionId,
  });

  if (name) {
    params.set('name', name);
  }

  return `${baseUrl}${redirectPath}?${params.toString()}`;
}

/**
 * Redirect with error message
 */
function redirectWithError(
  res: NextApiResponse,
  message: string,
  code?: string
): void {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
  const params = new URLSearchParams({
    linkedin: 'error',
    error: message,
  });

  if (code) {
    params.set('error_code', code);
  }

  // Clear the state cookie
  res.setHeader('Set-Cookie', [
    'linkedin_oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
  ]);

  res.redirect(302, `${baseUrl}/physicians/onboard?${params.toString()}`);
}
