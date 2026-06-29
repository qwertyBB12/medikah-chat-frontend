import type { GetServerSidePropsContext } from 'next';

export type Region = 'US' | 'MX';

/**
 * Detect the visitor's jurisdiction (US vs MX) for serving the correct
 * Terms of Service. Region is a JURISDICTION signal (geo), distinct from
 * `locale` (language). Default/fallback = MX (LatAm-first, per launch directive).
 *
 * Detection order:
 *   1. ?region=us|mx  — explicit override (travelers / VPN / QA)
 *   2. x-nf-geo       — Netlify's canonical geo header (base64 JSON), readable
 *                       in SSR functions. Same shape as Edge `context.geo`.
 *   3. x-country      — Netlify legacy proxy header (trust only US/MX)
 *   4. Accept-Language en-US hint
 *   5. default MX
 *
 * Requires getServerSideProps (per-request) — a static page never sees x-nf-geo.
 */
export function detectRegion(ctx: GetServerSidePropsContext): Region {
  const q = ctx.query?.region;
  const qv = Array.isArray(q) ? q[0] : q;
  if (qv) {
    const u = qv.toUpperCase();
    if (u === 'US') return 'US';
    if (u === 'MX') return 'MX';
  }

  const headers = ctx.req.headers;

  const raw = headers['x-nf-geo'];
  if (typeof raw === 'string' && raw.length) {
    try {
      const geo = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
      const code = String(geo?.country?.code || '').toUpperCase();
      if (code === 'US') return 'US';
      if (code) return 'MX'; // any other detected country → MX terms
    } catch {
      /* fall through */
    }
  }

  const xc = String(headers['x-country'] || '').toUpperCase();
  if (xc === 'US') return 'US';
  if (xc === 'MX') return 'MX';

  const al = String(headers['accept-language'] || '');
  if (/\ben-US\b/i.test(al)) return 'US';

  return 'MX';
}
