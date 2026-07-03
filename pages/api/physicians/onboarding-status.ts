import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { supabaseAdmin } from '../../../lib/supabaseServer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email && !session?.user?.physician_id) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    // D-03 two-identity lifecycle: a Mailcow login's session email is the
    // mailbox address (@medikah.health), which can differ from the email the
    // physician registered with. Prefer the physician_id claim (set by the
    // mailcow-imap provider); fall back to email for legacy/social sessions.
    const physicianIdClaim = session.user.physician_id;
    const email = session.user.email?.toLowerCase();

    // D-09 alias funneling: a session email may be an alias of a canonical
    // physician record (e.g. a secondary Google identity). Resolve via
    // physician_email_aliases BEFORE falling back to physicians.email —
    // otherwise an aliased sign-in reads as "not onboarded" and gets routed
    // back through the onboarding wizard (the ghost-row 884c failure mode).
    let resolvedId = physicianIdClaim ?? null;
    if (!resolvedId && email) {
      const { data: alias, error: aliasErr } = await supabaseAdmin
        .from('physician_email_aliases')
        .select('physician_id')
        .eq('email', email)
        .maybeSingle();
      if (aliasErr) {
        console.error('onboarding-status: alias lookup error', aliasErr);
      }
      if (alias?.physician_id) resolvedId = alias.physician_id;
    }

    let query = supabaseAdmin
      .from('physicians')
      .select('id, verification_status, onboarding_completed_at, consent_signed_at');
    query = resolvedId
      ? query.eq('id', resolvedId)
      : query.eq('email', email!);
    const { data: physician, error } = await query.maybeSingle();

    if (error) {
      console.error('Error checking physician status:', error);
      return res.status(500).json({ error: 'Failed to check status' });
    }

    if (!physician) {
      return res.status(200).json({
        isOnboarded: false,
        physicianId: null,
        verificationStatus: null,
        hasConsent: false,
      });
    }

    // Backfill: if physician exists with consent but missing onboarding timestamp,
    // set it now (fixes rows created before the bug fix in create.ts)
    if (!physician.onboarding_completed_at && physician.consent_signed_at) {
      await supabaseAdmin
        .from('physicians')
        .update({ onboarding_completed_at: physician.consent_signed_at })
        .eq('id', physician.id);
      physician.onboarding_completed_at = physician.consent_signed_at;
    }

    return res.status(200).json({
      isOnboarded: !!physician.onboarding_completed_at,
      physicianId: physician.id,
      verificationStatus: physician.verification_status,
      hasConsent: !!physician.consent_signed_at,
    });
  } catch (err) {
    console.error('Exception checking physician status:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
