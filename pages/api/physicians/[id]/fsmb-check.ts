import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { supabaseAdmin } from '../../../../lib/supabaseServer';
import { checkFSMB } from '../../../../lib/fsmbCheck';
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
      .select('id, email')
      .eq('id', physicianId)
      .single();

    if (lookupError || !physician) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (physician.email !== session.user.email.toLowerCase()) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { npiNumber, fullName } = req.body;

    if (!npiNumber || typeof npiNumber !== 'string') {
      return res.status(400).json({ error: 'npiNumber is required' });
    }

    // Run FSMB/DocInfo disciplinary check (T-05-10: 15s timeout, graceful fallback)
    const result = await checkFSMB(npiNumber, fullName);

    // Map FSMB result to verification_status for physician_certifications
    let verificationStatus: string;
    if (result.status === 'clear') {
      verificationStatus = 'verified';
    } else if (result.status === 'flagged') {
      verificationStatus = 'failed';
    } else {
      verificationStatus = 'manual_review';
    }

    // Check if a fsmb_check row already exists for this physician
    const { data: existingCert } = await supabaseAdmin
      .from('physician_certifications')
      .select('id')
      .eq('physician_id', physicianId)
      .eq('certification_type', 'fsmb_check')
      .maybeSingle();

    // T-05-11 / VERF-04: any non-'clear' FSMB outcome is a manual-review trigger.
    // 'flagged' means disciplinary action found; 'error' / 'manual_review' means
    // DocInfo could not complete the check and a human must review.
    const manualReviewRequired = result.status !== 'clear';

    // Track the physician_certifications row id so verification_records can link back.
    let relatedId: string | null = existingCert?.id ?? null;

    if (existingCert) {
      // UPDATE existing FSMB check row
      await supabaseAdmin
        .from('physician_certifications')
        .update({
          country_code: 'US',
          certifying_body: 'FSMB/DocInfo',
          specialty: result.status,
          verification_status: verificationStatus,
          verified_at: result.checkedAt,
          manual_review_required: manualReviewRequired,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingCert.id);
    } else {
      // INSERT new FSMB check row
      const { data: insertedCert } = await supabaseAdmin
        .from('physician_certifications')
        .insert({
          physician_id: physicianId,
          country_code: 'US',
          certification_type: 'fsmb_check',
          certifying_body: 'FSMB/DocInfo',
          specialty: result.status,
          verification_status: verificationStatus,
          verified_at: result.checkedAt,
          manual_review_required: manualReviewRequired,
        })
        .select('id')
        .single();
      relatedId = insertedCert?.id ?? null;
    }

    // Plan 08-03: the previous ad-hoc write to physician_onboarding_audit (action='fsmb_check')
    // has been REMOVED. Its content is superseded by verification_records (richer payload,
    // related_id link, normalized source='fsmb'). See 08-03-PLAN.md Task 1 for rationale.
    // Map FSMB result.status to VerificationResultStatus:
    //   'clear' | 'flagged' -> 'found'  (DocInfo returned a usable answer)
    //   'error'             -> 'error'
    //   anything else       -> 'not_found'
    const resultStatus: VerificationResultStatus =
      result.status === 'clear' || result.status === 'flagged'
        ? 'found'
        : result.status === 'error'
          ? 'error'
          : 'not_found';

    await recordLookup({
      physicianId,
      source: 'fsmb',
      relatedTable: 'physician_certifications',
      relatedId,
      lookupInput: { npiNumber, fullName: fullName ?? null },
      rawResponse: result as unknown as Record<string, unknown>,
      resultStatus,
      summary: {
        status: result.status,
        hasActions: result.hasActions,
        actionCount: result.actionCount,
        source: result.source,
      },
    });

    // D-09: Return only status to client — never rawResponse or actionCount
    return res.status(200).json({
      success: true,
      status: result.status,
      checkedAt: result.checkedAt,
    });
  } catch (err) {
    console.error('FSMB check API error:', err);
    // Best-effort audit even in the exception path — recordLookup never throws.
    try {
      const physicianId = (req.query.id as string) || '';
      const body = (req.body ?? {}) as { npiNumber?: unknown; fullName?: unknown };
      await recordLookup({
        physicianId,
        source: 'fsmb',
        relatedTable: 'physician_certifications',
        relatedId: null,
        lookupInput: {
          npiNumber: typeof body.npiNumber === 'string' ? body.npiNumber : null,
          fullName: typeof body.fullName === 'string' ? body.fullName : null,
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
