/**
 * POST /api/auth/physician-signup
 *
 * Creates the ENTRY identity for a brand-new physician: a Supabase Auth user with
 * an email + password. This is the email/password replacement for the (removed,
 * unconfigured) Google sign-in — Option A onboarding requires NO Google.
 *
 * Flow: new doctor on /chat → this endpoint creates the auth user → the client
 * immediately signs in via the NextAuth 'credentials' provider (which authenticates
 * against Supabase Auth with signInWithPassword) → lands on /physicians/onboard with
 * a session. The physician record itself is created later by the onboarding form
 * (pages/api/physicians/create.ts), which tolerates the pre-existing auth user.
 *
 * After the doctor is verified, the admin provisions their @medikah.health mailbox
 * (Option A) and they get an activation link to set the mailbox password; thereafter
 * the Medikah-email (mailcow-imap) login is their primary path, this account the fallback.
 *
 * Security:
 *   - password is NEVER logged.
 *   - Origin guard + per-IP rate limit (mirrors create.ts) — this mints auth users
 *     unauthenticated, so it must not be left open to bots.
 *   - Returns 409 (not 500) when the email already exists, so the UI can steer the
 *     doctor to "Returning — sign in" instead of leaking whether an account exists
 *     via a generic error.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseServer';
import { checkPassword } from '../../../lib/passwordPolicy';
import { checkRateLimit, extractSourceIp } from '../../../lib/simpleRateLimit';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseAdmin) {
    console.error('[physician-signup] supabaseAdmin not configured');
    return res.status(500).json({ error: 'Account service not configured' });
  }

  // Origin guard (mirrors create.ts) — block opportunistic bots / cross-site abuse.
  const originHeader = (req.headers.origin || req.headers.referer || '') as string;
  let originHost = '';
  try {
    if (originHeader) originHost = new URL(originHeader).host;
  } catch {
    originHost = '';
  }
  const originAllowed =
    originHost === 'medikah.health' ||
    originHost === 'www.medikah.health' ||
    originHost.endsWith('.netlify.app');
  if (!originAllowed) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Per-IP rate limit — 5 account creations per hour per IP.
  const ip = extractSourceIp(req);
  if (!checkRateLimit('physician-signup', ip, 5, 60 * 60 * 1000)) {
    return res.status(429).json({ error: 'Too many attempts. Please try again later.' });
  }

  const { email: rawEmail, password } = (req.body || {}) as {
    email?: unknown;
    password?: unknown;
  };

  if (typeof rawEmail !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const email = rawEmail.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Enter a valid email address' });
  }

  // Password policy: ≥12 chars + ≥3 of 4 classes (same gate as set-password).
  const pw = checkPassword(password);
  if (!pw.valid) {
    return res.status(422).json({
      error:
        pw.reason === 'too_short'
          ? 'Password must be at least 12 characters'
          : 'Password must mix at least 3 of: lowercase, uppercase, number, symbol',
      reason: pw.reason,
    });
  }

  // Create the Supabase Auth user with the chosen password. email_confirm:true so
  // they can sign in immediately (they reached this endpoint from our own site).
  // NOTE: password is passed straight to Supabase over TLS and is NEVER logged.
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'physician' },
  });

  if (error) {
    const msg = error.message || '';
    if (/already.*regist|already.*exist|email.*exist|duplicate|been registered/i.test(msg)) {
      return res.status(409).json({
        error: 'An account with this email already exists. Please sign in instead.',
        reason: 'exists',
      });
    }
    // Do not echo the raw Supabase error to the client.
    console.error('[physician-signup] createUser failed:', msg);
    return res.status(500).json({ error: 'Could not create account. Please try again.' });
  }

  return res.status(201).json({ ok: true, email: data.user?.email ?? email });
}
