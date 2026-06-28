/** BFF: POST /api/cue/memory/aviso-ack → FastAPI POST /cue/memory/aviso-ack (unlock memory). */
import type { NextApiRequest, NextApiResponse } from 'next';
import { forwardToCue } from '../../../../lib/cue/forwardToCue';

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  await forwardToCue(req, res, { method: 'POST', path: '/cue/memory/aviso-ack' });
}
