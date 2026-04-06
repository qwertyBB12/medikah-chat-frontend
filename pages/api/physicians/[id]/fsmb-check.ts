import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { supabaseAdmin } from '../../../../lib/supabaseServer';
import { checkFSMB } from '../../../../lib/fsmbCheck';

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
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingCert.id);
    } else {
      // INSERT new FSMB check row
      await supabaseAdmin
        .from('physician_certifications')
        .insert({
          physician_id: physicianId,
          country_code: 'US',
          certification_type: 'fsmb_check',
          certifying_body: 'FSMB/DocInfo',
          specialty: result.status,
          verification_status: verificationStatus,
          verified_at: result.checkedAt,
        });
    }

    // Audit log entry — full result stored for legal audit trail (T-05-11)
    // rawResponse and actionCount stored here only, NOT returned to client (D-09)
    await supabaseAdmin
      .from('physician_onboarding_audit')
      .insert({
        physician_id: physicianId,
        email: session.user.email,
        action: 'fsmb_check',
        data_snapshot: {
          npiNumber,
          result: {
            status: result.status,
            hasActions: result.hasActions,
            actionCount: result.actionCount,
            checkedAt: result.checkedAt,
            source: result.source,
            error: result.error,
          },
        },
        language: 'en',
      });

    // D-09: Return only status to client — never rawResponse or actionCount
    return res.status(200).json({
      success: true,
      status: result.status,
      checkedAt: result.checkedAt,
    });
  } catch (err) {
    console.error('FSMB check API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
