import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { supabaseAdmin } from '../../../lib/supabaseServer';
import crypto from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    const {
      physicianId,
      dataSnapshot,
      language = 'en',
      attestationVersion = '1.0',
    } = req.body;

    if (!physicianId || !dataSnapshot) {
      return res.status(400).json({ error: 'physicianId and dataSnapshot are required' });
    }

    // Ownership verification (CRITICAL — prevents spoofing, T-04-01)
    // The authenticated user must own the physician record they are attesting
    const { data: physician, error: lookupError } = await supabaseAdmin
      .from('physicians')
      .select('id, email')
      .eq('id', physicianId)
      .single();

    if (lookupError || !physician) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (physician.email !== session.user.email.toLowerCase()) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Compute SHA-256 hash of data snapshot for tamper evidence (T-04-02)
    const dataSnapshotHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(dataSnapshot))
      .digest('hex');

    // Extract client metadata for the legal audit trail
    const ipAddress =
      req.headers['x-forwarded-for']?.toString().split(',')[0] ||
      req.socket.remoteAddress ||
      null;
    const userAgent = req.headers['user-agent'] || null;

    // Insert attestation record — attested_at is set server-side (client cannot override)
    const { error: insertError } = await supabaseAdmin
      .from('physician_attestation_records')
      .insert({
        physician_id: physicianId,
        attestation_version: attestationVersion,
        attested_at: new Date().toISOString(),
        data_snapshot: dataSnapshot,
        data_snapshot_hash: dataSnapshotHash,
        ip_address: ipAddress,
        user_agent: userAgent,
        language,
      });

    if (insertError) {
      console.error('Attestation save failed:', insertError);
      return res.status(500).json({ error: 'Failed to save attestation record' });
    }

    // Update physicians.attestation_completed_at
    const { error: updateError } = await supabaseAdmin
      .from('physicians')
      .update({ attestation_completed_at: new Date().toISOString() })
      .eq('id', physicianId);

    if (updateError) {
      console.error('Failed to update attestation_completed_at:', updateError);
      // Don't fail the request — the attestation record was saved successfully
    }

    return res.status(201).json({ success: true });
  } catch (err) {
    console.error('Attestation save failed:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
