/**
 * POST /api/internal/verification-clerk
 *
 * The verification clerk's WATCHER leg (sprint task #27): sweeps the pending
 * credential queue, builds deterministic review packets, and emails the
 * reviewer (Dr. Aguirre) one digest with a signed one-tap "Aprobar y activar"
 * link per clean case. The clerk only clerks — the approve tap is the human
 * clinical gate, and depth review stays in the admin cockpit.
 *
 * DARK BY DEFAULT: requires VERIFICATION_CLERK_ENABLED === 'true' AND
 * CLERK_REVIEWER_EMAIL set, else answers { status: 'disabled' } (HTTP 200 so
 * the cron stays green while dark).
 *
 * Authentication: X-Internal-Secret vs INTERNAL_API_SHARED_SECRET (same
 * fail-closed idiom as practikah-email-trigger / stalled-onboarding-nudge).
 *
 * Re-packet policy: a pending physician reappears in the digest only when the
 * last 'clerk_packet_sent' audit row is older than 7 days — the docket
 * refreshes weekly instead of spamming daily.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { supabaseAdmin } from '../../../lib/supabaseServer';
import { buildClerkPacket, renderClerkDigestEmail } from '../../../lib/verification/clerkPacket';

const REPACKET_AFTER_DAYS = 7;
const MAX_PACKETS_PER_DIGEST = 25;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== 'POST') {
    return void res.status(405).json({ error: 'Method not allowed' });
  }

  const sharedSecret = process.env.INTERNAL_API_SHARED_SECRET;
  const presented = req.headers['x-internal-secret'];

  if (!sharedSecret) {
    console.error('[verification-clerk] INTERNAL_API_SHARED_SECRET not configured');
    return void res.status(403).json({ error: 'Forbidden' });
  }
  if (typeof presented !== 'string') {
    return void res.status(403).json({ error: 'Forbidden' });
  }
  let secretMatch = false;
  try {
    const presentedBuf = Buffer.from(presented);
    const expectedBuf = Buffer.from(sharedSecret);
    if (presentedBuf.length === expectedBuf.length) {
      secretMatch = crypto.timingSafeEqual(presentedBuf, expectedBuf);
    }
  } catch {
    secretMatch = false;
  }
  if (!secretMatch) {
    return void res.status(403).json({ error: 'Forbidden' });
  }

  const reviewerEmail = process.env.CLERK_REVIEWER_EMAIL;
  if (process.env.VERIFICATION_CLERK_ENABLED !== 'true' || !reviewerEmail) {
    return void res.status(200).json({ status: 'disabled', sent: 0 });
  }

  if (!supabaseAdmin) {
    return void res.status(500).json({ error: 'Database not configured' });
  }

  try {
    // Pending queue — completed onboarding, awaiting verification.
    const { data: pending, error: pendErr } = await supabaseAdmin
      .from('physicians')
      .select('id, full_name, title, email, primary_specialty, onboarding_completed_at')
      .in('verification_status', ['pending', 'in_review'])
      .not('onboarding_completed_at', 'is', null)
      .order('onboarding_completed_at', { ascending: true })
      .limit(200);

    if (pendErr) {
      return void res.status(500).json({ error: pendErr.message });
    }
    if (!pending || pending.length === 0) {
      return void res.status(200).json({ status: 'ok', queue: 0, packeted: 0 });
    }

    // Recent packet dedup (weekly refresh).
    const cutoff = new Date(Date.now() - REPACKET_AFTER_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentPackets } = await supabaseAdmin
      .from('physician_onboarding_audit')
      .select('physician_id')
      .eq('action', 'clerk_packet_sent')
      .gte('created_at', cutoff)
      .in('physician_id', pending.map((p) => p.id));
    const recentlyPacketed = new Set(
      (recentPackets ?? []).map((r) => r.physician_id as string).filter(Boolean),
    );

    const due = pending
      .filter((p) => !recentlyPacketed.has(p.id as string))
      .slice(0, MAX_PACKETS_PER_DIGEST);

    if (due.length === 0) {
      return void res.status(200).json({ status: 'ok', queue: pending.length, packeted: 0 });
    }

    const packets = [];
    for (const p of due) {
      packets.push(
        await buildClerkPacket(supabaseAdmin, {
          id: p.id as string,
          full_name: (p.full_name as string) || '',
          title: (p.title as string | null) ?? null,
          email: p.email as string,
          primary_specialty: (p.primary_specialty as string | null) ?? null,
          onboarding_completed_at: (p.onboarding_completed_at as string | null) ?? null,
        }),
      );
    }

    const { subject, html, text } = await renderClerkDigestEmail(packets);

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return void res.status(500).json({ error: 'Email service not configured' });
    }
    const fromEmail = process.env.EMAIL_FROM || 'welcome@medikah.health';
    const sendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Medikah Clerk <${fromEmail}>`,
        to: reviewerEmail,
        subject,
        html,
        text,
      }),
    });
    if (!sendRes.ok) {
      const err = await sendRes.json().catch(() => ({}));
      console.error('[verification-clerk] digest send failed:', err);
      return void res.status(502).json({ error: 'Digest send failed' });
    }

    // Record packet rows AFTER a successful send (append-only audit table).
    for (const p of packets) {
      const { error: auditErr } = await supabaseAdmin
        .from('physician_onboarding_audit')
        .insert({
          physician_id: p.physicianId,
          email: p.email,
          action: 'clerk_packet_sent',
          phase: 'verification',
          language: 'es',
          data_snapshot: {
            one_tap_eligible: p.oneTapEligible,
            blockers: p.blockers,
            reviewer: reviewerEmail,
          },
        });
      if (auditErr) {
        console.error('[verification-clerk] audit insert failed:', p.physicianId, auditErr.message);
      }
    }

    console.log(
      `[verification-clerk] queue=${pending.length} packeted=${packets.length} one_tap=${packets.filter((p) => p.oneTapEligible).length} reviewer=${reviewerEmail}`,
    );
    return void res.status(200).json({
      status: 'ok',
      queue: pending.length,
      packeted: packets.length,
      oneTapEligible: packets.filter((p) => p.oneTapEligible).length,
    });
  } catch (err) {
    console.error('[verification-clerk] exception:', err);
    return void res.status(500).json({ error: 'Internal error' });
  }
}
