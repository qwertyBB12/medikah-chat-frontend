import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';

const VALID_ROLES = ['patient', 'doctor', 'insurer', 'employer'] as const;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

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

  return res.status(201).json({ ok: true });
}
