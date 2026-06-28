/**
 * BFF route: POST /api/practikah/provision
 *
 * Forwards a Práctikah Pro workspace provisioning request to the FastAPI
 * /practikah/provision endpoint, forwarding the NextAuth HS256 JWT as
 * Authorization: Bearer per Phase 11 D-04.
 *
 * Per D-04: browser never touches FastAPI directly. This BFF reads the httpOnly
 * NextAuth session, mints a fresh HS256 JWS, and forwards it as a Bearer
 * token. FastAPI's verified_physician dependency re-verifies the HS256 signature
 * and asserts verification_status='verified' (D-05, D-06).
 *
 * Per D-07: FastAPI returns a bilingual structured 403 envelope on verification
 * failure. This BFF returns it verbatim — no collapse to { error: '...' }.
 * Phase 12 UI relies on body.detail.code === 'WSPC_NOT_VERIFIED'.
 *
 * Per OPS-01 + D-13 (Table B): on HTTP 200 success from FastAPI, writes a
 * workspace_audit_log row for 'pro.upgraded' via workspaceAuditService.logEvent.
 * Audit write is best-effort — failure is logged but never propagated.
 * On non-200 responses (including 403 bilingual envelope), NO audit log entry
 * is written (no state change occurred).
 *
 * Per T-11-07-07: pro.upgraded is NOT in SECURITY_RELEVANT_ACTIONS, so
 * IP/UA fields are filtered to null by workspaceAuditService.logEvent.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { authOptions } from '../auth/[...nextauth]';
import { mintBackendToken } from '../../../lib/auth/backendToken';
import { logEvent, extractRequestContext } from '../../../lib/workspaceAuditService';

const FASTAPI_URL =
  process.env.PRACTIKAH_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8000';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  // 1. Method check
  if (req.method !== 'POST') {
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

  // 4. Forward to FastAPI — pass through structured response verbatim (D-07)
  try {
    const upstream = await fetch(`${FASTAPI_URL}/practikah/provision`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenRaw}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const result = await upstream.json() as Record<string, unknown>;

    // 5. OPS-01 audit log write — ONLY on success (HTTP 200)
    // Non-200 responses (including 403 bilingual envelope) → no audit entry.
    if (upstream.status === 200) {
      const reqCtx = extractRequestContext(req);
      // Best-effort audit write — logEvent never throws
      await logEvent({
        // FastAPI returns physician_id in the result; fallback to request body
        physicianId:
          (result.physician_id as string | undefined) ??
          (req.body as Record<string, unknown>)?.physician_id as string ?? '',
        actorId: (session.user as { id?: string }).id,
        actorRole: 'physician',
        action: 'pro.upgraded',
        resourceType: 'workspace',
        resourceId: result.run_id as string | undefined,
        detail: {
          domain: result.domain,
          mailbox_address: result.mailbox_address,
          elapsed_seconds: result.elapsed_seconds,
        },
        // pro.upgraded is NOT in SECURITY_RELEVANT_ACTIONS → these will be
        // filtered to null by workspaceAuditService (T-11-07-07)
        ipAddress: reqCtx.ipAddress,
        userAgent: reqCtx.userAgent,
      });
    }

    return res.status(upstream.status).json(result);
  } catch (err) {
    console.error('Exception in provision BFF:', err);
    return res.status(502).json({ error: 'Upstream API unreachable' });
  }
}
