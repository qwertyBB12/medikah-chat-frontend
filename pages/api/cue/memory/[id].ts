/** BFF: DELETE /api/cue/memory/[id] → FastAPI /cue/memory/{id} (forget).
 *
 *  View + DELETE only — there is deliberately NO edit/PATCH. Rewriting a note
 *  would silently change how Cue reasons, with effects the doctor cannot see
 *  (product decision 2026-06-28); delete is the privacy right, edit is withheld.
 *  The FastAPI route mirrors this (no PATCH endpoint). This guard keeps the edge
 *  honest so the dead path can't be reintroduced here in isolation. */
import type { NextApiRequest, NextApiResponse } from 'next';
import { forwardToCue } from '../../../../lib/cue/forwardToCue';

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  if (!id) {
    res.status(400).json({ error: 'Missing note id' });
    return;
  }
  const path = `/cue/memory/${encodeURIComponent(id)}`;

  if (req.method === 'DELETE') {
    await forwardToCue(req, res, { method: 'DELETE', path });
    return;
  }
  // Everything else — including PATCH — is rejected. No edit path by design.
  res.setHeader('Allow', 'DELETE');
  res.status(405).json({ error: 'Method not allowed' });
}
