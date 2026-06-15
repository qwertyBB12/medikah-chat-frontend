/**
 * BFF route: POST /api/practikah/mailbox/change-password
 *
 * Forwards a mailbox password-change request to the FastAPI
 * /practikah/mailbox/change-password endpoint, forwarding the NextAuth HS256
 * JWT as Authorization: Bearer per Phase 11 D-04.
 *
 * Security:
 *   - req.body is NEVER logged (T-12-03-02 — passwords must not appear in logs).
 *   - new_password.length >= 12 validated server-side before forwarding.
 *   - Writes workspace_audit_log row: action='workspace.password_changed'
 *     (security-relevant — IP + UA captured via extractRequestContext).
 *   - Returns upstream status + body verbatim per D-07 (structured FastAPI errors
 *     preserved; Phase 12 UI reads body.detail for user-facing messages).
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { authOptions } from '../../auth/[...nextauth]';
import { logEvent, extractRequestContext } from '../../../../lib/workspaceAuditService';
import { checkPassword } from '../../../../lib/passwordPolicy';

const FASTAPI_URL =
  process.env.PRACTIKAH_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8000';

interface ChangePasswordBody {
  current_password?: string;
  new_password?: string;
}

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

  // 3. Extract raw NextAuth HS256 JWT for FastAPI verification (D-04)
  const tokenRaw = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    raw: true,
  });
  if (!tokenRaw) {
    return res.status(401).json({ error: 'Session token unavailable' });
  }

  // 4. Server-side new_password policy validation (before forwarding):
  //    ≥12 chars + ≥3 of 4 character classes (Phase 17 SC2 / hardening decision 36)
  const body = req.body as ChangePasswordBody;
  const newPassword = body?.new_password ?? '';
  const pwCheck = checkPassword(typeof newPassword === 'string' ? newPassword : '');
  if (!pwCheck.valid) {
    return res.status(422).json({
      error:
        pwCheck.reason === 'needs_mix'
          ? 'new_password must mix at least 3 of: lowercase, uppercase, number, symbol'
          : 'new_password must be at least 12 characters',
      reason: pwCheck.reason,
    });
  }

  // 5. Forward to FastAPI — never log req.body (T-12-03-02)
  try {
    const upstream = await fetch(
      `${FASTAPI_URL}/practikah/mailbox/change-password`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenRaw}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req.body),
      },
    );

    const result: unknown = await upstream.json();

    // 6. OPS-01 audit log — write on HTTP 200 (workspace.password_changed is SECURITY_RELEVANT)
    if (upstream.status === 200) {
      const reqCtx = extractRequestContext(req);
      await logEvent({
        physicianId:
          (session.user as { id?: string }).id ??
          (result as Record<string, unknown>)?.physician_id as string ?? '',
        actorId: (session.user as { id?: string }).id,
        actorRole: 'physician',
        action: 'workspace.password_changed',
        resourceType: 'mailbox',
        detail: { source: 'bff' },
        ipAddress: reqCtx.ipAddress,
        userAgent: reqCtx.userAgent,
      });
    }

    return res.status(upstream.status).json(result);
  } catch (err) {
    console.error('[change-password BFF] Exception:', err instanceof Error ? err.message : String(err));
    return res.status(502).json({ error: 'Upstream API unreachable' });
  }
}
