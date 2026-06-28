/**
 * BFF route: POST /api/practikah/theme/claim
 *
 * Forwards the D-19 'Claim Try Pro Preview' one-click action to FastAPI
 * PUT /practikah/theme/claim, which creates a default physician_website_themes
 * row and sets physician_website.enabled = TRUE.
 *
 * Accepts both POST and PUT for flexibility (POST is canonical for the claim
 * flow; PUT is accepted for idempotent re-claim from curl/testing).
 *
 * Per OPS-01 + T-12-05-06: on HTTP 200 success, writes workspace_audit_log row
 * for 'workspace.site_published'. Audit is best-effort — never blocks response.
 *
 * Per D-07: FastAPI 401/403 bilingual envelopes forwarded verbatim.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { authOptions } from '../../auth/[...nextauth]';
import { mintBackendToken } from '../../../../lib/auth/backendToken';
import { logEvent } from '../../../../lib/workspaceAuditService';

const FASTAPI_URL =
  process.env.PRACTIKAH_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8000';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  // 1. Method guard — POST or PUT
  if (req.method !== 'POST' && req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. Session check (browser httpOnly cookie)
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // NextAuth v4 issues an encrypted JWE; forwarding it raw 401s the FastAPI
  // HS256 gate ("Invalid token"). Mint a fresh HS256 JWS from the decrypted
  // session claims instead — see lib/auth/backendToken.ts (requires the same
  // NEXTAUTH_SECRET on Netlify (signs) and Render (verifies)).
  const sessionToken = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });
  const tokenRaw =
    sessionToken?.userId && sessionToken?.role
      ? await mintBackendToken({
          userId: String(sessionToken.userId),
          role: String(sessionToken.role),
          email: session.user.email,
          physicianId: sessionToken.physician_id
            ? String(sessionToken.physician_id)
            : undefined,
        }).catch(() => null)
      : null;
  if (!tokenRaw) {
    return res.status(401).json({ error: 'Session token unavailable' });
  }

  // 4. Forward to FastAPI PUT /practikah/theme/claim (no body required)
  try {
    const upstream = await fetch(`${FASTAPI_URL}/practikah/theme/claim`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${tokenRaw}`,
        'Content-Type': 'application/json',
      },
    });

    const result = (await upstream.json()) as Record<string, unknown>;

    // 5. OPS-01 audit log — only on success (T-12-05-06)
    if (upstream.status === 200) {
      await logEvent({
        physicianId:
          (result.physician_id as string | undefined) ?? '',
        actorId: (session.user as { id?: string }).id,
        actorRole: 'physician',
        action: 'workspace.site_published',
        resourceType: 'website',
        detail: {
          layout_variant: result.layout_variant,
          accent_color: result.accent_color,
          source: 'claim',
        },
        // workspace.site_published is NOT security-relevant → IP/UA filtered to null
      });
    }

    return res.status(upstream.status).json(result);
  } catch (err) {
    console.error('Exception in theme/claim BFF:', err);
    return res.status(502).json({ error: 'Upstream API unreachable' });
  }
}
