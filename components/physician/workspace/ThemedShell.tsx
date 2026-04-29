/**
 * ThemedShell.tsx
 *
 * De-branded shell for Try Pro sites at <slug>.medikah.health.
 *
 * Design decisions (from CONTEXT.md):
 *  - D-03: Header/footer swap — Medikah header/footer hidden; doctor-branded shell shown.
 *    "Powered by Medikah" attribution lives small in footer (Substack-style).
 *  - D-15: Layout variant determines which Layout component is rendered inside.
 *  - CSS custom properties injected at root div enable accent-color theming without
 *    requiring Tailwind config changes. Layout components use style={{ color: 'var(--accent-color)' }}
 *    wherever accent-color matters (Tailwind `bg-clinical-teal` classes won't auto-follow CSS vars).
 *  - T-12-04-05: favicon_url sanitized via safeFaviconUrl() — rejects javascript: URIs.
 */

import Head from 'next/head';
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { PracikahTheme } from '../../../lib/practikahTheme';
import { adjustHover, safeFaviconUrl } from '../../../lib/practikahTheme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ThemedShellProps {
  children: ReactNode;
  theme: PracikahTheme;
  title: string;
  description: string;
  slug: string;
  /** JSON-LD structured data. 12-06 will populate; default undefined here. */
  jsonLd?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Font weight map
// ---------------------------------------------------------------------------

const FONT_WEIGHT_MAP: Record<PracikahTheme['font_weight'], string> = {
  light: '300',
  regular: '400',
  bold: '700',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ThemedShell({
  children,
  theme,
  title,
  description,
  slug,
  jsonLd,
}: ThemedShellProps) {
  const fontWeightValue = FONT_WEIGHT_MAP[theme.font_weight] ?? '400';
  const accent = theme.accent_color;
  const accentHover = adjustHover(accent);
  // T-12-04-05: reject javascript: URIs and non-https URLs from favicon_url
  const faviconHref = safeFaviconUrl(theme.favicon_url) || '/favicon.ico';

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="profile" />
        <meta property="og:url" content={`https://${slug}.medikah.health`} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <link rel="icon" href={faviconHref} />
        {jsonLd && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
        )}
      </Head>

      {/*
       * Root div injects CSS custom properties so layout components can reference
       * var(--accent-color) and var(--site-font-weight) without touching Tailwind config.
       *
       * All styling inside this div flows from the physician's theme row.
       */}
      <div
        className="min-h-screen bg-linen text-deep-charcoal font-body"
        style={{
          ['--accent-color' as string]: accent,
          ['--accent-color-hover' as string]: accentHover,
          ['--site-font-weight' as string]: fontWeightValue,
        }}
      >
        {/* ── De-branded minimal header (NO Medikah wordmark — D-03) ── */}
        <header className="sticky top-0 z-50 px-6 py-4 border-b border-deep-charcoal/10 bg-white/95 backdrop-blur-sm">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            {/*
             * Try Pro preview badge — physician's name is shown by the hero component
             * inside `children`. The header stays minimal and de-branded per D-03.
             */}
            <span
              className="font-heading text-sm tracking-wider uppercase"
              style={{ color: accent }}
            >
              Try Pro Preview
            </span>

            <nav className="flex items-center gap-6">
              <Link
                href={`#contact`}
                className="font-dm-sans text-sm text-body-slate hover:opacity-80 transition-opacity"
              >
                Contact
              </Link>
              <a
                href={`/dr/${slug}`}
                className="font-dm-sans text-xs text-body-slate/60 hover:opacity-80 transition-opacity"
              >
                Medikah Profile
              </a>
            </nav>
          </div>
        </header>

        {/* ── Page body (layout variant injected here) ── */}
        <main>{children}</main>

        {/*
         * ── Substack-style "Powered by Medikah" footer (D-03) ──
         *
         * Small, non-intrusive attribution. The upgrade CTA ("Make this real at your
         * own domain") ships in 12-07 as a non-interstitial banner in the dashboard
         * Site sub-tab — NOT here.
         */}
        <footer className="mt-16 py-8 bg-deep-charcoal text-white">
          <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="font-body text-sm opacity-70">
              Powered by{' '}
              <a
                href="https://medikah.health"
                className="underline hover:opacity-100 transition-opacity"
                target="_blank"
                rel="noopener noreferrer"
              >
                medikah
              </a>
            </p>
            <p className="font-body text-xs opacity-50">Care Without Distance.</p>
          </div>
        </footer>
      </div>
    </>
  );
}
