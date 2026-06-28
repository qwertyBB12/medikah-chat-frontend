/**
 * US identity verification — State ID / Driver License (Aguirre credentialing change 4).
 *
 * Mirrors the MX CURP/INE identity workflow so US physicians have an equivalent
 * identity item: an issuing state + ID number (scalar columns on `physicians`)
 * plus front/back document uploads (physician_documents, document_type us_id_*).
 *
 * Scalars only here; the image uploads go through /api/physicians/[id]/documents.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { supabaseAdmin } from '../../../../lib/supabaseServer';
import { sessionOwnsPhysician } from '../../../../lib/physicianAuthz';
import type { USIdentity, SaveUSIdentityField } from '../../../../lib/usIdentityTypes';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Whitelist of writable scalar fields → physicians columns (no arbitrary updates).
const FIELD_TO_COLUMN: Record<SaveUSIdentityField['field'], string> = {
  issuingState: 'us_id_issuing_state',
  idNumber: 'us_id_number',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!['GET', 'PUT'].includes(req.method || '')) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const { id: physicianId } = req.query;
  if (!physicianId || typeof physicianId !== 'string' || !UUID_REGEX.test(physicianId)) {
    return res.status(400).json({ error: 'Invalid physician ID' });
  }

  // Ownership check
  const { data: physician, error: lookupError } = await supabaseAdmin
    .from('physicians')
    .select('id, email, us_id_issuing_state, us_id_number')
    .eq('id', physicianId)
    .single();

  if (lookupError || !physician) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!sessionOwnsPhysician(session, physician, physicianId)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    // ── GET: scalars + upload booleans ──────────────────────────────
    if (req.method === 'GET') {
      const { data: documents } = await supabaseAdmin
        .from('physician_documents')
        .select('document_type')
        .eq('physician_id', physicianId)
        .in('document_type', ['us_id_front', 'us_id_back']);

      const docs = documents || [];
      const identity: USIdentity = {
        issuingState: physician.us_id_issuing_state || undefined,
        idNumber: physician.us_id_number || undefined,
        idFrontUploaded: docs.some((d) => d.document_type === 'us_id_front'),
        idBackUploaded: docs.some((d) => d.document_type === 'us_id_back'),
      };
      return res.status(200).json(identity);
    }

    // ── PUT: update one scalar field ────────────────────────────────
    if (req.method === 'PUT') {
      const body = req.body as SaveUSIdentityField;
      if (!body || !body.field || body.value === undefined) {
        return res.status(400).json({ error: 'field and value are required' });
      }
      if (!(body.field in FIELD_TO_COLUMN)) {
        return res.status(400).json({ error: `Unknown field: ${body.field}` });
      }
      const column = FIELD_TO_COLUMN[body.field];
      const { error } = await supabaseAdmin
        .from('physicians')
        .update({ [column]: body.value })
        .eq('id', physicianId);

      if (error) {
        console.error('Failed to update US identity field:', error);
        return res.status(500).json({ error: 'Failed to save US identity' });
      }
      return res.status(200).json({ success: true });
    }
  } catch (err) {
    console.error('US identity handler exception:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
