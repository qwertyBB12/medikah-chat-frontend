import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { supabaseAdmin } from '../../../../lib/supabaseServer';
import { sessionOwnsPhysician } from '../../../../lib/physicianAuthz';
import type {
  PhysicianEducation,
  SaveEducationPayload,
} from '../../../../lib/educationTypes';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// DB row (snake_case) ↔ PhysicianEducation (camelCase)
interface EducationRow {
  id: string;
  kind: string;
  institution: string;
  country: string | null;
  specialty: string | null;
  start_year: number | null;
  end_year: number | null;
  verification_status: string;
  verification_source: string | null;
  verified_at: string | null;
}

function rowToEducation(r: EducationRow): PhysicianEducation {
  return {
    id: r.id,
    kind: r.kind as PhysicianEducation['kind'],
    institution: r.institution,
    country: r.country ?? undefined,
    specialty: r.specialty ?? undefined,
    startYear: r.start_year ?? undefined,
    endYear: r.end_year ?? undefined,
    verificationStatus:
      r.verification_status as PhysicianEducation['verificationStatus'],
    verificationSource:
      (r.verification_source as PhysicianEducation['verificationSource']) ?? null,
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

  // ── GET: list canonical education entries ─────────────────────────
  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('physician_education')
      .select('*')
      .eq('physician_id', id)
      .order('kind', { ascending: true }) // fellowship, medical_school, residency
      .order('start_year', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res
      .status(200)
      .json({ education: (data as EducationRow[]).map(rowToEducation) });
  }

  // ── PUT: upsert one education entry ───────────────────────────────
  if (req.method === 'PUT') {
    const { education } = req.body as SaveEducationPayload;
    if (!education || !education.institution?.trim()) {
      return res.status(400).json({ error: 'education.institution is required' });
    }
    if (
      education.kind !== 'medical_school' &&
      education.kind !== 'residency' &&
      education.kind !== 'fellowship'
    ) {
      return res.status(400).json({ error: 'invalid kind' });
    }

    // medical_school carries country; residency/fellowship carry specialty +
    // start year. Persist only the fields that apply to the kind.
    const isSchool = education.kind === 'medical_school';
    const row = {
      physician_id: id,
      kind: education.kind,
      institution: education.institution.trim(),
      country: isSchool ? education.country?.trim() || null : null,
      specialty: isSchool ? null : education.specialty?.trim() || null,
      start_year: isSchool ? null : education.startYear ?? null,
      end_year: education.endYear ?? null,
      // Verification is set by an admin (B3) — never auto-flipped here.
      verification_status: education.verificationStatus || 'pending',
      verification_source: education.verificationSource ?? null,
      updated_at: new Date().toISOString(),
    };

    if (education.id && UUID_REGEX.test(education.id)) {
      const { error } = await supabaseAdmin
        .from('physician_education')
        .update(row)
        .eq('id', education.id)
        .eq('physician_id', id); // scope to owner
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true, credentialId: education.id });
    }

    const { data, error } = await supabaseAdmin
      .from('physician_education')
      .insert(row)
      .select('id')
      .single();
    if (error) {
      if (error.code === '23505') {
        return res
          .status(409)
          .json({ error: 'That education entry already exists' });
      }
      return res.status(500).json({ error: error.message });
    }
    return res.status(201).json({ success: true, credentialId: data.id });
  }

  // ── DELETE: remove one education entry by id ──────────────────────
  if (req.method === 'DELETE') {
    const { credentialId } = req.body as { credentialId?: string };
    if (!credentialId || !UUID_REGEX.test(credentialId)) {
      return res.status(400).json({ error: 'Invalid credentialId' });
    }
    const { error } = await supabaseAdmin
      .from('physician_education')
      .delete()
      .eq('id', credentialId)
      .eq('physician_id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  res.setHeader('Allow', 'GET, PUT, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
}
