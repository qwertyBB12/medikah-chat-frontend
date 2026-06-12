import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../lib/supabaseServer';
import { sendCdmxRsvpConfirmation } from '../../lib/email';
import { sanitizeCdmxPreferences } from '../../lib/cdmxSessions';
import { checkRateLimit, extractSourceIp } from '../../lib/simpleRateLimit';

// RSVP capture for the Mexico City talk series (medikah.health/cdmx).
// Writes via the service-role client (RLS-locked table); sends a Spanish
// confirmation email. Rate-limited per IP — this endpoint is pointed at by
// public discovery listings and shares the Resend daily quota.

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!checkRateLimit('cdmx-rsvp', extractSourceIp(req), RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS)) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  const { name, email, whatsapp, profession, sessions, locale } = req.body ?? {};

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }
  // basic email shape check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
    return res.status(400).json({ error: 'Invalid email' });
  }
  if (String(name).length > 200 || String(email).length > 320) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const preferredSessions = sanitizeCdmxPreferences(sessions);
  const cleanWhatsapp = whatsapp ? String(whatsapp).trim().slice(0, 32) : null;
  const cleanProfession = profession ? String(profession).trim().slice(0, 200) : null;
  const row = {
    name: String(name).trim(),
    email: String(email).trim().toLowerCase(),
    profession: cleanProfession,
    locale: locale === 'en' ? 'en' : 'es',
    whatsapp: cleanWhatsapp,
    preferred_sessions: preferredSessions.length ? preferredSessions : null,
  };

  let { error } = await supabaseAdmin.from('cdmx_rsvps').insert(row);

  // Deploy-order safety: if migration 026 hasn't been applied yet, fall back
  // to the 023-era shape (WhatsApp + sessions folded into profession) rather
  // than dropping an event registration.
  if (error && (error.code === 'PGRST204' || error.code === '42703')) {
    console.warn('cdmx_rsvps missing 026 columns — falling back to folded insert');
    const folded = [
      cleanProfession ?? '',
      cleanWhatsapp ? `WA: ${cleanWhatsapp}` : '',
      preferredSessions.length ? `sesiones: ${preferredSessions.join(' > ')}` : '',
    ].filter(Boolean).join(' · ');
    ({ error } = await supabaseAdmin.from('cdmx_rsvps').insert({
      name: row.name,
      email: row.email,
      profession: folded || null,
      locale: row.locale,
    }));
  }

  if (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'This email is already registered' });
    }
    console.error('CDMX RSVP insert error:', error);
    return res.status(500).json({ error: 'Could not save your registration' });
  }

  // Send confirmation email (non-blocking)
  sendCdmxRsvpConfirmation(row.email, row.name, preferredSessions).catch((err) => {
    console.error('Failed to send CDMX RSVP confirmation email:', err);
  });

  return res.status(201).json({ ok: true });
}
