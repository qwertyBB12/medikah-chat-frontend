import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { supabaseAdmin } from '../../../../lib/supabaseServer';
import { lookupCedula } from '../../../../lib/sepLookup';
import { recordLookup } from '../../../../lib/verificationRecordService';
import type { VerificationResultStatus } from '../../../../lib/verificationTypes';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // POST only (T-06-01: auth gate before any action)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Session authentication (T-06-01)
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Database availability check
  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    const physicianId = req.query.id as string;

    if (!physicianId) {
      return res.status(400).json({ error: 'Physician ID is required' });
    }

    // UUID format validation
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(physicianId)) {
      return res.status(400).json({ error: 'Invalid physician ID format' });
    }

    // Ownership check: session email must match physician email (T-06-01)
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

    // Extract and validate request body
    const { cedulaNumber, cedulaType } = req.body as {
      cedulaNumber?: unknown;
      cedulaType?: unknown;
    };

    if (!cedulaNumber || typeof cedulaNumber !== 'string' || cedulaNumber.trim() === '') {
      return res.status(400).json({ error: 'cedulaNumber is required' });
    }

    // Validate cedulaType
    if (
      cedulaType !== 'cedula_profesional' &&
      cedulaType !== 'cedula_especialidad'
    ) {
      return res.status(400).json({
        error: 'cedulaType must be "cedula_profesional" or "cedula_especialidad"',
      });
    }

    // Call SEP Solr API (server-side only — T-06-03)
    // verificationStatus is determined server-side — client cannot send it (T-06-02)
    const result = await lookupCedula(cedulaNumber);

    // Determine verification status — server-side only (T-06-02)
    const verificationStatus: 'verified' | 'manual_review' = result.found
      ? 'verified'
      : 'manual_review';

    // Persist verification result to physician_licenses using select-then-insert/update
    // (mirrors npi-lookup.ts pattern — physician_licenses has no unique constraint to upsert on)
    const { data: existingLicense } = await supabaseAdmin
      .from('physician_licenses')
      .select('id')
      .eq('physician_id', physicianId)
      .eq('country_code', 'MX')
      .eq('license_type', cedulaType)
      .eq('license_number', cedulaNumber.trim())
      .maybeSingle();

    const verifiedAt = new Date().toISOString();

    // D-05: SEP failure flags for manual review but never blocks the physician.
    const manualReviewRequired = !result.found;

    // Track the physician_licenses row id so the verification_records row can
    // link back via related_id (Plan 08-03 / VERF-01).
    let relatedId: string | null = existingLicense?.id ?? null;

    if (existingLicense) {
      // UPDATE existing row
      await supabaseAdmin
        .from('physician_licenses')
        .update({
          verification_status: verificationStatus,
          verified_at: verifiedAt,
          verification_source: 'sep_cedula',
          raw_verification_data: result.rawResponse ?? null,
          manual_review_required: manualReviewRequired,
          updated_at: verifiedAt,
        })
        .eq('id', existingLicense.id);
    } else {
      // INSERT new row
      // expiration_date is NULL — MX cedulas are lifetime credentials (per PROJECT.md)
      const { data: insertedLicense } = await supabaseAdmin
        .from('physician_licenses')
        .insert({
          physician_id: physicianId,
          country_code: 'MX',
          license_type: cedulaType,
          license_number: cedulaNumber.trim(),
          issuing_authority: 'SEP',
          expiration_date: null,
          verification_status: verificationStatus,
          verified_at: verifiedAt,
          verification_source: 'sep_cedula',
          raw_verification_data: result.rawResponse ?? null,
          manual_review_required: manualReviewRequired,
        })
        .select('id')
        .single();
      relatedId = insertedLicense?.id ?? null;
    }

    // VERF-01: persist the raw SEP response for audit. Best-effort.
    const resultStatus: VerificationResultStatus = result.found ? 'found' : 'not_found';
    await recordLookup({
      physicianId,
      source: 'sep_cedula',
      relatedTable: 'physician_licenses',
      relatedId,
      lookupInput: { cedulaNumber: cedulaNumber.trim(), cedulaType },
      rawResponse: (result.rawResponse ?? { error: result.error }) as Record<string, unknown>,
      resultStatus,
      summary: result.found
        ? {
            fullName: result.fullName,
            titulo: result.titulo,
            institucion: result.institucion,
            anioRegistro: result.anioRegistro,
          }
        : { error: result.error },
    });

    // Return success — doctor is NEVER blocked by SEP failure (D-05)
    // Even on SEP failure, we return success with manual_review status
    return res.status(200).json({
      success: true,
      data: {
        verificationStatus,
        sepData: result.found
          ? {
              fullName: result.fullName,
              titulo: result.titulo,
              institucion: result.institucion,
              anioRegistro: result.anioRegistro,
            }
          : null,
        ...(result.found ? {} : { warning: result.error }),
      },
    });
  } catch (err) {
    console.error('SEP lookup API error:', err);
    // Best-effort audit even in the exception path — recordLookup never throws.
    try {
      const physicianId = (req.query.id as string) || '';
      const body = (req.body ?? {}) as { cedulaNumber?: unknown; cedulaType?: unknown };
      await recordLookup({
        physicianId,
        source: 'sep_cedula',
        relatedTable: 'physician_licenses',
        relatedId: null,
        lookupInput: {
          cedulaNumber: typeof body.cedulaNumber === 'string' ? body.cedulaNumber : null,
          cedulaType: typeof body.cedulaType === 'string' ? body.cedulaType : null,
        },
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
