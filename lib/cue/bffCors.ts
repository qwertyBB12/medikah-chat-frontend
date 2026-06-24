/**
 * lib/cue/bffCors.ts — CORS for the Cue BFF routes (Plan 23-06 follow-up).
 *
 * The SOGo-injected Cue surface (mailcow-config/sogo/custom-sogo.js) runs on
 * practikah.medikah.health and posts CREDENTIALED requests to the Cue BFF on
 * medikah.health (/api/cue/*). That is a cross-origin call, so the BFF must:
 *   - echo an allow-listed Origin (NEVER `*` with credentials),
 *   - set Access-Control-Allow-Credentials: true so the .medikah.health NextAuth
 *     cookie is accepted,
 *   - answer the OPTIONS preflight.
 * The React dashboard surface is same-origin and unaffected.
 *
 * Allow-list: env `CUE_BFF_ALLOWED_ORIGINS` (comma-separated) overrides the
 * default of the practikah SOGo apex. Same-origin requests carry no Origin
 * header (or the app's own origin) and pass through untouched.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

const DEFAULT_ALLOWED = ['https://practikah.medikah.health'];

function allowedOrigins(): Set<string> {
  const fromEnv = (process.env.CUE_BFF_ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const appOrigin = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  return new Set([...DEFAULT_ALLOWED, ...fromEnv, ...(appOrigin ? [appOrigin] : [])]);
}

/**
 * Apply Cue BFF CORS. Returns `true` if the request was an OPTIONS preflight
 * that this helper fully answered (the caller MUST then `return` without further
 * work). For non-preflight requests it sets the CORS response headers (when the
 * Origin is allow-listed) and returns `false` so the handler proceeds.
 */
export function applyCueBffCors(req: NextApiRequest, res: NextApiResponse): boolean {
  const origin = req.headers.origin;
  if (origin && allowedOrigins().has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Locale',
    );
  }

  if (req.method === 'OPTIONS') {
    // Preflight — answer with the headers already set (204, no body).
    res.status(204).end();
    return true;
  }
  return false;
}
