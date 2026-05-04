/**
 * Phase 13 D-24/D-25/D-26 — active-Pro redirect lookup.
 *
 * Returns the custom domain for an active Pro physician's slug, or null if
 * the slug is not currently mapped (free tier, canceled subscription, or no
 * published domain). Consumed by middleware.ts to issue 301 redirects from
 * <slug>.medikah.health → <their-domain>.
 *
 * Performance contract:
 *   - Module-scope in-memory cache with 60s TTL (TTL_MS)
 *   - Next.js edge fetch revalidate hint also at 60s
 *   - One FastAPI call per cold cache, then served from memory
 *
 * Revertibility contract (D-25 / PRO-17):
 *   - When the doctor downgrades or cancels, FastAPI's redirect map drops
 *     the slug. Within ≤60s the middleware sees null and falls through to
 *     the existing rewrite to /sites/<slug> (Try Pro surface restored).
 *
 * Fail-open contract (T-13-08-04):
 *   - Any fetch error returns null. The middleware then preserves the
 *     existing rewrite — doctors never see a 5xx for their Try Pro page
 *     because of an upstream FastAPI outage.
 */

const FASTAPI_URL =
  process.env.PRACTIKAH_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8000';

const INTERNAL_SECRET = process.env.INTERNAL_API_SHARED_SECRET || '';

const TTL_MS = 60_000;

let cache: { map: Record<string, string>; ts: number } | null = null;
let inflight: Promise<Record<string, string>> | null = null;

async function refreshMap(): Promise<Record<string, string>> {
  // Coalesce concurrent refreshes — only one network call per cold window.
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      // Strip trailing slash to avoid double-slashes in the URL.
      const base = FASTAPI_URL.replace(/\/+$/, '');
      const url = `${base}/practikah/internal/pro-redirect-map`;
      const r = await fetch(url, {
        headers: { 'X-Internal-Secret': INTERNAL_SECRET },
        // Next.js edge cache hint — second-layer cache beyond module memo.
        next: { revalidate: 60 },
      } as RequestInit & { next?: { revalidate: number } });
      if (!r.ok) {
        // Non-2xx — fail-open with empty map. Cache the empty result briefly
        // so we don't hammer the upstream during an outage.
        // eslint-disable-next-line no-console
        console.warn(
          `[proRedirectLookup] non-2xx from FastAPI (${r.status}); fail-open empty map`
        );
        return {};
      }
      return (await r.json()) as Record<string, string>;
    } catch (err) {
      // Fail-open: cache miss → no redirect → existing rewrite serves Try Pro.
      // eslint-disable-next-line no-console
      console.error('[proRedirectLookup] fetch failed (fail-open):', err);
      return {};
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

/**
 * Returns the custom domain for ``slug`` if the physician is an active Pro
 * with a published custom domain; otherwise null.
 */
export async function getProRedirect(slug: string): Promise<string | null> {
  const now = Date.now();
  if (cache && now - cache.ts < TTL_MS) {
    return cache.map[slug] || null;
  }
  const map = await refreshMap();
  cache = { map, ts: Date.now() };
  return map[slug] || null;
}

/** Test-only — clears the module-scope cache between unit tests. */
export function __resetProRedirectCacheForTests() {
  cache = null;
  inflight = null;
}
