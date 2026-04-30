/**
 * pages/sites/[slug]/sitemap.xml.tsx
 *
 * WEB-14: Per-slug sitemap.xml SSR endpoint.
 *
 * Accessible at:
 *  - Dev:  http://localhost:3000/sites/<slug>/sitemap.xml
 *  - Prod: https://<slug>.medikah.health/sitemap.xml
 *         (via middleware.ts rewrite: <slug>.medikah.health/sitemap.xml
 *          → /sites/<slug>/sitemap.xml)
 *
 * This component never renders HTML — getServerSideProps writes raw XML
 * and ends the response directly.
 *
 * Security:
 *  - T-12-06-01: Only verified physicians (verification_status='verified') are served.
 *    Returns 404 for unverified or unknown slugs.
 *  - physician_website.enabled = false → 404 (site is offline).
 *  - Slug regex enforced (defense-in-depth; middleware already validates).
 *
 * Caching:
 *  - s-maxage=300 (5 min) + stale-while-revalidate=3600 (1 hour).
 *    Sitemap changes slowly (monthly content edits); short-lived CDN cache
 *    balances freshness with origin load.
 */

import type { GetServerSideProps } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseServer';
import { nameToSlug } from '../../../lib/slug';

// This component is never rendered — the SSR handler writes raw XML.
export default function Sitemap() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async ({ params, res }) => {
  const slug = String(params?.slug || '').toLowerCase();

  // Slug validation — defense-in-depth (middleware already rejects unsafe slugs)
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    res.statusCode = 404;
    res.end();
    return { props: {} };
  }

  // Database unavailable
  if (!supabaseAdmin) {
    res.statusCode = 500;
    res.end();
    return { props: {} };
  }

  try {
    // ── Step 1: Resolve slug → verified physician ─────────────────────────
    //
    // T-12-06-01: Only verified physicians appear in sitemaps.
    // Unverified or unknown slugs → 404.
    const { data: physicians, error: physError } = await supabaseAdmin
      .from('physicians')
      .select('id, full_name')
      .eq('verification_status', 'verified');

    if (physError || !physicians) {
      res.statusCode = 500;
      res.end();
      return { props: {} };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const physiciansList = physicians as any[];
    const physician = physiciansList.find(
      (p: { full_name: string }) => nameToSlug(p.full_name) === slug
    );

    if (!physician) {
      res.statusCode = 404;
      res.end();
      return { props: {} };
    }

    // ── Step 2: Check physician_website.enabled ───────────────────────────
    //
    // T-12-06-01: If the site is disabled, the sitemap should 404.
    // This prevents disabled doctors from appearing in search engine sitemaps.
    const { data: website } = await supabaseAdmin
      .from('physician_website')
      .select('enabled, updated_at')
      .eq('physician_id', physician.id)
      .maybeSingle();

    if (website?.enabled === false) {
      res.statusCode = 404;
      res.end();
      return { props: {} };
    }

    // ── Step 3: Build and write XML ───────────────────────────────────────
    //
    // Phase 12 ships single-page Try Pro previews (the root URL only).
    // Additional sub-routes (e.g., /schedule, /gallery) will be added here
    // as they ship in future phases.
    const lastmod = website?.updated_at
      ? new Date(website.updated_at).toISOString()
      : new Date().toISOString();
    const baseUrl = `https://${slug}.medikah.health`;

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;

    // Cache: 5-min CDN edge cache + 1-hour stale-while-revalidate
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
    res.write(xml);
    res.end();

    return { props: {} };
  } catch {
    res.statusCode = 500;
    res.end();
    return { props: {} };
  }
};
