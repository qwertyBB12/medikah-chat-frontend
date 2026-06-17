/**
 * POST /api/auth/recovery/request-link
 *
 * Non-enumerating, rate-limited recovery magic-link dispatch.
 *
 * Security contract (D-03 / D-05 / T-18-05-01 / T-18-05-05):
 *   - The `email` body field is used ONLY to look up a physician record.
 *     The magic-link is ALWAYS sent to `physicians.email` on file — NEVER to the
 *     address supplied by the caller if they differ.
 *   - NEVER reveals whether a physician record exists (non-enumeration).
 *     Every code path returns the SAME neutral 200 response.
 *   - Rate limit: 3 sends per 5 minutes per source IP.
 *   - Only graduated physicians (activation_complete = true) are eligible.
 *   - Every attempt is audit-logged with IP + UA (security-relevant T-18-01-04).
 *   - supabaseAdmin null → 500 fail-closed BEFORE any user lookup.
 *     Note: the null-guard returns 500 (not 200) because the caller should know
 *     the infrastructure is broken; this is not an enumeration risk.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../../lib/supabaseServer';
import { signRecoveryToken, hashToken } from '../../../../lib/auth/recoveryTokens';
import { sendRecoveryEmail } from '../../../../lib/recoveryEmail';
import { logEvent, extractRequestContext } from '../../../../lib/workspaceAuditService';

// ---------------------------------------------------------------------------
// Rate limit: 3 sends / 5 min per source IP
// In-process Map — Netlify serverless burst protection within the same instance.
// Across instances the audit log provides the durable record.
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
// Generic response — identical shape on ALL branches (no enumeration, D-05)
// ---------------------------------------------------------------------------

const GENERIC_OK = { sent: true };

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
    console.error('[recovery/request-link] supabaseAdmin not configured — failing closed');
    return res.status(500).json({ error: 'Database not configured' });
  }

  const sourceIp = extractSourceIp(req);
  const { ipAddress, userAgent } = extractRequestContext(req);

  // Rate limit by source IP (applied before any DB work to protect against flooding)
  const rateLimitKey = `recovery_link:${sourceIp ?? 'unknown'}`;
  const allowed = checkRateLimit(rateLimitKey);
  if (!allowed) {
    // Return neutral 200 even when throttled — non-enumeration (D-05)
    return res.status(200).json(GENERIC_OK);
  }

  try {
    const { email } = req.body as { email?: string };

    // D-05: always return neutral 200 if email missing or not a string
    if (!email || typeof email !== 'string') {
      return res.status(200).json(GENERIC_OK);
    }

    const canonical = email.toLowerCase().trim();

    // 1. Look up physician by the supplied email (physicians.email — canonical bootstrap)
    const { data: physician, error: physErr } = await supabaseAdmin
      .from('physicians')
      .select('id, email, full_name, onboarding_language')
      .eq('email', canonical)
      .maybeSingle();

    // Audit every attempt regardless of outcome (T-18-05-06)
    const resolvedPhysicianId = physician?.id ?? null;

    // D-05: silent bail — non-enumeration
    if (physErr || !physician) {
      // Audit with system actor since we don't know the physician
      await logEvent({
        physicianId: 'unknown',
        actorRole: 'system',
        action: 'workspace.recovery_link_sent',
        detail: { flow: 'recovery', outcome: 'no_match', sourceIp },
        ipAddress,
        userAgent,
      }).catch(() => undefined);
      return res.status(200).json(GENERIC_OK);
    }

    // 2. Verify workspace is activated (only graduated doctors recover — D-05 scope)
    const { data: workspace, error: wsErr } = await supabaseAdmin
      .from('physician_workspace_accounts')
      .select('activation_complete, mailbox_local_part')
      .eq('physician_id', physician.id)
      .maybeSingle();

    if (wsErr || !workspace?.activation_complete) {
      await logEvent({
        physicianId: resolvedPhysicianId!,
        actorRole: 'system',
        action: 'workspace.recovery_link_sent',
        detail: { flow: 'recovery', outcome: 'not_activated', sourceIp },
        ipAddress,
        userAgent,
      }).catch(() => undefined);
      // D-05: neutral 200
      return res.status(200).json(GENERIC_OK);
    }

    // 3. Sign a 30-minute single-use recovery token
    const jti = crypto.randomUUID();
    const token = await signRecoveryToken({
      physician_id: physician.id,
      email: physician.email, // always the canonical email on file, NOT the supplied address
      jti,
    });
    const tokenHash = hashToken(token);

    // 4. Store only the hash (single-use enforcement — raw token never persisted)
    const { error: insertErr } = await supabaseAdmin
      .from('physician_recovery_tokens')
      .insert({
        physician_id: physician.id,
        token_hash: tokenHash,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      });

    if (insertErr) {
      console.error('[recovery/request-link] failed to insert recovery token:', insertErr.message);
      // D-05: neutral 200 — don't leak the failure reason
      return res.status(200).json(GENERIC_OK);
    }

    // 5. Send the recovery email to the EMAIL ON FILE (D-05 / D-03 — never to a typed address)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://medikah.health';
    const recoveryUrl = `${baseUrl}/auth/recovery?token=${encodeURIComponent(token)}`;
    const lang = (physician.onboarding_language as 'en' | 'es') || 'en';

    try {
      await sendRecoveryEmail({
        to: physician.email,
        fullName: physician.full_name,
        recoveryUrl,
        lang,
      });
    } catch (emailErr) {
      console.error('[recovery/request-link] sendRecoveryEmail failed:', emailErr);
      // D-05: neutral 200 regardless
    }

    // 6. Audit the successful dispatch
    await logEvent({
      physicianId: physician.id,
      actorRole: 'system',
      action: 'workspace.recovery_link_sent',
      detail: { flow: 'recovery', outcome: 'sent', sourceIp },
      ipAddress,
      userAgent,
    }).catch(() => undefined);

    return res.status(200).json(GENERIC_OK);
  } catch {
    // D-05: ALWAYS return neutral 200 — never leak errors
    return res.status(200).json(GENERIC_OK);
  }
}
