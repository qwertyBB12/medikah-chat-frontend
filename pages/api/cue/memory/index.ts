/** BFF: GET /api/cue/memory → FastAPI GET /cue/memory (list everything Cue remembers). */
import type { NextApiRequest, NextApiResponse } from 'next';
import { forwardToCue } from '../../../../lib/cue/forwardToCue';

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  await forwardToCue(req, res, { method: 'GET', path: '/cue/memory' });
}
