import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { getToken } from 'next-auth/jwt';
import { authOptions } from './[...nextauth]';
import { mintBackendToken } from '../../../lib/auth/backendToken';

/**
 * GET /api/auth/backend-token
 *
 * Returns a short-lived HS256 JWS the FastAPI physician gate
 * (`medikah-chat-api/utils/auth.py`) verifies, minted from the current NextAuth
 * session claims and signed with the SHARED NEXTAUTH_SECRET.
 *
 * Replaces the old `/api/auth/supabase-token`: physician dashboard / workspace
 * components send this as `Authorization: Bearer <token>` on their direct calls
 * to FastAPI. The backend verifies HS256 with NEXTAUTH_SECRET — a Supabase
 * access token (signed with Supabase's secret) never passed that gate → the
 * dashboard 401'd ("Invalid token"). See lib/auth/backendToken.ts for the full
 * root-cause writeup.
 *
 * Minted with a 1h window (matches the NextAuth session maxAge) so a single
 * page can authenticate many direct calls without re-fetching mid-session.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.userId || !token?.role) {
    return res.status(401).json({ error: 'Session token unavailable' });
  }

  try {
    const backendToken = await mintBackendToken(
      {
        userId: String(token.userId),
        role: String(token.role),
        email: session.user.email,
        physicianId: token.physician_id ? String(token.physician_id) : undefined,
      },
      '1h',
    );
    return res.status(200).json({ token: backendToken });
  } catch (err) {
    console.error('Exception in backend-token:', err);
    return res.status(503).json({ error: 'Auth not configured' });
  }
}
