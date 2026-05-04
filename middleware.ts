import { NextRequest, NextResponse } from 'next/server';
import { getProRedirect } from './lib/proRedirectLookup';

const APEX = 'medikah.health';

/**
 * Reserved subdomains — every subdomain Phase 10 provisioned + defensive future-reservations.
 *
 * Sources:
 *  - Phase 10 vendor-inventory.md: practikah (Mailcow admin), mail (webmail), api (FastAPI backend),
 *    send (Resend bounce subdomain, used for email delivery tracking)
 *  - Phase 11/12 CONTEXT.md: practikah (D-01 marketing landing), klinikah (reserved patient-side brand)
 *  - DNS-only labels added defensively — they never serve HTTP but cheap to guard
 */
const RESERVED_SUBDOMAINS = new Set([
  'mail',        // Mailcow webmail at mail.medikah.health (D-05)
  'practikah',   // Marketing landing + Mailcow admin subdomain (D-01, vendor-inventory.md)
  'klinikah',    // Reserved patient-side brand (PROJECT.md)
  'api',         // FastAPI backend at api.medikah.health
  'admin',       // Admin tools (defensive — not yet live)
  'www',         // Apex www alias
  'send',        // Resend bounce subdomain (Phase 10 SPF/DKIM records at send.medikah.health)
  'mailcow',     // Mailcow infra subdomain (defensive)
  // DNS-only labels (defensive — should never hit HTTP middleware but cheap to include):
  '_dmarc', '_domainkey', '_mta-sts', 'mta-sts',
]);

export async function middleware(req: NextRequest) {
  const host = req.headers.get('host') || '';
  const hostname = host.split(':')[0].toLowerCase();

  // Localhost / dev — early return so `npm run dev` works without subdomain setup.
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0'
  ) {
    return NextResponse.next();
  }

  // Pass-through for apex + www.
  if (hostname === APEX || hostname === `www.${APEX}`) return NextResponse.next();

  // Pass-through for non-medikah.health hosts (Netlify preview deploys, Phase 13 Pro custom domains).
  if (!hostname.endsWith(`.${APEX}`)) return NextResponse.next();

  // Extract the leftmost label (slug candidate).
  const slug = hostname.slice(0, hostname.length - (APEX.length + 1));

  // Empty slug means hostname IS the apex (already handled above) or has empty label — pass through.
  if (!slug) return NextResponse.next();

  // Reserved subdomain — pass through to its own pages tree or external service.
  if (RESERVED_SUBDOMAINS.has(slug)) return NextResponse.next();

  // Multi-level subdomains (e.g., a.b.medikah.health) — not supported in Phase 12; pass through.
  // Phase 13 Pro custom domains are handled by Cloudflare Worker, not this middleware.
  if (slug.includes('.')) return NextResponse.next();

  // Slug must match a safe URL-segment pattern; reject path traversal, special chars, etc. (T-12-04-01, T-12-04-06)
  if (!/^[a-z0-9-]+$/.test(slug)) return NextResponse.next();

  // ── Phase 13 D-24/D-25/D-26: 301 redirect for active Pro physicians ──────
  //
  // Runs AFTER the reserved-subdomain check (line 54), the multi-level guard
  // (line 58), and the URL-segment validator (line 61). At this point ``slug``
  // is sanitized and never one of the reserved labels (mail, practikah,
  // klinikah, www, …) — those have already been short-circuited.
  //
  // Lookup is edge-friendly: 60s in-memory cache + request coalescing
  // (lib/proRedirectLookup.ts). On cache miss the helper fetches the
  // active-Pro redirect map from FastAPI; on any error it returns null and
  // we fall through to the existing rewrite (fail-open, T-13-08-04).
  //
  // The 301 is permanent (D-24): SEO link-equity consolidation, matching
  // Substack/Webflow/Squarespace pattern. Path + query string preserved.
  //
  // Revertibility (D-25 / PRO-17): when the doctor downgrades or cancels,
  // FastAPI's redirect map drops the slug. Within ≤60s ``getProRedirect``
  // returns null and the rewrite below resumes serving the Try Pro page.
  const customDomain = await getProRedirect(slug);
  if (customDomain) {
    const target = new URL(
      req.nextUrl.pathname + req.nextUrl.search,
      `https://${customDomain}`
    );
    return NextResponse.redirect(target, 301);
  }

  // Rewrite to /sites/<slug> tree. Preserves path, query string, and hash.
  // The rewrite is internal — the browser URL stays as <slug>.medikah.health.
  // Cache safety (T-12-04-04): the Netlify edge cache key includes the full host header,
  // so dr-a.medikah.health and dr-b.medikah.health never share a cache entry.
  //
  // Special case: /sitemap.xml on a slug subdomain → /sites/<slug>/sitemap.xml
  // (WEB-14: per-slug sitemap endpoint). The SSR handler writes raw XML.
  const url = req.nextUrl.clone();
  const originalPath = url.pathname;
  url.pathname = `/sites/${slug}${originalPath === '/' ? '' : originalPath}`;
  return NextResponse.rewrite(url);
}

export const config = {
  /**
   * Matcher excludes:
   *  - /_next/* (Next.js internals: HMR, chunks, image optimization)
   *  - /api/*   (BFF routes must remain routable on apex without rewrite)
   *  - /favicon.ico, /robots.txt, /sitemap.xml (apex static well-known paths)
   *  - Most file extensions (Netlify static assets: .js, .css, .png, etc.)
   *
   * NOTE: /sitemap.xml is NOT excluded globally — it is excluded by the .*\\..*
   * pattern only when on the apex domain (pass-through). When on a slug subdomain
   * (<slug>.medikah.health/sitemap.xml), the middleware must rewrite to
   * /sites/<slug>/sitemap.xml. The rewrite function below handles this case
   * explicitly before the file-extension guard.
   *
   * We allow *.xml paths through the matcher so the middleware can decide
   * whether to rewrite (slug subdomain) or pass through (apex).
   */
  matcher: ['/((?!_next/|api/|favicon.ico|robots.txt|.*\\.(js|css|png|jpg|jpeg|gif|ico|woff|woff2|ttf|svg|webp|map|json|txt)).*)'],
};
