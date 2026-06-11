/**
 * POST /api/auth/activate/send-link
 *
 * Rate-limited self-service re-send for workspace activation links (D-02).
 *
 * Security contract (T-17-02-02 / T-17-02-03 / T-17-02-04):
 *   - NEVER reveals whether a physician exists or is verified (no enumeration).
 *   - Returns an identical generic 200 response on every branch.
 *   - Re-sends only to the token-bound verified physician's own email.
 *   - Rate limit: 3 sends per 5 minutes per source IP + physician_id.
 *   - Every attempt (allowed or throttled) is audited in workspace_audit_log.
 *   - Verifies verification_status === 'verified' before sending.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../../lib/supabaseServer';
import { verifyActivationToken, hashToken } from '../../../../lib/auth/activationTokens';
import { triggerWorkspaceActivation } from '../../../../lib/activationEmail';
import { logEvent, extractRequestContext } from '../../../../lib/workspaceAuditService';

// ---------------------------------------------------------------------------
// Rate limit: 3 sends / 5 min per (sourceIp + physicianId)
// In-process Map — sufficient for Netlify serverless (function is short-lived
// but reuses the in-process store for burst protection within the same instance).
// Across instances the audit log provides a durable record.
// ---------------------------------------------------------------------------

const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    // New window
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return true; // allowed
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return false; // throttled
  }
  entry.count += 1;
  return true; // allowed
}

// ---------------------------------------------------------------------------
// Source IP extraction (Phase 16-03 pattern from mailcowImapProvider.ts)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Generic response — identical shape on ALL branches (no enumeration)
// ---------------------------------------------------------------------------

const GENERIC_OK = { ok: true };

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
    console.error('[send-link] supabaseAdmin not configured — failing closed');
    return res.status(500).json({ error: 'Database not configured' });
  }

  const sourceIp = extractSourceIp(req);
  const { ipAddress, userAgent } = extractRequestContext(req);

  try {
    const { token } = req.body as { token?: string };
    if (!token || typeof token !== 'string') {
      // Return generic 200 — no enumeration (D-02)
      return res.status(200).json(GENERIC_OK);
    }

    // 1. Decode the (possibly expired) token to recover physician_id + email.
    //    verifyActivationToken returns null for expired tokens.
    //    For expired tokens, we fall back to the hash-row lookup to recover physician_id.
    let physicianId: string | null = null;

    const payload = await verifyActivationToken(token);
    if (payload) {
      physicianId = payload.physician_id;
    } else {
      // Token may be expired — try to recover physician_id via the hash row
      const tokenHash = hashToken(token);
      const { data: row, error: rowErr } = await supabaseAdmin
        .from('physician_activation_tokens')
        .select('physician_id')
        .eq('token_hash', tokenHash)
        .maybeSingle();

      if (!rowErr && row?.physician_id) {
        physicianId = row.physician_id;
      }
    }

    if (!physicianId) {
      // Unknown token — return generic 200 (no enumeration)
      return res.status(200).json(GENERIC_OK);
    }

    // 2. Re-verify physician.verification_status === 'verified' (T-17-02-04)
    const { data: physician, error: physicianErr } = await supabaseAdmin
      .from('physicians')
      .select('id, verification_status')
      .eq('id', physicianId)
      .maybeSingle();

    if (physicianErr || !physician || physician.verification_status !== 'verified') {
      // Not verified or not found — return generic 200 (no enumeration)
      return res.status(200).json(GENERIC_OK);
    }

    // 3. Rate limit: 3 sends per 5 min per (sourceIp + physicianId)
    const rateLimitKey = `${sourceIp ?? 'unknown'}:${physicianId}`;
    const allowed = checkRateLimit(rateLimitKey);

    // Audit every attempt regardless of rate-limit outcome (T-17-02-03)
    await logEvent({
      physicianId,
      actorId: physicianId,
      actorRole: 'physician',
      action: 'workspace.activation_link_resent',
      detail: { flow: 'activation', throttled: !allowed, sourceIp },
      ipAddress,
      userAgent,
    });

    if (!allowed) {
      // Throttled — return generic 200 (no enumeration)
      return res.status(200).json(GENERIC_OK);
    }

    // 4. Trigger re-send (triggerWorkspaceActivation handles idempotency internally,
    //    but we are here because the prior token was expired/consumed, so a fresh
    //    token will be generated and sent to the physician's stored email)
    try {
      await triggerWorkspaceActivation(physicianId);
    } catch (sendErr) {
      console.error('[send-link] triggerWorkspaceActivation failed:', sendErr);
      // Return generic 200 regardless (no enumeration)
    }

    return res.status(200).json(GENERIC_OK);
  } catch (err) {
    console.error('[send-link] exception:', err);
    // Return generic 200 on any error (no enumeration, D-02)
    return res.status(200).json(GENERIC_OK);
  }
}
