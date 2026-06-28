import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { supabaseAdmin } from '../../../../lib/supabaseServer';
import { sessionOwnsPhysician } from '../../../../lib/physicianAuthz';
import type {
  PhysicianSpecialty,
  SaveSpecialtyPayload,
} from '../../../../lib/specialtyTypes';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// DB row (snake_case) ↔ PhysicianSpecialty (camelCase)
interface SpecialtyRow {
  id: string;
  country: string;
  name: string;
  role: string;
  board_certified: boolean;
  certifying_board: string | null;
  certification_number: string | null;
  expiration_year: number | null;
  verification_status: string;
  verification_source: string | null;
  verified_at: string | null;
}

function rowToSpecialty(r: SpecialtyRow): PhysicianSpecialty {
  return {
    id: r.id,
    country: r.country as PhysicianSpecialty['country'],
    name: r.name,
    role: r.role as PhysicianSpecialty['role'],
    boardCertified: r.board_certified,
    certifyingBoard: r.certifying_board ?? undefined,
    certificationNumber: r.certification_number ?? undefined,
    expirationYear: r.expiration_year ?? undefined,
    verificationStatus:
      r.verification_status as PhysicianSpecialty['verificationStatus'],
    verificationSource:
      (r.verification_source as PhysicianSpecialty['verificationSource']) ?? null,
    verifiedAt: r.verified_at ?? undefined,
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  if (typeof id !== 'string' || !UUID_REGEX.test(id)) {
    return res.status(400).json({ error: 'Invalid physician id' });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  // Ownership: fetch the record (for the legacy email fallback) then authorize.
  const session = await getServerSession(req, res, authOptions);
  const { data: physician, error: physErr } = await supabaseAdmin
    .from('physicians')
    .select('id, email')
    .eq('id', id)
    .single();

  if (physErr || !physician) {
    return res.status(404).json({ error: 'Physician not found' });
  }
  if (!sessionOwnsPhysician(session, physician, id)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // ── GET: list canonical specialties ───────────────────────────────
  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('physician_specialties')
      .select('*')
      .eq('physician_id', id)
      .order('role', { ascending: true }) // 'primary' before 'subspecialty'
      .order('created_at', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res
      .status(200)
      .json({ specialties: (data as SpecialtyRow[]).map(rowToSpecialty) });
  }

  // ── PUT: upsert one specialty ─────────────────────────────────────
  if (req.method === 'PUT') {
    const { specialty } = req.body as SaveSpecialtyPayload;
    if (!specialty || !specialty.name?.trim()) {
      return res.status(400).json({ error: 'specialty.name is required' });
    }
    if (specialty.role !== 'primary' && specialty.role !== 'subspecialty') {
      return res.status(400).json({ error: 'invalid role' });
    }
    if (specialty.country !== 'US' && specialty.country !== 'MX') {
      return res.status(400).json({ error: 'invalid country' });
    }

    // Board-cert fields only persist when boardCertified is true.
    const row = {
      physician_id: id,
      country: specialty.country,
      name: specialty.name.trim(),
      role: specialty.role,
      board_certified: !!specialty.boardCertified,
      certifying_board: specialty.boardCertified
        ? specialty.certifyingBoard?.trim() || null
        : null,
      // Certification number is a US-board concept (e.g. ABIM ID). Never captured
      // for MX rows, per Dr. Aguirre (MX Consejo is a separate path entirely).
      certification_number:
        specialty.boardCertified && specialty.country === 'US'
          ? specialty.certificationNumber?.trim() || null
          : null,
      expiration_year: specialty.boardCertified
        ? specialty.expirationYear ?? null
        : null,
      // Verification is set by the NPI/SEP lookups or admin — never auto-flipped here.
      verification_status: specialty.verificationStatus || 'pending',
      verification_source: specialty.verificationSource ?? null,
      updated_at: new Date().toISOString(),
    };

    if (specialty.id && UUID_REGEX.test(specialty.id)) {
      const { error } = await supabaseAdmin
        .from('physician_specialties')
        .update(row)
        .eq('id', specialty.id)
        .eq('physician_id', id); // scope to owner
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true, credentialId: specialty.id });
    }

    const { data, error } = await supabaseAdmin
      .from('physician_specialties')
      .insert(row)
      .select('id')
      .single();
    if (error) {
      if (error.code === '23505') {
        return res
          .status(409)
          .json({ error: 'That specialty already exists for this country' });
      }
      return res.status(500).json({ error: error.message });
    }
    return res.status(201).json({ success: true, credentialId: data.id });
  }

  // ── DELETE: remove one specialty by id ────────────────────────────
  if (req.method === 'DELETE') {
    const { credentialId } = req.body as { credentialId?: string };
    if (!credentialId || !UUID_REGEX.test(credentialId)) {
      return res.status(400).json({ error: 'Invalid credentialId' });
    }
    const { error } = await supabaseAdmin
      .from('physician_specialties')
      .delete()
      .eq('id', credentialId)
      .eq('physician_id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  res.setHeader('Allow', 'GET, PUT, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
}
