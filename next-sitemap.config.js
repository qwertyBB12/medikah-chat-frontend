/** @type {import('next-sitemap').IConfig} */

const { createClient } = require('@supabase/supabase-js');

/**
 * Inline slug generation matching lib/slug.ts nameToSlug().
 * Inlined because this CJS config cannot import TypeScript modules.
 */
function nameToSlug(name) {
  return name
    .toLowerCase()
    .replace(/^(dr\.?\s+|dra\.?\s+)/i, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

module.exports = {
  siteUrl: 'https://medikah.health',
  generateRobotsTxt: true,
  sitemapSize: 5000,

  exclude: [
    '/chat',
    '/patients',
    '/patients/*',
    '/physicians',
    '/physicians/*',
    '/insurers',
    '/employers',
    '/onboard/*',
    '/admin',
    '/admin/*',
    '/doctor',
    '/doctor/*',
    '/404',
    '/500',
  ],

  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/chat', '/api/'],
      },
    ],
  },

  additionalPaths: async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn(
        '[next-sitemap] NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set. Skipping dynamic /dr/ URLs.'
      );
      return [];
    }

    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data: physicians, error } = await supabase
        .from('physicians')
        .select('full_name')
        .eq('verification_status', 'verified');

      if (error) {
        console.error('[next-sitemap] Supabase query error:', error.message);
        return [];
      }

      if (!physicians || physicians.length === 0) {
        console.warn('[next-sitemap] No verified physicians found.');
        return [];
      }

      console.log(`[next-sitemap] Adding ${physicians.length} verified physician URLs.`);

      return physicians.map((p) => ({
        loc: `/dr/${nameToSlug(p.full_name)}`,
        changefreq: 'weekly',
        priority: 0.7,
        lastmod: new Date().toISOString(),
      }));
    } catch (err) {
      console.error('[next-sitemap] Error fetching physicians:', err.message);
      return [];
    }
  },
};
