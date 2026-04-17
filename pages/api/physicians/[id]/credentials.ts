import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { supabaseAdmin } from '../../../../lib/supabaseServer';
import type {
  SaveCredentialPayload,
  DeleteCredentialPayload,
  CredentialResponse,
  NPIEntry,
  USLicenseEntry,
  USBoardCertEntry,
  USSubSpecialtyEntry,
} from '../../../../lib/credentialTypes';
import { verifyStateLicense } from '../../../../lib/stateBoardVerify';
import {
  logCreate,
  logUpdateDiff,
  logDelete,
} from '../../../../lib/credentialAuditService';

// Fields watched by credential_audit_log for each normalized table (Plan 08-03).
// Only these fields produce audit rows on UPDATE; other columns (timestamps,
// raw blobs, verification_source) are not worth the noise.
const LICENSE_WATCH_FIELDS = [
  'license_number',
  'issuing_state',
  'license_type',
  'expiration_date',
  'issued_date',
  'is_primary',
  'verification_status',
  'manual_review_required',
  'specialty',
  'issuing_authority',
  'degree_type',
] as const;

const CERTIFICATION_WATCH_FIELDS = [
  'certifying_body',
  'specialty',
  'certification_type',
  'issued_date',
  'expiration_date',
  'recertification_year',
  'point_threshold_met',
  'verification_status',
  'manual_review_required',
  'member_number',
] as const;

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
 * Sync all US credential data from normalized tables back into the physicians JSONB columns.
 * This maintains backward compatibility per D-11.
 *
 * Note (Phase 8): JSONB dual-write sync does NOT emit credential_audit_log rows.
 * Those rows are emitted at the normalized-table write sites (physician_licenses /
 * physician_certifications). The physicians JSONB columns are a derived view
 * maintained for backward compat only (D-11). Logging every JSONB reshuffle would
 * produce a duplicate audit row per CRUD call.
 */
