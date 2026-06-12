import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { sendWaitlistConfirmation } from '../../lib/email';
import { checkRateLimit, extractSourceIp } from '../../lib/simpleRateLimit';

const VALID_ROLES = ['patient', 'doctor', 'insurer', 'employer'] as const;

// Rate-limited per IP: each POST sends one Resend email (shared daily quota).
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!checkRateLimit('waitlist', extractSourceIp(req), RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS)) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  const { name, email, role } = req.body ?? {};

  if (!name || !email || !role) {
    return res.status(400).json({ error: 'Name, email, and role are required' });
  }
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Database unavailable' });
  }

  const { error } = await supabase.from('waitlist').insert({ name, email, role });

  if (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'This email is already registered' });
    }
    console.error('Waitlist insert error:', error);
    return res.status(500).json({ error: 'Could not save registration' });
  }

  // Send confirmation email (non-blocking)
  sendWaitlistConfirmation(email).catch((err) => {
    console.error('Failed to send waitlist confirmation email:', err);
  });

  return res.status(201).json({ ok: true });
}
