/** BFF: DELETE/PATCH /api/cue/memory/[id] → FastAPI /cue/memory/{id} (forget / correct). */
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
  if (req.method === 'PATCH') {
    await forwardToCue(req, res, { method: 'PATCH', path, forwardBody: true });
    return;
  }
  res.status(405).json({ error: 'Method not allowed' });
}
