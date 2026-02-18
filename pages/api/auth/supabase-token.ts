import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './[...nextauth]';
import { supabaseAdmin } from '../../../lib/supabaseServer';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/auth/supabase-token
 *
 * Returns a Supabase access token for the authenticated NextAuth user.
 * Used by physician dashboard components to authenticate with the backend API.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  try {
    // Generate a magic link for the user (server-side only, never sent via email)
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: session.user.email,
    });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error('Failed to generate Supabase link:', linkError);
      return res.status(500).json({ error: 'Failed to generate token' });
    }

    // Exchange the hashed token for a session using the anon client
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: otpData, error: otpError } = await anonClient.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: 'magiclink',
    });

    if (otpError || !otpData.session?.access_token) {
      console.error('Failed to exchange token:', otpError);
      return res.status(500).json({ error: 'Failed to create session' });
    }

    return res.status(200).json({ access_token: otpData.session.access_token });
  } catch (err) {
    console.error('Exception in supabase-token:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
