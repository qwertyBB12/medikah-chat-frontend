import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseServer';

// Public avatar lookup by email — used by the SOGo post-login chrome
// (`mailcow-config/sogo/custom-sogo.js` → tagAvatar()) to swap SOGo's default
// person icon with a real physician photo or a teal initials circle.
//
// Plan 13.1-04 Task 5. Public endpoint (no auth) — same exposure as the
// physician public profiles at /dr/[slug] which already render photo_url.
//
// Response shape (always `ok:true` so the caller can render a fallback):
//   { ok: true, photo_url: string | null, name: string | null, initials: string }

interface AvatarResponse {
  ok: true;
  photo_url: string | null;
  name: string | null;
  initials: string;
}

interface ErrorResponse {
  ok: false;
  error: string;
}

function deriveInitials(name: string | null, email: string): string {
  // Prefer the physician name when present.
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    if (parts[0]) return parts[0].substring(0, 2).toUpperCase();
  }
  // Fall back to the local-part of the email.
  const local = (email.split('@')[0] || '').replace(/[^A-Za-z]+/g, ' ').trim();
  const localParts = local.split(/\s+/).filter(Boolean);
  if (localParts.length >= 2) {
    return (localParts[0].charAt(0) + localParts[1].charAt(0)).toUpperCase();
  }
  if (localParts[0]) return localParts[0].substring(0, 2).toUpperCase();
  return (email.substring(0, 2) || '?').toUpperCase();
}

// CORS — the SOGo post-login chrome at https://mail.practikah.medikah.health
// fetches this endpoint cross-origin to render avatars. Without these headers
// Safari/Chrome block the response with `Access-Control-Allow-Origin` errors
// and the chrome falls back to initials silently. Allowed origins are pinned;
// we do not echo arbitrary `Origin` headers.
const ALLOWED_ORIGINS = new Set<string>([
  'https://mail.practikah.medikah.health',
  'https://practikah.medikah.health',
]);

function applyCors(req: NextApiRequest, res: NextApiResponse): void {
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : '';
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AvatarResponse | ErrorResponse>
) {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const rawEmail = req.query.email;
  const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
  if (!email || !/^[a-z0-9._+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email)) {
    return res.status(400).json({ ok: false, error: 'Valid email is required' });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({ ok: false, error: 'Database not configured' });
  }

  // Photos don't change often. Cache aggressively at the edge to keep SOGo
  // responsive and to avoid hammering the DB on every view change.
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600, stale-while-revalidate=86400');

  try {
    // Resolve the physician row by email — directly OR via a login alias /
    // mailbox address. A doctor signs into SOGo as their @medikah.health mailbox,
    // which is an ALIAS (physician_email_aliases) of a canonical record whose
    // physicians.email is a DIFFERENT address (e.g. their Google email — where the
    // photo lives). The direct lookup misses that, so the avatar fell back to
    // initials even when a photo exists. Same alias gap as the workspace mailbox.
    type AvatarRow = {
      full_name: string | null;
      photo_url: string | null;
      verification_status: string | null;
    };
    let data: AvatarRow | null = null;

    const direct = await supabaseAdmin
      .from('physicians')
      .select('full_name, photo_url, verification_status')
      .ilike('email', email)
      .maybeSingle();
    if (!direct.error && direct.data) data = direct.data as AvatarRow;

    if (!data) {
      // Fallback: resolve the canonical physician_id via the login-alias table,
      // then the workspace mailbox address, then re-fetch by id.
      let physicianId: string | null = null;
      const alias = await supabaseAdmin
        .from('physician_email_aliases')
        .select('physician_id')
        .ilike('email', email)
        .maybeSingle();
      if (!alias.error && alias.data?.physician_id) {
        physicianId = String(alias.data.physician_id);
      }
      if (!physicianId) {
        const wa = await supabaseAdmin
          .from('physician_workspace_accounts')
          .select('physician_id')
          .ilike('mailbox_address', email)
          .maybeSingle();
        if (!wa.error && wa.data?.physician_id) {
          physicianId = String(wa.data.physician_id);
        }
      }
      if (physicianId) {
        const byId = await supabaseAdmin
          .from('physicians')
          .select('full_name, photo_url, verification_status')
          .eq('id', physicianId)
          .maybeSingle();
        if (!byId.error && byId.data) data = byId.data as AvatarRow;
      }
    }

    if (!data) {
      return res.status(200).json({
        ok: true,
        photo_url: null,
        name: null,
        initials: deriveInitials(null, email),
      });
    }

    // Mirror the dr/[slug] gate: only verified physicians' photos are public.
    // Unverified accounts still get an initials fallback (the user is still a
    // real workspace owner — they just haven't been credentialed yet).
    const photo =
      data.verification_status === 'verified' && data.photo_url
        ? String(data.photo_url)
        : null;

    return res.status(200).json({
      ok: true,
      photo_url: photo,
      name: data.full_name ?? null,
      initials: deriveInitials(data.full_name ?? null, email),
    });
  } catch (err) {
    console.error('[avatar] lookup failed:', err);
    return res.status(200).json({
      ok: true,
      photo_url: null,
      name: null,
      initials: deriveInitials(null, email),
    });
  }
}
