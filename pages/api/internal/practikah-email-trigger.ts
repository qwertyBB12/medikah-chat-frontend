/**
 * Internal email trigger endpoint (Phase 12-02)
 *
 * Called by medikah-chat-api/services/practikah/notifications.py after a successful
 * free-tier workspace wizard completion to trigger the Resend "Práctikah is live"
 * transactional email.
 *
 * Trust boundary: FastAPI → Next.js (server-to-server, NOT called from the browser).
 * Authentication: X-Internal-Secret header matched against INTERNAL_API_SHARED_SECRET
 * env var using crypto.timingSafeEqual (constant-time compare — T-12-02-09).
 *
 * This endpoint MUST NOT be exposed to clients:
 *   - No public CORS headers
 *   - 403 on wrong/missing secret
 *   - 405 on non-POST methods
 *
 * Supported kinds:
 *   practikah_live — "Práctikah is live, Dr. {lastName}" bilingual welcome email
 *
 * Security:
 *   T-12-02-03: X-Internal-Secret guards against unauthenticated callers
 *   T-12-02-04: RESEND_API_KEY stays server-side (only in Next.js env, never in browser)
 *   T-12-02-09: crypto.timingSafeEqual prevents timing-based secret leakage
 */

import crypto from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendPracikahLiveEmail } from '../../../lib/practikahEmail';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  // Only POST is supported
  if (req.method !== 'POST') {
    return void res.status(405).json({ error: 'Method not allowed' });
  }

  // ---------------------------------------------------------------------------
  // Authenticate via X-Internal-Secret (T-12-02-03 / T-12-02-09)
  // ---------------------------------------------------------------------------
  const sharedSecret = process.env.INTERNAL_API_SHARED_SECRET;
  const presented = req.headers['x-internal-secret'];

  if (!sharedSecret) {
    console.error('[practikah-email-trigger] INTERNAL_API_SHARED_SECRET not configured');
    // Fail closed — don't reveal whether the env var is missing
    return void res.status(403).json({ error: 'Forbidden' });
  }

  if (typeof presented !== 'string') {
    return void res.status(403).json({ error: 'Forbidden' });
  }

  // Constant-time comparison to prevent timing-based secret leakage (T-12-02-09)
  // crypto.timingSafeEqual requires same-length buffers — handle mismatch explicitly
  let secretMatch = false;
  try {
    const presentedBuf = Buffer.from(presented);
    const expectedBuf = Buffer.from(sharedSecret);
    if (presentedBuf.length === expectedBuf.length) {
      secretMatch = crypto.timingSafeEqual(presentedBuf, expectedBuf);
    }
    // Mismatched lengths → secretMatch stays false (no timing information leaked)
  } catch {
    secretMatch = false;
  }

  if (!secretMatch) {
    return void res.status(403).json({ error: 'Forbidden' });
  }

  // ---------------------------------------------------------------------------
  // Parse and validate body
  // ---------------------------------------------------------------------------
  const { kind, to, lang, mailbox_address, slug, first_name, last_name } =
    req.body || {};

  if (kind !== 'practikah_live') {
    return void res.status(400).json({ error: `Unknown kind: ${kind}` });
  }

  if (!to || !lang || !mailbox_address || !slug || !first_name || !last_name) {
    return void res.status(400).json({
      error: 'Missing required fields: to, lang, mailbox_address, slug, first_name, last_name',
    });
  }

  if (lang !== 'en' && lang !== 'es') {
    return void res.status(400).json({ error: 'lang must be "en" or "es"' });
  }

  // ---------------------------------------------------------------------------
  // Trigger the email
  // ---------------------------------------------------------------------------
  try {
    const result = await sendPracikahLiveEmail({
      to,
      lang,
      mailboxAddress: mailbox_address,
      slug,
      firstName: first_name,
      lastName: last_name,
    });

    return void res.status(result.success ? 200 : 502).json(result);
  } catch (err) {
    console.error('[practikah-email-trigger] unhandled error:', err);
    return void res.status(500).json({ error: 'Internal server error' });
  }
}