async function syncDualWrite(physicianId: string): Promise<void> {
  if (!supabaseAdmin) return;

  // Re-read all US licenses
  const { data: licenses } = await supabaseAdmin
    .from('physician_licenses')
    .select('*')
    .eq('physician_id', physicianId)
    .eq('country_code', 'US');

  // Re-read all US certifications
  const { data: certifications } = await supabaseAdmin
    .from('physician_certifications')
    .select('*')
    .eq('physician_id', physicianId)
    .eq('country_code', 'US');

  // Build JSONB-compatible arrays matching the old PhysicianLicense shape
  const licensesJsonb = (licenses || [])
    .filter((l) => l.license_type === 'state_medical' || l.license_type === 'npi')
    .map((l) => ({
      country: 'United States',
      countryCode: 'US',
      type: l.license_type === 'npi' ? 'NPI' : 'State Medical License',
      number: l.license_number || '',
      state: l.issuing_state || undefined,
    }));

  // Build board_certifications JSONB array matching BoardCertification shape
  const boardCertsJsonb = (certifications || [])
    .filter((c) => c.certification_type === 'board_cert')
    .map((c) => ({
      board: c.certifying_body || '',
      certification: c.specialty || '',
      year: c.issued_date ? new Date(c.issued_date).getFullYear() : undefined,
    }));

  // Build sub_specialties JSONB array (just specialty name strings)
  const subSpecialtiesJsonb = (certifications || [])
    .filter(
      (c) => c.certification_type === 'sub_specialty' || c.certification_type === 'fellowship'
    )
    .map((c) => c.specialty || '');

  // Update physicians table JSONB columns
  await supabaseAdmin
    .from('physicians')
    .update({
      licenses: licensesJsonb,
      board_certifications: boardCertsJsonb,
      sub_specialties: subSpecialtiesJsonb,
    })
    .eq('id', physicianId);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Method guard
  if (!['GET', 'POST', 'DELETE'].includes(req.method || '')) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth guard (T-05-03)
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

  // Ownership check (T-05-01): authenticated user must own this physician record
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

  try {
    // ----------------------------------------------------------------
    // GET — return all US credentials for the physician
    // ----------------------------------------------------------------
    if (req.method === 'GET') {
      const { data: licenses, error: licensesError } = await supabaseAdmin
        .from('physician_licenses')
        .select('*')
        .eq('physician_id', physicianId)
        .eq('country_code', 'US');

      if (licensesError) {
        console.error('Failed to fetch licenses:', licensesError);
        return res.status(500).json({ error: 'Failed to fetch credentials' });
      }

      const { data: certifications, error: certsError } = await supabaseAdmin
        .from('physician_certifications')
        .select('*')
        .eq('physician_id', physicianId)
        .eq('country_code', 'US');

      if (certsError) {
        console.error('Failed to fetch certifications:', certsError);
        return res.status(500).json({ error: 'Failed to fetch credentials' });
      }

      // Map NPI row
      const npiRow = (licenses || []).find((l) => l.license_type === 'npi') || null;
      const npiEntry: NPIEntry | null = npiRow
        ? {
            id: npiRow.id,
            npiNumber: npiRow.license_number || '',
            practiceState: npiRow.issuing_state || undefined,
            verificationStatus: npiRow.verification_status as NPIEntry['verificationStatus'],
            verifiedAt: npiRow.verified_at || undefined,
          }
        : null;

      // Map state licenses
      const stateLicenses: USLicenseEntry[] = (licenses || [])
        .filter((l) => l.license_type === 'state_medical')
        .map((l) => ({
          id: l.id,
          state: l.issuing_state || '',
          licenseNumber: l.license_number || '',
          expirationDate: l.expiration_date || '',
          issuedDate: l.issued_date || undefined,
          isPrimary: l.is_primary || false,
          verificationStatus: l.verification_status as USLicenseEntry['verificationStatus'],
        }));

      // Map board certifications
      const boardCertifications: USBoardCertEntry[] = (certifications || [])
        .filter((c) => c.certification_type === 'board_cert')
        .map((c) => ({
          id: c.id,
          certifyingBoard: c.certifying_body || '',
          specialty: c.specialty || '',
          certificationDate: c.issued_date || '',
          expirationDate: c.expiration_date || undefined,
          verificationStatus: c.verification_status as USBoardCertEntry['verificationStatus'],
        }));

      // Map sub-specialties and fellowships
      const subSpecialties: USSubSpecialtyEntry[] = (certifications || [])
        .filter(
          (c) => c.certification_type === 'sub_specialty' || c.certification_type === 'fellowship'
        )
        .map((c) => ({
          id: c.id,
          type: c.certification_type as 'sub_specialty' | 'fellowship',
          name: c.specialty || '',
          certifyingBodyOrInstitution: c.certifying_body || '',
          completionDate: c.issued_date || '',
          expirationDate: c.expiration_date || undefined,
          verificationStatus: c.verification_status as USSubSpecialtyEntry['verificationStatus'],
        }));

      // Map FSMB check row
      const fsmbRow = (certifications || []).find((c) => c.certification_type === 'fsmb_check') || null;
      const fsmbStatus: CredentialResponse['fsmb'] = fsmbRow
        ? {
            status: fsmbRow.verification_status === 'verified'
              ? 'clear'
              : fsmbRow.verification_status === 'failed'
                ? 'flagged'
                : fsmbRow.verification_status === 'manual_review'
                  ? 'error'
                  : 'pending',
            checkedAt: fsmbRow.verified_at || undefined,
          }
        : null;

      const response: CredentialResponse = {
        npi: npiEntry,
        stateLicenses,
        boardCertifications,
        subSpecialties,
        fsmb: fsmbStatus,
      };

      return res.status(200).json(response);
    }

    // ----------------------------------------------------------------
    // POST — upsert a credential entry
    // ----------------------------------------------------------------
    if (req.method === 'POST') {
      const body = req.body as SaveCredentialPayload;

      if (!body || !body.section || !body.data) {
        return res.status(400).json({ error: 'section and data are required' });
      }

      const { section, data } = body;

      // Server-side field validation per section (T-05-02 — never trust client validation)
      if (section === 'npi') {
        const npiData = data as NPIEntry;
        if (!npiData.npiNumber || !/^\d{10}$/.test(npiData.npiNumber)) {
          return res.status(400).json({ error: 'npiNumber must be exactly 10 digits' });
        }

        // Upsert to physician_licenses
        if (npiData.id) {
          // VERF-05: snapshot the row before UPDATE for field-level audit diff
          const { data: beforeRow } = await supabaseAdmin
            .from('physician_licenses')
            .select('*')
            .eq('id', npiData.id)
            .eq('physician_id', physicianId)
            .single();

          const { error } = await supabaseAdmin
            .from('physician_licenses')
            .update({
              license_number: npiData.npiNumber,
              verification_status: 'pending',
              updated_at: new Date().toISOString(),
            })
            .eq('id', npiData.id)
            .eq('physician_id', physicianId);

          if (error) {
            console.error('NPI update failed:', error);
            return res.status(500).json({ error: 'Failed to update NPI' });
          }

          // VERF-05: read-after-write snapshot, then diff and log changed fields
          const { data: afterRow } = await supabaseAdmin
            .from('physician_licenses')
            .select('*')
            .eq('id', npiData.id)
            .single();
          await logUpdateDiff({
            physicianId,
            actorEmail: session.user.email.toLowerCase(),
            actorRole: 'physician',
            targetTable: 'physician_licenses',
            targetId: npiData.id,
            before: beforeRow as Record<string, unknown> | null,
            after: afterRow as Record<string, unknown> | null,
            watchFields: [...LICENSE_WATCH_FIELDS],
          });

          await syncDualWrite(physicianId);
          return res.status(201).json({ success: true, credentialId: npiData.id });
        } else {
          const { data: inserted, error } = await supabaseAdmin
            .from('physician_licenses')
            .insert({
              physician_id: physicianId,
              country_code: 'US',
              license_type: 'npi',
              license_number: npiData.npiNumber,
              verification_status: 'pending',
            })
            .select('*')
            .single();

          if (error) {
            console.error('NPI insert failed:', error);
            return res.status(500).json({ error: 'Failed to save NPI' });
          }

          // VERF-05: log the create with the full inserted-row snapshot
          if (inserted?.id) {
            await logCreate({
              physicianId,
              actorEmail: session.user.email.toLowerCase(),
              actorRole: 'physician',
              targetTable: 'physician_licenses',
              targetId: inserted.id,
              snapshot: inserted as Record<string, unknown>,
            });
          }

          await syncDualWrite(physicianId);
          return res.status(201).json({ success: true, credentialId: inserted?.id });
        }
      }

      if (section === 'state_license') {
        const licenseData = data as USLicenseEntry;

        if (!licenseData.state || !/^[A-Z]{2}$/.test(licenseData.state)) {
          return res.status(400).json({ error: 'state must be a 2-letter uppercase US state abbreviation' });
        }
        if (!licenseData.licenseNumber || licenseData.licenseNumber.trim() === '') {
          return res.status(400).json({ error: 'licenseNumber is required' });
        }
        if (!licenseData.expirationDate || !isValidDate(licenseData.expirationDate)) {
          return res.status(400).json({ error: 'expirationDate must be a valid ISO date (YYYY-MM-DD)' });
        }

        // If isPrimary, reset all other state medical licenses to non-primary first (USCR-03)
        if (licenseData.isPrimary) {
          await supabaseAdmin
            .from('physician_licenses')
            .update({ is_primary: false })
            .eq('physician_id', physicianId)
            .eq('country_code', 'US')
            .eq('license_type', 'state_medical');
        }

        if (licenseData.id) {
          // VERF-05: snapshot before UPDATE
          const { data: beforeRow } = await supabaseAdmin
            .from('physician_licenses')
            .select('*')
            .eq('id', licenseData.id)
            .eq('physician_id', physicianId)
            .single();

          const { error } = await supabaseAdmin
            .from('physician_licenses')
            .update({
              issuing_state: licenseData.state,
              license_number: licenseData.licenseNumber,
              expiration_date: licenseData.expirationDate,
              issued_date: licenseData.issuedDate || null,
              is_primary: licenseData.isPrimary,
              updated_at: new Date().toISOString(),
            })
            .eq('id', licenseData.id)
            .eq('physician_id', physicianId);

          if (error) {
            console.error('State license update failed:', error);
            return res.status(500).json({ error: 'Failed to update state license' });
          }

          // VERF-05: read-after-write snapshot + diff
          const { data: afterRow } = await supabaseAdmin
            .from('physician_licenses')
            .select('*')
            .eq('id', licenseData.id)
            .single();
          await logUpdateDiff({
            physicianId,
            actorEmail: session.user.email.toLowerCase(),
            actorRole: 'physician',
            targetTable: 'physician_licenses',
            targetId: licenseData.id,
            before: beforeRow as Record<string, unknown> | null,
            after: afterRow as Record<string, unknown> | null,
            watchFields: [...LICENSE_WATCH_FIELDS],
          });

          // Fire-and-forget state board verification for launch states (TX, NM, CA)
          verifyStateLicense(licenseData.id, licenseData.state, licenseData.licenseNumber, physicianId)
            .catch((err) => console.error('State board verification failed:', err));

          await syncDualWrite(physicianId);
          return res.status(201).json({ success: true, credentialId: licenseData.id });
        } else {
          const { data: inserted, error } = await supabaseAdmin
            .from('physician_licenses')
            .insert({
              physician_id: physicianId,
              country_code: 'US',
              license_type: 'state_medical',
              license_number: licenseData.licenseNumber,
              issuing_state: licenseData.state,
              expiration_date: licenseData.expirationDate,
              issued_date: licenseData.issuedDate || null,
              is_primary: licenseData.isPrimary,
              verification_status: 'pending',
            })
            .select('*')
            .single();

          if (error) {
            console.error('State license insert failed:', error);
            return res.status(500).json({ error: 'Failed to save state license' });
          }

          // VERF-05: log create with inserted-row snapshot
          if (inserted?.id) {
            await logCreate({
              physicianId,
              actorEmail: session.user.email.toLowerCase(),
              actorRole: 'physician',
              targetTable: 'physician_licenses',
              targetId: inserted.id,
              snapshot: inserted as Record<string, unknown>,
            });
          }

          // Fire-and-forget state board verification for launch states (TX, NM, CA)
          verifyStateLicense(inserted?.id, licenseData.state, licenseData.licenseNumber, physicianId)
            .catch((err) => console.error('State board verification failed:', err));

          await syncDualWrite(physicianId);
          return res.status(201).json({ success: true, credentialId: inserted?.id });
        }
      }

      if (section === 'board_cert') {
        const certData = data as USBoardCertEntry;

        if (!certData.certifyingBoard || certData.certifyingBoard.trim() === '') {
          return res.status(400).json({ error: 'certifyingBoard is required' });
        }
        if (!certData.specialty || certData.specialty.trim() === '') {
          return res.status(400).json({ error: 'specialty is required' });
        }
        if (!certData.certificationDate || !isValidDate(certData.certificationDate)) {
          return res.status(400).json({ error: 'certificationDate must be a valid ISO date (YYYY-MM-DD)' });
        }

        if (certData.id) {
          // VERF-05: snapshot before UPDATE
          const { data: beforeRow } = await supabaseAdmin
            .from('physician_certifications')
            .select('*')
            .eq('id', certData.id)
            .eq('physician_id', physicianId)
            .single();

          const { error } = await supabaseAdmin
            .from('physician_certifications')
            .update({
              certifying_body: certData.certifyingBoard,
              specialty: certData.specialty,
              issued_date: certData.certificationDate,
              expiration_date: certData.expirationDate || null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', certData.id)
            .eq('physician_id', physicianId);

          if (error) {
            console.error('Board cert update failed:', error);
            return res.status(500).json({ error: 'Failed to update board certification' });
          }

          // VERF-05: read-after-write snapshot + diff
          const { data: afterRow } = await supabaseAdmin
            .from('physician_certifications')
            .select('*')
            .eq('id', certData.id)
            .single();
          await logUpdateDiff({
            physicianId,
            actorEmail: session.user.email.toLowerCase(),
            actorRole: 'physician',
            targetTable: 'physician_certifications',
            targetId: certData.id,
            before: beforeRow as Record<string, unknown> | null,
            after: afterRow as Record<string, unknown> | null,
            watchFields: [...CERTIFICATION_WATCH_FIELDS],
          });

          await syncDualWrite(physicianId);
          return res.status(201).json({ success: true, credentialId: certData.id });
        } else {
          const { data: inserted, error } = await supabaseAdmin
            .from('physician_certifications')
            .insert({
              physician_id: physicianId,
              country_code: 'US',
              certification_type: 'board_cert',
              certifying_body: certData.certifyingBoard,
              specialty: certData.specialty,
              issued_date: certData.certificationDate,
              expiration_date: certData.expirationDate || null,
              verification_status: 'pending',
            })
            .select('*')
            .single();

          if (error) {
            console.error('Board cert insert failed:', error);
            return res.status(500).json({ error: 'Failed to save board certification' });
          }

          // VERF-05: log create with inserted-row snapshot
          if (inserted?.id) {
            await logCreate({
              physicianId,
              actorEmail: session.user.email.toLowerCase(),
              actorRole: 'physician',
              targetTable: 'physician_certifications',
              targetId: inserted.id,
              snapshot: inserted as Record<string, unknown>,
            });
          }

          await syncDualWrite(physicianId);
          return res.status(201).json({ success: true, credentialId: inserted?.id });
        }
      }

      if (section === 'sub_specialty') {
        const subData = data as USSubSpecialtyEntry;

        if (!subData.name || subData.name.trim() === '') {
          return res.status(400).json({ error: 'name is required' });
        }
        if (!subData.certifyingBodyOrInstitution || subData.certifyingBodyOrInstitution.trim() === '') {
          return res.status(400).json({ error: 'certifyingBodyOrInstitution is required' });
        }
        if (!subData.completionDate || !isValidDate(subData.completionDate)) {
          return res.status(400).json({ error: 'completionDate must be a valid ISO date (YYYY-MM-DD)' });
        }
        if (subData.type !== 'sub_specialty' && subData.type !== 'fellowship') {
          return res.status(400).json({ error: 'type must be sub_specialty or fellowship' });
        }

        if (subData.id) {
          // VERF-05: snapshot before UPDATE
          const { data: beforeRow } = await supabaseAdmin
            .from('physician_certifications')
            .select('*')
            .eq('id', subData.id)
            .eq('physician_id', physicianId)
            .single();

          const { error } = await supabaseAdmin
            .from('physician_certifications')
            .update({
              certification_type: subData.type,
              certifying_body: subData.certifyingBodyOrInstitution,
              specialty: subData.name,
              issued_date: subData.completionDate,
              expiration_date: subData.expirationDate || null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', subData.id)
            .eq('physician_id', physicianId);

          if (error) {
            console.error('Sub-specialty update failed:', error);
            return res.status(500).json({ error: 'Failed to update sub-specialty/fellowship' });
          }

          // VERF-05: read-after-write snapshot + diff
          const { data: afterRow } = await supabaseAdmin
            .from('physician_certifications')
            .select('*')
            .eq('id', subData.id)
            .single();
          await logUpdateDiff({
            physicianId,
            actorEmail: session.user.email.toLowerCase(),
            actorRole: 'physician',
            targetTable: 'physician_certifications',
            targetId: subData.id,
            before: beforeRow as Record<string, unknown> | null,
            after: afterRow as Record<string, unknown> | null,
            watchFields: [...CERTIFICATION_WATCH_FIELDS],
          });

          await syncDualWrite(physicianId);
          return res.status(201).json({ success: true, credentialId: subData.id });
        } else {
          const { data: inserted, error } = await supabaseAdmin
            .from('physician_certifications')
            .insert({
              physician_id: physicianId,
              country_code: 'US',
              certification_type: subData.type,
              certifying_body: subData.certifyingBodyOrInstitution,
              specialty: subData.name,
              issued_date: subData.completionDate,
              expiration_date: subData.expirationDate || null,
              verification_status: 'pending',
            })
            .select('*')
            .single();

          if (error) {
            console.error('Sub-specialty insert failed:', error);
            return res.status(500).json({ error: 'Failed to save sub-specialty/fellowship' });
          }

          // VERF-05: log create with inserted-row snapshot
          if (inserted?.id) {
            await logCreate({
              physicianId,
              actorEmail: session.user.email.toLowerCase(),
              actorRole: 'physician',
              targetTable: 'physician_certifications',
              targetId: inserted.id,
              snapshot: inserted as Record<string, unknown>,
            });
          }

          await syncDualWrite(physicianId);
          return res.status(201).json({ success: true, credentialId: inserted?.id });
        }
      }

      return res.status(400).json({ error: `Unknown credential section: ${section}` });
    }

    // ----------------------------------------------------------------
    // DELETE — remove a credential entry
    // ----------------------------------------------------------------
    if (req.method === 'DELETE') {
      const body = req.body as DeleteCredentialPayload;

      if (!body || !body.section || !body.credentialId) {
        return res.status(400).json({ error: 'section and credentialId are required' });
      }

      const { section, credentialId } = body;

      if (!UUID_REGEX.test(credentialId)) {
        return res.status(400).json({ error: 'credentialId must be a valid UUID' });
      }

      if (section === 'npi' || section === 'state_license') {
        // VERF-05: snapshot row before DELETE for audit. Ownership enforced via physician_id.
        const { data: snapshot } = await supabaseAdmin
          .from('physician_licenses')
          .select('*')
          .eq('id', credentialId)
          .eq('physician_id', physicianId)
          .maybeSingle();

        // DELETE from physician_licenses, physician_id check prevents deleting another's record (T-05-05)
        const { error } = await supabaseAdmin
          .from('physician_licenses')
          .delete()
          .eq('id', credentialId)
          .eq('physician_id', physicianId);

        if (error) {
          console.error('License delete failed:', error);
          return res.status(500).json({ error: 'Failed to delete credential' });
        }

        // VERF-05: log the delete with last-known snapshot
        if (snapshot) {
          await logDelete({
            physicianId,
            actorEmail: session.user.email.toLowerCase(),
            actorRole: 'physician',
            targetTable: 'physician_licenses',
            targetId: credentialId,
            snapshot: snapshot as Record<string, unknown>,
          });
        }
      } else if (section === 'board_cert' || section === 'sub_specialty') {
        // VERF-05: snapshot row before DELETE for audit
        const { data: snapshot } = await supabaseAdmin
          .from('physician_certifications')
          .select('*')
          .eq('id', credentialId)
          .eq('physician_id', physicianId)
          .maybeSingle();

        // DELETE from physician_certifications, physician_id check prevents deleting another's record (T-05-05)
        const { error } = await supabaseAdmin
          .from('physician_certifications')
          .delete()
          .eq('id', credentialId)
          .eq('physician_id', physicianId);

        if (error) {
          console.error('Certification delete failed:', error);
          return res.status(500).json({ error: 'Failed to delete credential' });
        }

        // VERF-05: log the delete with last-known snapshot
        if (snapshot) {
          await logDelete({
            physicianId,
            actorEmail: session.user.email.toLowerCase(),
            actorRole: 'physician',
            targetTable: 'physician_certifications',
            targetId: credentialId,
            snapshot: snapshot as Record<string, unknown>,
          });
        }
      } else {
        return res.status(400).json({ error: `Unknown credential section: ${section}` });
      }

      // Sync dual-write after delete
      await syncDualWrite(physicianId);

      return res.status(200).json({ success: true });
    }
  } catch (err) {
    console.error('Credentials handler exception:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
