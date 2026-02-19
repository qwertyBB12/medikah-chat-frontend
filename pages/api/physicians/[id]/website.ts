/**
 * GET/PUT /api/physicians/{id}/website
 *
 * GET  — Public read of physician website data (no auth required)
 * PUT  — Auth-gated upsert of physician website data
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { supabaseAdmin } from '../../../../lib/supabaseServer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Physician ID is required' });
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return res.status(400).json({ error: 'Invalid physician ID format' });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  if (req.method === 'GET') {
    return handleGet(req, res, id);
  }

  if (req.method === 'PUT') {
    return handlePut(req, res, id);
  }

  res.setHeader('Allow', ['GET', 'PUT']);
  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}

async function handleGet(_req: NextApiRequest, res: NextApiResponse, physicianId: string) {
  try {
    const { data, error } = await supabaseAdmin!
      .from('physician_website')
      .select('*')
      .eq('physician_id', physicianId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching website data:', error);
      return res.status(500).json({ error: 'Failed to fetch website data' });
    }

    return res.status(200).json({ data });
  } catch (err) {
    console.error('Exception fetching website data:', err);
    return res.status(500).json({ error: 'Failed to fetch website data' });
  }
}

async function handlePut(req: NextApiRequest, res: NextApiResponse, physicianId: string) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    // Verify the session user owns this physician record
    const { data: physician, error: lookupError } = await supabaseAdmin!
      .from('physicians')
      .select('id, email')
      .eq('id', physicianId)
      .single();

    if (lookupError || !physician) {
      return res.status(404).json({ error: 'Physician not found' });
    }

    if (physician.email.toLowerCase() !== session.user.email.toLowerCase()) {
      return res.status(403).json({ error: 'Not authorized to edit this physician website' });
    }

    const {
      enabled,
      practice_philosophy,
      value_pillars,
      services,
      faqs,
      office_address,
      office_city,
      office_country,
      office_phone,
      office_email,
      appointment_url,
      custom_tagline,
    } = req.body;

    // Validate appointment_url scheme to prevent stored XSS (javascript: URIs)
    if (appointment_url && typeof appointment_url === 'string') {
      const trimmed = appointment_url.trim();
      if (trimmed && !/^https?:\/\//i.test(trimmed)) {
        return res.status(400).json({ error: 'Appointment URL must start with http:// or https://' });
      }
    }

    const { data, error } = await supabaseAdmin!
      .from('physician_website')
      .upsert(
        {
          physician_id: physicianId,
          enabled: enabled ?? true,
          practice_philosophy: practice_philosophy ?? null,
          value_pillars: value_pillars ?? [],
          services: services ?? [],
          faqs: faqs ?? [],
          office_address: office_address ?? null,
          office_city: office_city ?? null,
          office_country: office_country ?? null,
          office_phone: office_phone ?? null,
          office_email: office_email ?? null,
          appointment_url: appointment_url ?? null,
          custom_tagline: custom_tagline ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'physician_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('Error upserting website data:', error);
      return res.status(500).json({ error: 'Failed to save website data' });
    }

    return res.status(200).json({ data });
  } catch (err) {
    console.error('Exception saving website data:', err);
    return res.status(500).json({ error: 'Failed to save website data' });
  }
}
