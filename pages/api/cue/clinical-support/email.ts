/**
 * BFF route: POST /api/cue/clinical-support/email  (Phase 24 / Slice 3)
 *
 * Emails the Cue clinical DECISION-SUPPORT summary to the authenticated
 * physician's OWN @medikah.health mailbox (branded HTML via Resend). The
 * recipient is resolved server-side from the session → physician →
 * physician_workspace_accounts.mailbox_address — it is NEVER taken from the
 * request body (no open relay; a doctor can only send to their own mailbox).
 *
 * NAMING / LEGAL: the artifact is clinical decision support — never a diagnosis;
 * the disclaimer (from the card payload) carries the denial. Stateless: the card
 * is rendered + sent, never stored.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { authOptions } from '../../auth/[...nextauth]';
import { supabaseAdmin } from '../../../../lib/supabaseServer';
import {
  buildClinicalSupportSummaryHtml,
  clinicalSupportSubject,
} from '../../../../lib/cue/clinicalSupportSummary';
import type { CueClinicalSupportCard } from '../../../../lib/cue/cueStream';

function isClinicalSupportCard(x: unknown): x is CueClinicalSupportCard {
  return (
    !!x &&
    typeof x === 'object' &&
    (x as { kind?: unknown }).kind === 'clinical_support' &&
    Array.isArray((x as { considerations?: unknown }).considerations)
  );
}

function composeName(title: unknown, fullName: unknown): string | null {
  const name = typeof fullName === 'string' ? fullName.trim() : '';
  if (!name) return null;
  const t = title === 'Dr' || title === 'Dra' ? `${title}.` : '';
  return t ? `${t} ${name}` : name;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const { card, locale } = (req.body ?? {}) as { card?: unknown; locale?: unknown };
  if (!isClinicalSupportCard(card)) {
    res.status(400).json({ error: 'Invalid card payload' });
    return;
  }
  const lang: 'en' | 'es' = locale === 'en' ? 'en' : 'es';

  if (!supabaseAdmin) {
    res.status(503).json({ error: 'Database not configured' });
    return;
  }

  // Resolve the physician (prefer the session token's physician_id; else by email).
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  let physicianId = token?.physician_id ? String(token.physician_id) : null;
  let physicianName: string | null = null;

  if (physicianId) {
    const { data: ph } = await supabaseAdmin
      .from('physicians')
      .select('full_name, title')
      .eq('id', physicianId)
      .maybeSingle();
    physicianName = ph ? composeName(ph.title, ph.full_name) : null;
  } else {
    const { data: ph } = await supabaseAdmin
      .from('physicians')
      .select('id, full_name, title')
      .ilike('email', session.user.email)
      .maybeSingle();
    physicianId = ph?.id ? String(ph.id) : null;
    physicianName = ph ? composeName(ph.title, ph.full_name) : null;
  }
  if (!physicianId) {
    res.status(404).json({ error: 'Physician not found' });
    return;
  }

  const { data: ws } = await supabaseAdmin
    .from('physician_workspace_accounts')
    .select('mailbox_address')
    .eq('physician_id', physicianId)
    .maybeSingle();
  const to = typeof ws?.mailbox_address === 'string' ? ws.mailbox_address : null;
  if (!to) {
    res.status(409).json({ error: 'No Medikah mailbox provisioned' });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: 'Email service not configured' });
    return;
  }

  const html = buildClinicalSupportSummaryHtml(card, { locale: lang, physicianName });
  const fromEmail = process.env.PRACTIKAH_EMAIL_FROM || 'activacion@medikah.health';

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `Práctikah · Medikah <${fromEmail}>`,
        to,
        subject: clinicalSupportSubject(lang),
        html,
      }),
    });
    if (!resp.ok) {
      console.error('[cue/clinical-support/email] Resend error', resp.status);
      res.status(502).json({ error: 'Failed to send' });
      return;
    }
    res.status(200).json({ sent: true, to });
  } catch (err) {
    console.error('[cue/clinical-support/email] exception', err);
    res.status(502).json({ error: 'Failed to send' });
  }
}
