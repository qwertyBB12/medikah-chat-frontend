/**
 * BFF route: GET /api/practikah/mailbox/mobileconfig
 *
 * Streams the Apple .mobileconfig binary profile through from the FastAPI
 * /practikah/mailbox/mobileconfig endpoint. The profile allows iOS/macOS
 * Mail and Calendar to auto-configure IMAP+SMTP+CalDAV with one tap.
 *
 * Security:
 *   - JWT-gated: only the authenticated physician can download their profile.
 *   - Cache-Control: no-store — never cached by any intermediary (T-12-03-04).
 *   - Binary stream-through: content-type set to application/x-apple-aspen-config.
 *   - 5 MB response limit (generous; typical .mobileconfig is < 10 KB).
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { authOptions } from '../../auth/[...nextauth]';

const FASTAPI_URL =
  process.env.PRACTIKAH_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8000';

// Increase default body size limit for binary response passthrough
export const config = { api: { responseLimit: '5mb' } };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  // 1. Method check
  if (req.method !== 'GET') {
    res.status(405).end();
    return;
  }

  // 2. Session check (browser httpOnly cookie)
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    res.status(401).end();
    return;
  }

  // 3. Extract raw NextAuth HS256 JWT for FastAPI verification (D-04)
  const tokenRaw = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    raw: true,
  });
  if (!tokenRaw) {
    res.status(401).end();
    return;
  }

  // 4. Forward to FastAPI — stream binary body through
  try {
    const upstream = await fetch(
      `${FASTAPI_URL}/practikah/mailbox/mobileconfig`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenRaw}`,
        },
      },
    );

    if (!upstream.ok) {
      const errorBody: unknown = await upstream.json().catch(() => ({ error: 'mobileconfig fetch failed' }));
      res.status(upstream.status).json(errorBody);
      return;
    }

    // Stream binary body as Buffer
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', 'application/x-apple-aspen-config');
    res.setHeader('Content-Disposition', 'attachment; filename="practikah.mobileconfig"');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(buf);
  } catch (err) {
    console.error('[mobileconfig BFF] Exception:', err instanceof Error ? err.message : String(err));
    res.status(502).json({ error: 'Upstream unreachable' });
  }
}
