/**
 * pages/sites/[slug]/index.tsx
 *
 * SSR Try Pro page. Rendered when:
 *  - Dev: visiting http://localhost:3000/sites/<slug>
 *  - Production: hitting https://<slug>.medikah.health (via middleware.ts rewrite)
 *
 * Wiring:
 *  slug → physicians (verified only) → nameToSlug match → physician_id
 *  physician_id → physician_website (enabled flag) → physician_website_themes (theme)
 *
 * Structural flag resolution (PLAN.md objective):
 *  Uses `pages/sites/[slug]/index.tsx` (not `[physicianId]`) because:
 *  - Middleware extracts the slug from the host header (D-02)
 *  - nameToSlug() resolution happens server-side in getServerSideProps
 *  - Edge runtime (middleware) has no Supabase access; slug→id resolver lives here
 *  - Phase 13 Pro custom domains will use Cloudflare Worker for slug→id
 *
 * Security:
 *  - T-12-04-02: only verified physicians (verification_status='verified') are served
 *  - T-12-04-03: explicit SELECT column list excludes email, password, clinical fields
 *  - T-12-04-04: Cache-Control keyed on URL slug — no cross-tenant cache leakage
 *  - WEB-18: physician_website.enabled=false → bilingual maintenance page
 */

import type { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { supabaseAdmin } from '../../../lib/supabaseServer';
import { nameToSlug } from '../../../lib/slug';
import {
  loadThemeForPhysician,
  type PracikahTheme,
} from '../../../lib/practikahTheme';
import ThemedShell from '../../../components/physician/workspace/ThemedShell';
import ClassicLayout from '../../../components/physician/workspace/layouts/ClassicLayout';
import EditorialLayout from '../../../components/physician/workspace/layouts/EditorialLayout';
import MinimalLayout from '../../../components/physician/workspace/layouts/MinimalLayout';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PhysicianRecord {
  id: string;
  full_name: string;
  photo_url?: string | null;
  primary_specialty?: string | null;
  sub_specialties?: string[];
  board_certifications?: { board: string; certification: string; year?: number }[];
  medical_school?: string | null;
  medical_school_country?: string | null;
  graduation_year?: number | null;
  residency?: { institution: string; specialty: string; startYear: number; endYear: number }[];
  fellowships?: { institution: string; specialty: string; startYear: number; endYear: number }[];
  languages?: string[];
  timezone?: string | null;
  available_days?: string[];
  available_hours_start?: string | null;
  available_hours_end?: string | null;
  bio?: string | null;
  publications?: { title: string; journal?: string; year?: number; url?: string }[];
  current_institutions?: string[];
  verification_status: string;
}

interface WebsiteRecord {
  practice_philosophy?: string | null;
  value_pillars?: { title: string; description: string }[];
  services?: { title: string; description: string; icon?: string }[];
  faqs?: { question: string; answer: string }[];
  office_address?: string | null;
  office_city?: string | null;
  office_country?: string | null;
  office_phone?: string | null;
  office_email?: string | null;
  appointment_url?: string | null;
  custom_tagline?: string | null;
  communication_style?: string | null;
  first_consult_expectation?: string | null;
  narrative_status?: string | null;
  approved_bio_en?: string | null;
  approved_bio_es?: string | null;
  approved_tagline_en?: string | null;
  approved_tagline_es?: string | null;
  generated_bio_en?: string | null;
  generated_bio_es?: string | null;
  generated_tagline_en?: string | null;
  generated_tagline_es?: string | null;
  enabled?: boolean;
}

interface SitesPageProps {
  slug: string;
  physician: PhysicianRecord;
  website: WebsiteRecord | null;
  theme: PracikahTheme;
  siteEnabled: boolean;
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function SitesPage({
  slug,
  physician,
  website,
  theme,
  siteEnabled,
}: SitesPageProps) {
  const router = useRouter();
  const isEs = router.locale === 'es';
  const p = physician;
  const w = website;

  // WEB-18 — physician_website.enabled = false → bilingual maintenance card
  if (!siteEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linen text-deep-charcoal font-body p-8">
        <div className="max-w-md text-center">
          <h1 className="font-heading text-3xl uppercase tracking-wider text-inst-blue mb-4">
            {isEs ? 'Sitio en Mantenimiento' : 'Site Under Maintenance'}
          </h1>
          <p className="font-body text-body-slate leading-relaxed">
            {isEs
              ? 'Este sitio está temporalmente desconectado. Por favor, vuelve más tarde.'
              : 'This site is temporarily offline. Please check back later.'}
          </p>
          <a
            href="https://medikah.health"
            className="inline-block mt-8 font-dm-sans text-sm text-body-slate/60 hover:opacity-80 underline transition-opacity"
          >
            medikah.health
          </a>
        </div>
      </div>
    );
  }

  // Build page title + meta description
  const title = `Dr. ${p.full_name}${p.primary_specialty ? ` — ${p.primary_specialty}` : ''}`;
  const description =
    (w?.practice_philosophy?.slice(0, 160)) ||
    (isEs
      ? `Conoce al Dr. ${p.full_name}${p.primary_specialty ? `, especialista en ${p.primary_specialty}` : ''}.`
      : `Meet Dr. ${p.full_name}, ${p.primary_specialty || 'physician'}.`);

  // Layout selection — branched on theme.layout_variant
  const Layout =
    theme.layout_variant === 'editorial'
      ? EditorialLayout
      : theme.layout_variant === 'minimal'
        ? MinimalLayout
        : ClassicLayout;

  return (
    <ThemedShell theme={theme} title={title} description={description} slug={slug}>
      <Layout
        physician={p}
        website={w}
        theme={theme}
        isEs={isEs}
        slug={slug}
      />
    </ThemedShell>
  );
}

// ---------------------------------------------------------------------------
// getServerSideProps — slug → physician → website → theme → render
// ---------------------------------------------------------------------------

export const getServerSideProps: GetServerSideProps<SitesPageProps> = async ({
  params,
  res,
}) => {
  const slug = String(params?.slug || '').toLowerCase();

  // Slug validation (redundant with middleware regex, but defense-in-depth)
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return { notFound: true };
  }

  // Database unavailable (missing env vars in dev)
  if (!supabaseAdmin) {
    return { notFound: true };
  }

  try {
    // ── Step 1: Slug → physician_id resolution ─────────────────────────────
    //
    // T-12-04-02: only verified physicians. nameToSlug(full_name) === slug.
    //
    // T-12-04-03: explicit SELECT column list excludes `email`, `password`,
    // `auth_user_id`, `sep_diploma_status`, `npi`, `license_country`,
    // `credentials_country`, and any clinical/PHI fields.
    //
    // Scale note: for > 1000 physicians, replace with a denormalized slug column
    // lookup. Out of scope for Phase 12 — deferred to Phase 14 scaling work.
    const { data: physicians, error: physError } = await supabaseAdmin
      .from('physicians')
      .select(
        'id, full_name, photo_url, primary_specialty, sub_specialties, board_certifications, ' +
        'medical_school, medical_school_country, graduation_year, residency, fellowships, ' +
        'publications, current_institutions, available_days, available_hours_start, ' +
        'available_hours_end, timezone, languages, bio, verification_status'
      )
      .eq('verification_status', 'verified');

    if (physError || !physicians) {
      res.statusCode = 500;
      return { notFound: true };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const physiciansList = physicians as any[];
    const physician = physiciansList.find(
      (p: { full_name: string }) => nameToSlug(p.full_name) === slug
    );

    if (!physician) {
      return { notFound: true };
    }

    // ── Step 2: physician_website row ─────────────────────────────────────
    const { data: websiteData } = await supabaseAdmin
      .from('physician_website')
      .select('*')
      .eq('physician_id', physician.id)
      .maybeSingle();

    // ── Step 3: WEB-18 enforcement ────────────────────────────────────────
    // physician_website.enabled = false → maintenance page
    // physician_website row missing → default enabled (Try Pro site is publicly
    // accessible as soon as the physician claims it via D-19)
    const siteEnabled = websiteData?.enabled !== false;

    // ── Step 4: Load theme (DEFAULT_THEME if no row) ──────────────────────
    const theme = await loadThemeForPhysician(physician.id);

    // ── Step 5: Cache-Control (WEB-08 TTFB target) ───────────────────────
    //
    // T-12-04-04: cache key includes the URL slug (different slugs = different
    // Netlify edge cache entries). No cross-tenant data leakage.
    //
    // s-maxage=60: Netlify CDN caches SSR response for 60 seconds.
    // stale-while-revalidate=300: CDN serves stale while fetching fresh (5 min).
    // This keeps TTFB < 1.5s on warm cache (WEB-08).
    res.setHeader(
      'Cache-Control',
      'public, s-maxage=60, stale-while-revalidate=300'
    );

    return {
      props: {
        slug,
        physician: {
          id: physician.id,
          full_name: physician.full_name,
          photo_url: physician.photo_url || null,
          primary_specialty: physician.primary_specialty || null,
          sub_specialties: physician.sub_specialties || [],
          board_certifications: physician.board_certifications || [],
          medical_school: physician.medical_school || null,
          medical_school_country: physician.medical_school_country || null,
          graduation_year: physician.graduation_year || null,
          residency: physician.residency || [],
          fellowships: physician.fellowships || [],
          publications: physician.publications || [],
          current_institutions: physician.current_institutions || [],
          available_days: physician.available_days || [],
          available_hours_start: physician.available_hours_start || null,
          available_hours_end: physician.available_hours_end || null,
          timezone: physician.timezone || null,
          languages: physician.languages || [],
          bio: physician.bio || null,
          verification_status: physician.verification_status,
        },
        website: websiteData
          ? {
              practice_philosophy: websiteData.practice_philosophy || null,
              value_pillars: websiteData.value_pillars || [],
              services: websiteData.services || [],
              faqs: websiteData.faqs || [],
              office_address: websiteData.office_address || null,
              office_city: websiteData.office_city || null,
              office_country: websiteData.office_country || null,
              office_phone: websiteData.office_phone || null,
              office_email: websiteData.office_email || null,
              appointment_url: websiteData.appointment_url || null,
              custom_tagline: websiteData.custom_tagline || null,
              communication_style: websiteData.communication_style || null,
              first_consult_expectation: websiteData.first_consult_expectation || null,
              narrative_status: websiteData.narrative_status || null,
              approved_bio_en: websiteData.approved_bio_en || null,
              approved_bio_es: websiteData.approved_bio_es || null,
              approved_tagline_en: websiteData.approved_tagline_en || null,
              approved_tagline_es: websiteData.approved_tagline_es || null,
              generated_bio_en: websiteData.generated_bio_en || null,
              generated_bio_es: websiteData.generated_bio_es || null,
              generated_tagline_en: websiteData.generated_tagline_en || null,
              generated_tagline_es: websiteData.generated_tagline_es || null,
              enabled: websiteData.enabled,
            }
          : null,
        theme,
        siteEnabled,
      },
    };
  } catch {
    return { notFound: true };
  }
};
