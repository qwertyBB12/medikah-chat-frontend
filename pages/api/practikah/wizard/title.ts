/**
 * BFF route: POST /api/practikah/wizard/title
 *
 * Wizard Step 1 — persists the doctor's chosen honorific (Dr / Dra) to FastAPI.
 * FastAPI stores it in physician_workspace_accounts.title (12-02 implements the table).
 *
 * Mirrors provision.ts BFF skeleton exactly. No audit log — intermediate wizard step.
 *
 * Body: { title: 'Dr' | 'Dra' }
 * Validates title before forwarding (400 on invalid value).
 * 405 on wrong method. 401 on missing session / token.
 * 502 on FastAPI unreachable.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { authOptions } from '../../auth/[...nextauth]';

const FASTAPI_URL =
  process.env.PRACTIKAH_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8000';

const VALID_TITLES = ['Dr', 'Dra'];

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

  // 4. Server-side validation
  const body = req.body as Record<string, unknown>;
  const title = body?.title;
  if (!title || !VALID_TITLES.includes(title as string)) {
    return res
      .status(400)
      .json({ error: `title must be one of: ${VALID_TITLES.join(', ')}` });
  }

  // 5. Forward to FastAPI
  try {
    const upstream = await fetch(`${FASTAPI_URL}/practikah/wizard/title`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenRaw}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    });

    const result: unknown = await upstream.json();
    return res.status(upstream.status).json(result);
  } catch (err) {
    console.error('Exception in wizard/title BFF:', err);
    return res.status(502).json({ error: 'Upstream API unreachable' });
  }
}
