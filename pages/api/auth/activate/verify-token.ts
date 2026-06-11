/**
 * POST /api/auth/activate/verify-token
 *
 * Validates a workspace activation token without consuming it.
 * Consumption (consumed_at) happens in 17-03 set-password per Pitfall 4.
 *
 * Security contract (T-17-02-01 / T-17-02-05):
 *   - Returns 200 { physician_id, email } for a valid, non-consumed, non-expired token.
 *   - Returns 410 for a consumed or expired token.
 *   - Returns 404 for an invalid signature or unknown hash.
 *   - Does NOT mutate consumed_at.
 *   - Raw token is never console-logged.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../../lib/supabaseServer';
import { verifyActivationToken, hashToken } from '../../../../lib/auth/activationTokens';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseAdmin) {
    console.error('[verify-token] supabaseAdmin not configured — failing closed');
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    const { token } = req.body as { token?: string };
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Token required' });
    }

    // 1. Verify JWT signature + type claim
    const payload = await verifyActivationToken(token);
    if (!payload) {
      // Signature invalid, wrong type, or structurally malformed
      return res.status(404).json({ error: 'Invalid or unknown token' });
    }

    // 2. Look up the hash row in physician_activation_tokens
    const tokenHash = hashToken(token);
    const { data: row, error: fetchError } = await supabaseAdmin
      .from('physician_activation_tokens')
      .select('id, consumed_at, expires_at')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (fetchError) {
      console.error('[verify-token] DB error looking up token hash:', fetchError.message);
      return res.status(500).json({ error: 'Internal error' });
    }

    if (!row) {
      // Hash not found — unknown token
      return res.status(404).json({ error: 'Invalid or unknown token' });
    }

    // 3. Check consumed / expired state
    const now = new Date();
    const consumed = row.consumed_at !== null && row.consumed_at !== undefined;
    const expired = new Date(row.expires_at) <= now;

    if (consumed || expired) {
      return res.status(410).json({ error: 'Token has expired or has already been used' });
    }

    // 4. Valid — return physician context. Do NOT set consumed_at here.
    return res.status(200).json({
      physician_id: payload.physician_id,
      email: payload.email,
    });
  } catch (err) {
    console.error('[verify-token] exception:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
