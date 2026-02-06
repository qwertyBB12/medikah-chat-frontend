import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseServer';

// Convert camelCase to snake_case for database
function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      result[snakeKey] = obj[key];
    }
  }
  return result;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseAdmin) {
    console.error('Supabase admin client not configured');
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    const data = req.body;

    console.log('[API] Received physician data:', JSON.stringify(data, null, 2));

    if (!data || !data.fullName || !data.email) {
      console.error('[API] Missing required fields. Data received:', data);
      return res.status(400).json({
        error: 'Full name and email are required',
        received: { fullName: data?.fullName, email: data?.email }
      });
    }

    // Convert to snake_case for database
    const dbData = toSnakeCase(data);

    // Ensure email is lowercase
    if (typeof dbData.email === 'string') {
      dbData.email = dbData.email.toLowerCase();
    }

    const { data: result, error } = await supabaseAdmin
      .from('physicians')
      .insert(dbData)
      .select('id')
      .single();

    if (error) {
      console.error('Error creating physician profile:', error);

      // Check for duplicate email
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Email already registered' });
      }

      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ success: true, physicianId: result.id });
  } catch (err) {
    console.error('Exception creating physician profile:', err);
    return res.status(500).json({ error: 'Failed to create profile' });
  }
}
