/**
 * POST /api/internal/stalled-onboarding-nudge
 *
 * Doctor-journey fix wave (2026-07): doctors who start onboarding (email
 * captured → 'started' audit row) but never complete get exactly one gentle
 * bilingual reminder. Designed to run from a daily GitHub Actions cron.
 *
 * DARK BY DEFAULT: requires STALLED_NUDGE_ENABLED === 'true' or it no-ops
 * with { status: 'disabled' } (HTTP 200 so the cron stays green while dark).
 *
 * Authentication: X-Internal-Secret header matched against
 * INTERNAL_API_SHARED_SECRET (same idiom as practikah-email-trigger;
 * constant-time compare, fail closed).
 *
 * Candidate = email with a 'started' row in physician_onboarding_audit whose
 * most recent 'started' is 2–14 days old, AND no 'completed' row, AND no
 * prior 'nudge_sent' row, AND no physicians row (any status), AND not a known
 * alias of a canonical physician (physician_email_aliases). One nudge per
 * email, ever; batch capped per run to bound Resend usage.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { supabaseAdmin } from '../../../lib/supabaseServer';
import { sendOnboardingNudgeEmail } from '../../../lib/physicianEmail';

const NUDGE_MIN_AGE_MS = 48 * 60 * 60 * 1000; // don't nudge anyone active in the last 48h
const NUDGE_MAX_AGE_DAYS = 14; // older than this = cold, not worth a nudge
const MAX_NUDGES_PER_RUN = 20;

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
    console.error('[stalled-nudge] INTERNAL_API_SHARED_SECRET not configured');
    // Fail closed — don't reveal whether the env var is missing
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

  if (process.env.STALLED_NUDGE_ENABLED !== 'true') {
    return void res.status(200).json({ status: 'disabled', sent: 0 });
  }

  if (!supabaseAdmin) {
    return void res.status(500).json({ error: 'Database not configured' });
  }

  try {
    const now = Date.now();
    const windowStart = new Date(now - NUDGE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const freshCutoff = now - NUDGE_MIN_AGE_MS;

    // All 'started' rows in the last 14 days — grouped per email in JS
    // (PostgREST has no GROUP BY) so a doctor who re-started recently is
    // treated as active, not stalled.
    const { data: startedRows, error: startedErr } = await supabaseAdmin
      .from('physician_onboarding_audit')
      .select('email, language, created_at')
      .eq('action', 'started')
      .gte('created_at', windowStart)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (startedErr) {
      return void res.status(500).json({ error: startedErr.message });
    }

    const latestByEmail = new Map<string, { language: string | null; lastSeen: number }>();
    for (const row of startedRows ?? []) {
      const email = (row.email as string).toLowerCase();
      const ts = new Date(row.created_at as string).getTime();
      const prev = latestByEmail.get(email);
      if (!prev || ts > prev.lastSeen) {
        latestByEmail.set(email, { language: (row.language as string | null) ?? null, lastSeen: ts });
      }
    }

    const stalledEmails = Array.from(latestByEmail.entries())
      .filter(([, v]) => v.lastSeen < freshCutoff)
      .map(([email]) => email);

    if (stalledEmails.length === 0) {
      return void res.status(200).json({ status: 'ok', candidates: 0, sent: 0 });
    }

    // Exclusion sets — completed/nudged in audit, existing physicians, aliases
    const [doneRows, physRows, aliasRows] = await Promise.all([
      supabaseAdmin
        .from('physician_onboarding_audit')
        .select('email, action')
        .in('action', ['completed', 'nudge_sent'])
        .in('email', stalledEmails),
      supabaseAdmin.from('physicians').select('email').in('email', stalledEmails),
      supabaseAdmin.from('physician_email_aliases').select('email').in('email', stalledEmails),
    ]);

    const excluded = new Set<string>();
    for (const row of doneRows.data ?? []) excluded.add((row.email as string).toLowerCase());
    for (const row of physRows.data ?? []) excluded.add((row.email as string).toLowerCase());
    for (const row of aliasRows.data ?? []) excluded.add((row.email as string).toLowerCase());

    const toNudge = stalledEmails.filter((e) => !excluded.has(e)).slice(0, MAX_NUDGES_PER_RUN);

    let sent = 0;
    const failures: string[] = [];
    for (const email of toNudge) {
      const meta = latestByEmail.get(email);
      // LatAm-first: audit rows carry the onboarding language; default 'es'
      const lang = meta?.language === 'en' ? 'en' : 'es';
      const result = await sendOnboardingNudgeEmail({ email, lang });
      if (result.success) {
        sent += 1;
        // Record BEFORE anything else can fail so the one-nudge-ever guarantee
        // holds across runs. Append-only audit table; action value is free text.
        const { error: auditErr } = await supabaseAdmin
          .from('physician_onboarding_audit')
          .insert({
            email,
            action: 'nudge_sent',
            phase: 'nudge',
            language: lang,
            data_snapshot: { sent_via: 'stalled-onboarding-nudge', resend_id: result.id ?? null },
          });
        if (auditErr) {
          // Audit failure after a successful send = risk of double-nudge next
          // run. Surface loudly; the cron log is the paper trail.
          console.error('[stalled-nudge] audit insert failed after send:', email, auditErr.message);
        }
      } else {
        failures.push(email);
        console.error('[stalled-nudge] send failed:', email, result.error);
      }
    }

    console.log(
      `[stalled-nudge] candidates=${stalledEmails.length} eligible=${toNudge.length} sent=${sent} failed=${failures.length}`,
    );
    return void res.status(200).json({
      status: 'ok',
      candidates: stalledEmails.length,
      eligible: toNudge.length,
      sent,
      failed: failures.length,
    });
  } catch (err) {
    console.error('[stalled-nudge] exception:', err);
    return void res.status(500).json({ error: 'Internal error' });
  }
}
