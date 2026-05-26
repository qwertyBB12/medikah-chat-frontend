import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../lib/supabaseServer';
import { sendCdmxRsvpConfirmation } from '../../lib/email';

// RSVP capture for the Mexico City launch event (medikah.health/cdmx).
// Writes via the service-role client (RLS-locked table); sends a Spanish
// confirmation email. Mirrors the /api/waitlist pattern.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, whatsapp, profession, dates, locale } = req.body ?? {};

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }
  // basic email shape check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  // No schema change yet: fold WhatsApp + chosen dates into the profession column.
  const dateList = Array.isArray(dates) ? dates.join(', ') : '';
  const prof = [
    profession ? String(profession).trim() : '',
    whatsapp ? `WA: ${String(whatsapp).trim()}` : '',
    dateList ? `fechas: ${dateList}` : '',
  ].filter(Boolean).join(' · ');
  const row = {
    name: String(name).trim(),
    email: String(email).trim().toLowerCase(),
    profession: prof || null,
    locale: locale === 'en' ? 'en' : 'es',
  };

  const { error } = await supabaseAdmin.from('cdmx_rsvps').insert(row);

  if (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'This email is already registered' });
    }
    console.error('CDMX RSVP insert error:', error);
    return res.status(500).json({ error: 'Could not save your registration' });
  }

  // Send confirmation email (non-blocking)
  sendCdmxRsvpConfirmation(row.email, row.name).catch((err) => {
    console.error('Failed to send CDMX RSVP confirmation email:', err);
  });

  return res.status(201).json({ ok: true });
}
