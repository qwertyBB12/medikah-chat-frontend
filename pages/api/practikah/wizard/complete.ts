/**
 * BFF route: POST /api/practikah/wizard/complete
 *
 * Wizard Step 3 (final) — submits the completed wizard payload to FastAPI which
 * triggers the mailbox provisioning saga (12-02 implements the saga).
 *
 * Per T-12-01-04: mailbox_password is NEVER logged. This handler logs
 * only result.mailbox_address after 200 success.
 *
 * Per T-12-01-05: on upstream 200, writes workspace.setup_completed to
 * workspace_audit_log (OPS-01 6-year retention). Best-effort — never throws.
 *
 * Body: { title: 'Dr' | 'Dra', mailbox_local_part: string, mailbox_password: string }
 * Upstream 200 response: { success: true, run_id, mailbox_address, slug, physician_id }
 *
 * 400 on body validation fail. 405 on wrong method. 401 on missing session / token.
 * 502 on FastAPI unreachable.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { authOptions } from '../../auth/[...nextauth]';
import { logEvent, extractRequestContext } from '../../../../lib/workspaceAuditService';

const FASTAPI_URL =
  process.env.PRACTIKAH_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8000';

const VALID_TITLES = ['Dr', 'Dra'];
const LOCAL_PART_REGEX = /^[a-z0-9._-]+$/;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  // 1. Method check
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. Session check
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // 3. Raw NextAuth JWT for FastAPI (D-04)
  const tokenRaw = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    raw: true,
  });
  if (!tokenRaw) {
    return res.status(401).json({ error: 'Session token unavailable' });
  }

  // 4. Server-side body validation (T-12-01-02)
  const body = req.body as Record<string, unknown>;
  const { title, mailbox_local_part, mailbox_password } = body;

  if (!title || !VALID_TITLES.includes(title as string)) {
    return res
      .status(400)
      .json({ error: `title must be one of: ${VALID_TITLES.join(', ')}` });
  }

  if (
    typeof mailbox_local_part !== 'string' ||
    !LOCAL_PART_REGEX.test(mailbox_local_part) ||
    mailbox_local_part.length < 1 ||
    mailbox_local_part.length > 64
  ) {
    return res.status(400).json({
      error:
        'mailbox_local_part must match /^[a-z0-9._-]+$/ and be 1-64 characters',
    });
  }

  if (typeof mailbox_password !== 'string' || mailbox_password.length < 12) {
    return res.status(400).json({
      error: 'mailbox_password must be at least 12 characters',
    });
  }

  // 5. Forward to FastAPI (T-12-01-04: do NOT log req.body — password is in it)
  try {
    const upstream = await fetch(`${FASTAPI_URL}/practikah/wizard/complete`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenRaw}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, mailbox_local_part, mailbox_password }),
    });

    const result = (await upstream.json()) as Record<string, unknown>;

    // 6. Audit log on success — ONLY on 200 (T-12-01-05, OPS-01)
    if (upstream.status === 200) {
      const reqCtx = extractRequestContext(req);
      // Best-effort — never throws (workspaceAuditService contract)
      await logEvent({
        physicianId: (result.physician_id as string | undefined) ?? '',
        actorId: (session.user as { id?: string }).id,
        actorRole: 'physician',
        action: 'workspace.setup_completed',
        resourceType: 'workspace',
        resourceId: result.run_id as string | undefined,
        // T-12-01-04: log only mailbox_address, NOT mailbox_password
        detail: {
          mailbox_address: result.mailbox_address,
          tier: 'free',
        },
        // workspace.setup_completed IS in SECURITY_RELEVANT_ACTIONS → IP/UA captured
        ipAddress: reqCtx.ipAddress,
        userAgent: reqCtx.userAgent,
      });
    }

    return res.status(upstream.status).json(result);
  } catch (err) {
    console.error('Exception in wizard/complete BFF:', err);
    return res.status(502).json({ error: 'Upstream API unreachable' });
  }
}
