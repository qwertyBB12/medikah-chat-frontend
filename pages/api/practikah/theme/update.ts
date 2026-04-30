/**
 * BFF route: PUT /api/practikah/theme/update
 *
 * Forwards a theme upsert request to the FastAPI PUT /practikah/theme endpoint,
 * forwarding the NextAuth HS256 JWT as Authorization: Bearer (Phase 11 D-04).
 *
 * Accepts both PUT and POST for browser convenience (PUT is canonical; POST is
 * provided for fetch calls that avoid CORS preflight on same-origin requests).
 *
 * Per OPS-01 + T-12-05-06: on HTTP 200 success from FastAPI, writes a
 * workspace_audit_log row for 'workspace.theme_changed' via workspaceAuditService.
 * Audit write is best-effort — never propagated to caller.
 *
 * Per T-12-05-04: server-side URL prefix validation lives in FastAPI; this BFF
 * forwards the body verbatim and lets FastAPI be the final authority.
 *
 * Per D-07: FastAPI 401/403 bilingual envelopes forwarded verbatim.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { authOptions } from '../../auth/[...nextauth]';
import { logEvent } from '../../../../lib/workspaceAuditService';

const FASTAPI_URL =
  process.env.PRACTIKAH_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8000';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  // 1. Method guard — PUT or POST
  if (req.method !== 'PUT' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. Session check (browser httpOnly cookie)
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // 3. Extract raw NextAuth HS256 JWT for FastAPI verification (D-04)
  const tokenRaw = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    raw: true,
  });
  if (!tokenRaw) {
    return res.status(401).json({ error: 'Session token unavailable' });
  }

  // 4. Forward to FastAPI PUT /practikah/theme
  try {
    const upstream = await fetch(`${FASTAPI_URL}/practikah/theme`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${tokenRaw}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const result = (await upstream.json()) as Record<string, unknown>;

    // 5. OPS-01 audit log — only on success (T-12-05-06)
    if (upstream.status === 200) {
      // Best-effort — logEvent never throws
      await logEvent({
        physicianId:
          (result.physician_id as string | undefined) ??
          ((req.body as Record<string, unknown>)?.physician_id as string | undefined) ?? '',
        actorId: (session.user as { id?: string }).id,
        actorRole: 'physician',
        action: 'workspace.theme_changed',
        resourceType: 'theme',
        detail: {
          layout_variant: (req.body as Record<string, unknown>)?.layout_variant,
          accent_color: (req.body as Record<string, unknown>)?.accent_color,
          font_weight: (req.body as Record<string, unknown>)?.font_weight,
        },
        // workspace.theme_changed is NOT security-relevant → IP/UA filtered to null
      });
    }

    return res.status(upstream.status).json(result);
  } catch (err) {
    console.error('Exception in theme/update BFF:', err);
    return res.status(502).json({ error: 'Upstream API unreachable' });
  }
}
