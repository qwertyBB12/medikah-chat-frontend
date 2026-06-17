/**
 * POST /api/auth/recovery/google-verify
 *
 * Google re-auth recovery path: validates the authenticated Google session,
 * verifies the Google email EXACTLY matches physicians.email on file (D-05),
 * confirms the physician is graduated (activation_complete = true), then
 * issues a short-lived recovery token for the set-password step.
 *
 * Security contract (D-05 / T-18-05-02):
 *   - Requires a live Google NextAuth session (session.user.provider === 'google').
 *   - The Google account email must EXACTLY resolve to a physician on file.
 *     A foreign Google account (no matching physician) gets a generic failure.
 *   - Only graduated physicians (activation_complete = true) are eligible.
 *   - Non-enumerating generic failure on mismatch.
 *   - Rate-limited (3 attempts per 5 min per source IP).
 *   - Audit-logged every attempt (T-18-05-06).
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../[...nextauth]';
import { supabaseAdmin } from '../../../../lib/supabaseServer';
import { signRecoveryToken, hashToken } from '../../../../lib/auth/recoveryTokens';
import { logEvent, extractRequestContext } from '../../../../lib/workspaceAuditService';

// ---------------------------------------------------------------------------
// Rate limit: 3 attempts / 5 min per source IP
// ---------------------------------------------------------------------------

const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }
  entry.count += 1;
  return true;
}

function extractSourceIp(req: NextApiRequest): string | null {
  const nfIp = req.headers['x-nf-client-connection-ip'];
  const fromNetlify =
    typeof nfIp === 'string'
      ? nfIp
      : Array.isArray(nfIp)
        ? nfIp[0]
        : undefined;
  if (fromNetlify) return fromNetlify;

  const forwarded = req.headers['x-forwarded-for'];
  const fromForwarded =
    typeof forwarded === 'string'
      ? forwarded.split(',')[0]?.trim()
      : Array.isArray(forwarded)
        ? forwarded[0]
        : undefined;
  if (fromForwarded) return fromForwarded;

  return req.socket?.remoteAddress ?? null;
}

// Generic failure copy — does NOT reveal which condition failed (D-05)
const GENERIC_FAILURE = { error: 'Recovery not available. Contact support@medikah.health.' };

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseAdmin) {
    console.error('[recovery/google-verify] supabaseAdmin not configured — failing closed');
    return res.status(500).json({ error: 'Database not configured' });
  }

  const sourceIp = extractSourceIp(req);
  const { ipAddress, userAgent } = extractRequestContext(req);

  // Rate limit by source IP
  const rateLimitKey = `recovery_google:${sourceIp ?? 'unknown'}`;
  if (!checkRateLimit(rateLimitKey)) {
    return res.status(429).json(GENERIC_FAILURE);
  }

  try {
    // 1. Require a live Google NextAuth session
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.email || session.user.provider !== 'google') {
      return res.status(401).json({ error: 'Google authentication required' });
    }

    const googleEmail = session.user.email.toLowerCase();

    // 2. D-05: look up physician by exact email match (physicians.email on file)
    const { data: physician, error: physErr } = await supabaseAdmin
      .from('physicians')
      .select('id, email, full_name, onboarding_language')
      .eq('email', googleEmail)
      .maybeSingle();

    if (physErr || !physician) {
      // Non-enumeration: generic failure (D-05) — foreign Google account with no match
      await logEvent({
        physicianId: 'unknown',
        actorRole: 'system',
        action: 'workspace.recovery_google_verified',
        detail: { flow: 'recovery', outcome: 'no_match', sourceIp },
        ipAddress,
        userAgent,
      }).catch(() => undefined);
      return res.status(400).json(GENERIC_FAILURE);
    }

    // 3. Verify workspace is activated (only graduated physicians recover — D-05)
    const { data: workspace, error: wsErr } = await supabaseAdmin
      .from('physician_workspace_accounts')
      .select('activation_complete, mailbox_local_part')
      .eq('physician_id', physician.id)
      .maybeSingle();

    if (wsErr || !workspace?.activation_complete) {
      await logEvent({
        physicianId: physician.id,
        actorRole: 'system',
        action: 'workspace.recovery_google_verified',
        detail: { flow: 'recovery', outcome: 'not_activated', sourceIp },
        ipAddress,
        userAgent,
      }).catch(() => undefined);
      return res.status(400).json(GENERIC_FAILURE);
    }

    // 4. Issue a 30-minute single-use recovery token
    const jti = crypto.randomUUID();
    const token = await signRecoveryToken({
      physician_id: physician.id,
      email: physician.email,
      jti,
    });
    const tokenHash = hashToken(token);

    const { error: insertErr } = await supabaseAdmin
      .from('physician_recovery_tokens')
      .insert({
        physician_id: physician.id,
        token_hash: tokenHash,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      });

    if (insertErr) {
      console.error('[recovery/google-verify] failed to insert recovery token:', insertErr.message);
      return res.status(500).json({ error: 'Internal error' });
    }

    // 5. Audit the successful verification
    await logEvent({
      physicianId: physician.id,
      actorId: physician.id,
      actorRole: 'physician',
      action: 'workspace.recovery_google_verified',
      detail: { flow: 'recovery', outcome: 'verified', sourceIp },
      ipAddress,
      userAgent,
    }).catch(() => undefined);

    // Return the token to the client for the set-password step
    return res.status(200).json({ token });
  } catch (err) {
    console.error('[recovery/google-verify] exception:', err instanceof Error ? err.message : String(err));
    return res.status(500).json({ error: 'Internal error' });
  }
}
