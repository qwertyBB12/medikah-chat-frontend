import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { supabaseAdmin } from '../../../../lib/supabaseServer';
import { lookupNPI } from '../../../../lib/npiLookup';
import { recordLookup } from '../../../../lib/verificationRecordService';
import type { VerificationResultStatus } from '../../../../lib/verificationTypes';

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
    const physicianId = req.query.id as string;

    if (!physicianId) {
      return res.status(400).json({ error: 'Physician ID is required' });
    }

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(physicianId)) {
      return res.status(400).json({ error: 'Invalid physician ID format' });
    }

    // Ownership check: session email must match physician email (T-05-06)
    const { data: physician, error: lookupError } = await supabaseAdmin
      .from('physicians')
      .select('id, email, full_name')
      .eq('id', physicianId)
      .single();

    if (lookupError || !physician) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (physician.email !== session.user.email.toLowerCase()) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { npiNumber } = req.body;

    if (!npiNumber || typeof npiNumber !== 'string') {
      return res.status(400).json({ error: 'npiNumber is required' });
    }

    // Call NPPES NPI Registry API (T-05-07: server-side only — client cannot forge verification_status)
    const result = await lookupNPI(npiNumber);

    // Check if NPI row already exists for this physician
    const { data: existingLicense } = await supabaseAdmin
      .from('physician_licenses')
      .select('id')
      .eq('physician_id', physicianId)
      .eq('license_type', 'npi')
      .eq('country_code', 'US')
      .maybeSingle();

    // NPI identity cross-verification: compare NPPES name to physician profile name
    const normalizeNameForComparison = (name: string): string => {
      return name
        .toLowerCase()
        .replace(/[^a-z\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    };

    let nameMatch = true;
    let verificationStatusToWrite: 'verified' | 'manual_review' = 'verified';

    if (result.found && physician.full_name) {
      const nppsName = normalizeNameForComparison(result.fullName || '');
      const profileName = normalizeNameForComparison(physician.full_name || '');

      const profileWords = profileName.split(' ').filter((w) => w.length > 1);
      const nppsWords = nppsName.split(' ').filter((w) => w.length > 1);

      const matchingWords = profileWords.filter((pw) => nppsWords.includes(pw));
      nameMatch = matchingWords.length >= Math.min(2, profileWords.length);

      if (!nameMatch) {
        verificationStatusToWrite = 'manual_review';
      }
    }

    // Track the physician_licenses row id we write to so the verification_records
    // row can link back via related_id (Plan 08-03 / VERF-01).
    let relatedId: string | null = existingLicense?.id ?? null;

    if (result.found) {
      if (existingLicense) {
        // UPDATE existing NPI row
        await supabaseAdmin
          .from('physician_licenses')
          .update({
            license_number: npiNumber,
            verification_status: verificationStatusToWrite,
            verified_at: new Date().toISOString(),
            verification_source: 'npi_registry',
            // Clear prior manual_review_required flag on a successful found lookup —
            // it may have been set by a previous not_found lookup for the same NPI.
            manual_review_required: verificationStatusToWrite === 'manual_review',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingLicense.id);
      } else {
        // INSERT new NPI row
        const { data: insertedLicense } = await supabaseAdmin
          .from('physician_licenses')
          .insert({
            physician_id: physicianId,
            country_code: 'US',
            license_type: 'npi',
            license_number: npiNumber,
            verification_status: verificationStatusToWrite,
            verified_at: new Date().toISOString(),
            verification_source: 'npi_registry',
            manual_review_required: verificationStatusToWrite === 'manual_review',
          })
          .select('id')
          .single();
        relatedId = insertedLicense?.id ?? null;
      }

      // VERF-01: persist the raw NPPES response for audit. Best-effort.
      const resultStatus: VerificationResultStatus = 'found';
      await recordLookup({
        physicianId,
        source: 'npi_registry',
        relatedTable: 'physician_licenses',
        relatedId,
        lookupInput: { npiNumber },
        rawResponse: result as unknown as Record<string, unknown>,
        resultStatus,
        summary: {
          fullName: result.fullName,
          primarySpecialty: result.primarySpecialty,
          practiceState: result.practiceState,
          nameMatch,
        },
      });

      return res.status(200).json({
        success: true,
        data: {
          fullName: result.fullName,
          primarySpecialty: result.primarySpecialty,
          practiceState: result.practiceState,
          credential: result.credential,
          npiNumber: result.npiNumber,
          enumerationDate: result.enumerationDate,
          status: result.status,
        },
        nameMatch,
        verificationStatus: verificationStatusToWrite,
      });
    } else {
      // NPI not found — still persist the failed lookup and flag for manual review
      if (existingLicense) {
        await supabaseAdmin
          .from('physician_licenses')
          .update({
            license_number: npiNumber,
            verification_status: 'failed',
            verified_at: new Date().toISOString(),
            verification_source: 'npi_registry',
            manual_review_required: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingLicense.id);
      } else {
        const { data: insertedLicense } = await supabaseAdmin
          .from('physician_licenses')
          .insert({
            physician_id: physicianId,
            country_code: 'US',
            license_type: 'npi',
            license_number: npiNumber,
            verification_status: 'failed',
            verified_at: new Date().toISOString(),
            verification_source: 'npi_registry',
            manual_review_required: true,
          })
          .select('id')
          .single();
        relatedId = insertedLicense?.id ?? null;
      }

      // VERF-01: persist the failed lookup for audit. Best-effort.
      const resultStatus: VerificationResultStatus = 'not_found';
      await recordLookup({
        physicianId,
        source: 'npi_registry',
        relatedTable: 'physician_licenses',
        relatedId,
        lookupInput: { npiNumber },
        rawResponse: result as unknown as Record<string, unknown>,
        resultStatus,
        summary: { error: result.error },
      });

      return res.status(200).json({
        success: true,
        found: false,
        error: result.error,
      });
    }
  } catch (err) {
    console.error('NPI lookup API error:', err);
    // Best-effort audit even in the exception path — recordLookup never throws.
    try {
      const physicianId = (req.query.id as string) || '';
      const bodyNpi = (req.body as { npiNumber?: unknown })?.npiNumber;
      await recordLookup({
        physicianId,
        source: 'npi_registry',
        relatedTable: 'physician_licenses',
        relatedId: null,
        lookupInput: { npiNumber: typeof bodyNpi === 'string' ? bodyNpi : null },
        rawResponse: { error: String(err) },
        resultStatus: 'error',
        summary: { message: String(err) },
      });
    } catch {
      /* swallow — never mask the original 500 */
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}
