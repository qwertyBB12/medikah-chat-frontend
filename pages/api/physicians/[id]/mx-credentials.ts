import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { supabaseAdmin } from '../../../../lib/supabaseServer';
import type {
  SaveMXCredentialPayload,
  DeleteMXCredentialPayload,
  MXCredentialResponse,
  CedulaProfesionalEntry,
  RegistroEstatalEntry,
  CedulaEspecialidadEntry,
  ConsejoEntry,
  ColegioEntry,
} from '../../../../lib/mxCredentialTypes';
import { CURP_REGEX } from '../../../../lib/mxCredentialTypes';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ISO date string validation (YYYY-MM-DD)
function isValidDate(dateStr: string): boolean {
  if (!dateStr) return false;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

/**
 * Sync all MX credential data from normalized tables back into the physicians JSONB columns.
 * Uses a read-merge-write pattern: reads existing JSONB, filters out MX entries,
 * appends fresh MX entries, writes back. This preserves US entries.
 */
async function syncMXDualWrite(physicianId: string): Promise<void> {
  if (!supabaseAdmin) return;

  // Re-read all MX licenses
  const { data: licenses } = await supabaseAdmin
    .from('physician_licenses')
    .select('*')
    .eq('physician_id', physicianId)
    .eq('country_code', 'MX');

  // Re-read all MX certifications
  const { data: certifications } = await supabaseAdmin
    .from('physician_certifications')
    .select('*')
    .eq('physician_id', physicianId)
    .eq('country_code', 'MX');

  // Build MX JSONB entries for licenses array
  const mxLicensesJsonb = (licenses || []).map((l) => ({
    country: 'Mexico',
    countryCode: 'MX',
    type:
      l.license_type === 'cedula_profesional'
        ? 'Cédula Profesional'
        : l.license_type === 'cedula_especialidad'
          ? 'Cédula de Especialidad'
          : l.license_type === 'registro_estatal'
            ? 'Registro Estatal'
            : l.license_type,
    number: l.license_number || '',
    state: l.issuing_state || undefined,
    specialty: l.specialty || undefined,
  }));

  // Build MX JSONB entries for board_certifications array (Consejo certs only)
  const mxCertsJsonb = (certifications || [])
    .filter((c) => c.certification_type === 'consejo')
    .map((c) => ({
      board: c.certifying_body || '',
      certification: c.specialty || '',
      country: 'Mexico',
      countryCode: 'MX',
      recertificationYear: c.recertification_year || undefined,
    }));

  // Read current physicians JSONB columns
  const { data: physician } = await supabaseAdmin
    .from('physicians')
    .select('licenses, board_certifications')
    .eq('id', physicianId)
    .single();

  const currentLicenses: Record<string, unknown>[] = Array.isArray(physician?.licenses)
    ? physician.licenses
    : [];
  const currentCerts: Record<string, unknown>[] = Array.isArray(physician?.board_certifications)
    ? physician.board_certifications
    : [];

  // Filter out existing MX entries, append fresh MX entries
  const mergedLicenses = [
    ...currentLicenses.filter((l) => (l as Record<string, unknown>).countryCode !== 'MX'),
    ...mxLicensesJsonb,
  ];
  const mergedCerts = [
    ...currentCerts.filter((c) => (c as Record<string, unknown>).countryCode !== 'MX'),
    ...mxCertsJsonb,
  ];

  // Write merged arrays back
  await supabaseAdmin
    .from('physicians')
    .update({
      licenses: mergedLicenses,
      board_certifications: mergedCerts,
    })
    .eq('id', physicianId);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Method guard
  if (!['GET', 'POST', 'DELETE'].includes(req.method || '')) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth guard (T-06-08)
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Database null check
  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  // Extract physician ID from route params
  const { id: physicianId } = req.query;
  if (!physicianId || typeof physicianId !== 'string' || !UUID_REGEX.test(physicianId)) {
    return res.status(400).json({ error: 'Invalid physician ID' });
  }

  // Ownership check (T-06-08): authenticated user must own this physician record
  const { data: physician, error: lookupError } = await supabaseAdmin
    .from('physicians')
    .select('id, email, curp_number')
    .eq('id', physicianId)
    .single();

  if (lookupError || !physician) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (physician.email !== session.user.email.toLowerCase()) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    // ----------------------------------------------------------------
    // GET — return full MXCredentialResponse for the physician
    // ----------------------------------------------------------------
    if (req.method === 'GET') {
      // Fetch all MX licenses
      const { data: licenses, error: licensesError } = await supabaseAdmin
        .from('physician_licenses')
        .select('*')
        .eq('physician_id', physicianId)
        .eq('country_code', 'MX');

      if (licensesError) {
        console.error('Failed to fetch MX licenses:', licensesError);
        return res.status(500).json({ error: 'Failed to fetch MX credentials' });
      }

      // Fetch all MX certifications
      const { data: certifications, error: certsError } = await supabaseAdmin
        .from('physician_certifications')
        .select('*')
        .eq('physician_id', physicianId)
        .eq('country_code', 'MX');

      if (certsError) {
        console.error('Failed to fetch MX certifications:', certsError);
        return res.status(500).json({ error: 'Failed to fetch MX credentials' });
      }

      // Fetch INE and diploma documents for upload status
      const { data: documents } = await supabaseAdmin
        .from('physician_documents')
        .select('id, document_type, related_credential_id')
        .eq('physician_id', physicianId)
        .in('document_type', ['ine_front', 'ine_back', 'diploma_front', 'diploma_back']);

      const docs = documents || [];

      // Map cédula profesional (first row only — physicians have one per specialty)
      const cpRow = (licenses || []).find((l) => l.license_type === 'cedula_profesional') || null;
      const cedulaProfesional: CedulaProfesionalEntry | null = cpRow
        ? {
            id: cpRow.id,
            cedulaNumber: cpRow.license_number || '',
            verificationStatus:
              cpRow.verification_status as CedulaProfesionalEntry['verificationStatus'],
            verifiedAt: cpRow.verified_at || undefined,
          }
        : null;

      // Map registro estatal (first row only)
      const reRow = (licenses || []).find((l) => l.license_type === 'registro_estatal') || null;
      const registroEstatal: RegistroEstatalEntry | null = reRow
        ? {
            id: reRow.id,
            numeroRegistro: reRow.license_number || '',
            issuingState: reRow.issuing_state || '',
            degreeType: reRow.degree_type || '',
            registrationDate: reRow.issued_date || undefined,
          }
        : null;

      // Map especialidades (all cedula_especialidad rows)
      const especialidades: CedulaEspecialidadEntry[] = (licenses || [])
        .filter((l) => l.license_type === 'cedula_especialidad')
        .map((l) => ({
          id: l.id,
          cedulaNumber: l.license_number || '',
          specialtyName: l.specialty || '',
          institution: l.issuing_authority || '',
          completionDate: l.issued_date || undefined,
          diplomaFrontUploaded: docs.some(
            (d) => d.document_type === 'diploma_front' && d.related_credential_id === l.id
          ),
          diplomaBackUploaded: docs.some(
            (d) => d.document_type === 'diploma_back' && d.related_credential_id === l.id
          ),
          verificationStatus:
            l.verification_status as CedulaEspecialidadEntry['verificationStatus'],
        }));

      // Map consejos (all consejo rows)
      const consejos: ConsejoEntry[] = (certifications || [])
        .filter((c) => c.certification_type === 'consejo')
        .map((c) => ({
          id: c.id,
          consejoName: c.certifying_body || '',
          specialty: c.specialty || '',
          recertificationYear: c.recertification_year || undefined,
          pointThreshold: undefined, // Phase 8 concern
          verificationStatus: c.verification_status as ConsejoEntry['verificationStatus'],
        }));

      // Map colegios (all colegio_membership rows)
      const colegios: ColegioEntry[] = (certifications || [])
        .filter((c) => c.certification_type === 'colegio_membership')
        .map((c) => ({
          id: c.id,
          colegioName: c.certifying_body || '',
          membershipNumber: c.member_number || undefined,
        }));

      const response: MXCredentialResponse = {
        identity: {
          curp: physician.curp_number || undefined,
          ineFrontUploaded: docs.some((d) => d.document_type === 'ine_front'),
          ineBackUploaded: docs.some((d) => d.document_type === 'ine_back'),
        },
        cedulaProfesional,
        registroEstatal,
        especialidades,
        consejos,
        colegios,
      };

      return res.status(200).json(response);
    }

    // ----------------------------------------------------------------
    // POST — save credential by section (or save CURP identity)
    // ----------------------------------------------------------------
    if (req.method === 'POST') {
      const body = req.body as {
        section: string;
        data: Record<string, unknown>;
      };

      if (!body || !body.section || !body.data) {
        return res.status(400).json({ error: 'section and data are required' });
      }

      const { section } = body;

      // ---- IDENTITY: CURP save ----
      // Handled as a special section outside the SaveMXCredentialPayload discriminated union
      if (section === 'identity') {
        const identityData = body.data as { curp: string };
        if (!identityData.curp || !CURP_REGEX.test(identityData.curp)) {
          return res.status(400).json({ error: 'curp must be a valid 18-character CURP (T-06-10)' });
        }

        const { error: curpError } = await supabaseAdmin
          .from('physicians')
          .update({ curp_number: identityData.curp.toUpperCase() })
          .eq('id', physicianId);

        if (curpError) {
          console.error('CURP update failed:', curpError);
          return res.status(500).json({ error: 'Failed to save CURP' });
        }

        return res.status(200).json({ success: true });
      }

      // ---- CEDULA PROFESIONAL ----
      if (section === 'cedula_profesional') {
        const cpData = body.data as unknown as CedulaProfesionalEntry;
        if (!cpData.cedulaNumber || cpData.cedulaNumber.trim() === '') {
          return res.status(400).json({ error: 'cedulaNumber is required' });
        }

        if (cpData.id) {
          const { error } = await supabaseAdmin
            .from('physician_licenses')
            .update({
              license_number: cpData.cedulaNumber.trim(),
              expiration_date: null, // lifetime — no expiration (per PROJECT.md)
              updated_at: new Date().toISOString(),
            })
            .eq('id', cpData.id)
            .eq('physician_id', physicianId);

          if (error) {
            console.error('Cédula Profesional update failed:', error);
            return res.status(500).json({ error: 'Failed to update Cédula Profesional' });
          }

          await syncMXDualWrite(physicianId);
          return res.status(201).json({ success: true, credentialId: cpData.id });
        } else {
          const { data: inserted, error } = await supabaseAdmin
            .from('physician_licenses')
            .insert({
              physician_id: physicianId,
              country_code: 'MX',
              license_type: 'cedula_profesional',
              license_number: cpData.cedulaNumber.trim(),
              expiration_date: null, // lifetime — no expiration
              verification_status: 'pending',
            })
            .select('id')
            .single();

          if (error) {
            console.error('Cédula Profesional insert failed:', error);
            return res.status(500).json({ error: 'Failed to save Cédula Profesional' });
          }

          await syncMXDualWrite(physicianId);
          return res.status(201).json({ success: true, credentialId: inserted?.id });
        }
      }

      // ---- REGISTRO ESTATAL ----
      if (section === 'registro_estatal') {
        const reData = body.data as unknown as RegistroEstatalEntry;
        if (!reData.numeroRegistro || reData.numeroRegistro.trim() === '') {
          return res.status(400).json({ error: 'numeroRegistro is required' });
        }
        if (!reData.issuingState || reData.issuingState.trim() === '') {
          return res.status(400).json({ error: 'issuingState is required' });
        }
        if (reData.registrationDate && !isValidDate(reData.registrationDate)) {
          return res.status(400).json({
            error: 'registrationDate must be a valid ISO date (YYYY-MM-DD)',
          });
        }

        if (reData.id) {
          const { error } = await supabaseAdmin
            .from('physician_licenses')
            .update({
              license_number: reData.numeroRegistro.trim(),
              issuing_state: reData.issuingState.trim(),
              degree_type: reData.degreeType || null,
              issued_date: reData.registrationDate || null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', reData.id)
            .eq('physician_id', physicianId);

          if (error) {
            console.error('Registro Estatal update failed:', error);
            return res.status(500).json({ error: 'Failed to update Registro Estatal' });
          }

          await syncMXDualWrite(physicianId);
          return res.status(201).json({ success: true, credentialId: reData.id });
        } else {
          const { data: inserted, error } = await supabaseAdmin
            .from('physician_licenses')
            .insert({
              physician_id: physicianId,
              country_code: 'MX',
              license_type: 'registro_estatal',
              license_number: reData.numeroRegistro.trim(),
              issuing_state: reData.issuingState.trim(),
              degree_type: reData.degreeType || null,
              issued_date: reData.registrationDate || null,
              verification_status: 'pending',
            })
            .select('id')
            .single();

          if (error) {
            console.error('Registro Estatal insert failed:', error);
            return res.status(500).json({ error: 'Failed to save Registro Estatal' });
          }

          await syncMXDualWrite(physicianId);
          return res.status(201).json({ success: true, credentialId: inserted?.id });
        }
      }

      // ---- CEDULA ESPECIALIDAD ----
      if (section === 'cedula_especialidad') {
        const ceData = body.data as unknown as CedulaEspecialidadEntry;
        if (!ceData.cedulaNumber || ceData.cedulaNumber.trim() === '') {
          return res.status(400).json({ error: 'cedulaNumber is required' });
        }
        if (!ceData.specialtyName || ceData.specialtyName.trim() === '') {
          return res.status(400).json({ error: 'specialtyName is required' });
        }
        if (ceData.completionDate && !isValidDate(ceData.completionDate)) {
          return res.status(400).json({
            error: 'completionDate must be a valid ISO date (YYYY-MM-DD)',
          });
        }

        if (ceData.id) {
          const { error } = await supabaseAdmin
            .from('physician_licenses')
            .update({
              license_number: ceData.cedulaNumber.trim(),
              specialty: ceData.specialtyName.trim(),
              issuing_authority: ceData.institution || null,
              issued_date: ceData.completionDate || null,
              expiration_date: null, // lifetime — no expiration (per PROJECT.md)
              updated_at: new Date().toISOString(),
            })
            .eq('id', ceData.id)
            .eq('physician_id', physicianId);

          if (error) {
            console.error('Cédula Especialidad update failed:', error);
            return res.status(500).json({ error: 'Failed to update Cédula de Especialidad' });
          }

          await syncMXDualWrite(physicianId);
          return res.status(201).json({ success: true, credentialId: ceData.id });
        } else {
          const { data: inserted, error } = await supabaseAdmin
            .from('physician_licenses')
            .insert({
              physician_id: physicianId,
              country_code: 'MX',
              license_type: 'cedula_especialidad',
              license_number: ceData.cedulaNumber.trim(),
              specialty: ceData.specialtyName.trim(),
              issuing_authority: ceData.institution || null,
              issued_date: ceData.completionDate || null,
              expiration_date: null, // lifetime — no expiration
              verification_status: 'pending',
            })
            .select('id')
            .single();

          if (error) {
            console.error('Cédula Especialidad insert failed:', error);
            return res.status(500).json({ error: 'Failed to save Cédula de Especialidad' });
          }

          await syncMXDualWrite(physicianId);
          return res.status(201).json({ success: true, credentialId: inserted?.id });
        }
      }

      // ---- CONSEJO ----
      if (section === 'consejo') {
        const consejoData = body.data as unknown as ConsejoEntry;
        if (!consejoData.consejoName || consejoData.consejoName.trim() === '') {
          return res.status(400).json({ error: 'consejoName is required' });
        }
        if (!consejoData.specialty || consejoData.specialty.trim() === '') {
          return res.status(400).json({ error: 'specialty is required' });
        }

        if (consejoData.id) {
          const { error } = await supabaseAdmin
            .from('physician_certifications')
            .update({
              certifying_body: consejoData.consejoName.trim(),
              specialty: consejoData.specialty.trim(),
              recertification_year: consejoData.recertificationYear || null,
              point_threshold_met: null, // Phase 8 concern
              updated_at: new Date().toISOString(),
            })
            .eq('id', consejoData.id)
            .eq('physician_id', physicianId);

          if (error) {
            console.error('Consejo update failed:', error);
            return res.status(500).json({ error: 'Failed to update Consejo certification' });
          }

          await syncMXDualWrite(physicianId);
          return res.status(201).json({ success: true, credentialId: consejoData.id });
        } else {
          const { data: inserted, error } = await supabaseAdmin
            .from('physician_certifications')
            .insert({
              physician_id: physicianId,
              country_code: 'MX',
              certification_type: 'consejo',
              certifying_body: consejoData.consejoName.trim(),
              specialty: consejoData.specialty.trim(),
              recertification_year: consejoData.recertificationYear || null,
              point_threshold_met: null, // Phase 8 concern
              verification_status: 'pending',
            })
            .select('id')
            .single();

          if (error) {
            console.error('Consejo insert failed:', error);
            return res.status(500).json({ error: 'Failed to save Consejo certification' });
          }

          await syncMXDualWrite(physicianId);
          return res.status(201).json({ success: true, credentialId: inserted?.id });
        }
      }

      // ---- COLEGIO ----
      if (section === 'colegio') {
        const colegioData = body.data as unknown as ColegioEntry;
        if (!colegioData.colegioName || colegioData.colegioName.trim() === '') {
          return res.status(400).json({ error: 'colegioName is required' });
        }

        if (colegioData.id) {
          const { error } = await supabaseAdmin
            .from('physician_certifications')
            .update({
              certifying_body: colegioData.colegioName.trim(),
              member_number: colegioData.membershipNumber || null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', colegioData.id)
            .eq('physician_id', physicianId);

          if (error) {
            console.error('Colegio update failed:', error);
            return res.status(500).json({ error: 'Failed to update Colegio membership' });
          }

          await syncMXDualWrite(physicianId);
          return res.status(201).json({ success: true, credentialId: colegioData.id });
        } else {
          const { data: inserted, error } = await supabaseAdmin
            .from('physician_certifications')
            .insert({
              physician_id: physicianId,
              country_code: 'MX',
              certification_type: 'colegio_membership',
              certifying_body: colegioData.colegioName.trim(),
              member_number: colegioData.membershipNumber || null,
              verification_status: 'pending',
            })
            .select('id')
            .single();

          if (error) {
            console.error('Colegio insert failed:', error);
            return res.status(500).json({ error: 'Failed to save Colegio membership' });
          }

          await syncMXDualWrite(physicianId);
          return res.status(201).json({ success: true, credentialId: inserted?.id });
        }
      }

      return res.status(400).json({ error: `Unknown credential section: ${section}` });
    }

    // ----------------------------------------------------------------
    // DELETE — remove a MX credential entry (T-06-11)
    // ----------------------------------------------------------------
    if (req.method === 'DELETE') {
      const body = req.body as DeleteMXCredentialPayload;

      if (!body || !body.section || !body.credentialId) {
        return res.status(400).json({ error: 'section and credentialId are required' });
      }

      const { section, credentialId } = body;

      if (!UUID_REGEX.test(credentialId)) {
        return res.status(400).json({ error: 'credentialId must be a valid UUID' });
      }

      if (
        section === 'cedula_profesional' ||
        section === 'registro_estatal' ||
        section === 'cedula_especialidad'
      ) {
        // Verify credential belongs to this physician (T-06-11)
        const { data: existing, error: fetchErr } = await supabaseAdmin
          .from('physician_licenses')
          .select('id, physician_id')
          .eq('id', credentialId)
          .eq('physician_id', physicianId)
          .single();

        if (fetchErr || !existing) {
          return res.status(403).json({ error: 'Credential not found or forbidden' });
        }

        const { error } = await supabaseAdmin
          .from('physician_licenses')
          .delete()
          .eq('id', credentialId)
          .eq('physician_id', physicianId);

        if (error) {
          console.error('MX license delete failed:', error);
          return res.status(500).json({ error: 'Failed to delete credential' });
        }
      } else if (section === 'consejo' || section === 'colegio') {
        // Verify credential belongs to this physician (T-06-11)
        const { data: existing, error: fetchErr } = await supabaseAdmin
          .from('physician_certifications')
          .select('id, physician_id')
          .eq('id', credentialId)
          .eq('physician_id', physicianId)
          .single();

        if (fetchErr || !existing) {
          return res.status(403).json({ error: 'Credential not found or forbidden' });
        }

        const { error } = await supabaseAdmin
          .from('physician_certifications')
          .delete()
          .eq('id', credentialId)
          .eq('physician_id', physicianId);

        if (error) {
          console.error('MX certification delete failed:', error);
          return res.status(500).json({ error: 'Failed to delete credential' });
        }
      } else {
        return res.status(400).json({ error: `Unknown credential section: ${section}` });
      }

      // Sync dual-write after delete
      await syncMXDualWrite(physicianId);

      return res.status(200).json({ success: true });
    }
  } catch (err) {
    console.error('MX credentials handler exception:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
