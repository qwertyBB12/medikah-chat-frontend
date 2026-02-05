import Head from 'next/head';
import Link from 'next/link';
import Nav from '../components/landing/Nav';
import HeroVariantA from '../components/landing/HeroVariantA';
import ValuesVariantA from '../components/landing/ValuesVariantA';
import Governance from '../components/landing/Governance';
import ClosingStatementVariantA from '../components/landing/ClosingStatementVariantA';
import LandingFooter from '../components/landing/LandingFooter';
import FadeInSection from '../components/landing/FadeInSection';

/**
 * Design Preview Page
 *
 * Compare Variant A (Fraunces serif headlines) against the current design.
 * Visit /design-preview to see this variant.
 *
 * Key differences from current:
 * - Fraunces serif for headlines (font-display)
 * - Left-aligned hero with staggered indentation
 * - 120px headline at desktop (vs 96px current)
 * - Tighter line-height (0.92 vs 1.05)
 * - More generous vertical whitespace
 * - Staggered card layouts for visual rhythm
 * - Subtle decorative vertical line accent
 */
export default function DesignPreview() {
  return (
    <>
      <Head>
        <title>Design Preview — Variant A: Fraunces Serif</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      {/* Preview banner */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-caution-amber text-white text-center py-2 text-sm font-semibold">
        DESIGN PREVIEW — Variant A: Fraunces Serif Headlines
        <Link href="/" className="ml-4 underline hover:no-underline">
          ← Current
        </Link>
        <Link href="/design-preview-b" className="ml-3 underline hover:no-underline">
          B
        </Link>
        <Link href="/design-preview-c" className="ml-3 underline hover:no-underline">
          C
        </Link>
        <Link href="/design-preview-d" className="ml-3 underline hover:no-underline font-bold">
          D★
        </Link>
      </div>

      <Nav />

      <main id="main-content" className="font-body pt-28 landing-sections">
        <HeroVariantA />
        <FadeInSection><ValuesVariantA /></FadeInSection>
        <FadeInSection><Governance /></FadeInSection>
        <FadeInSection><ClosingStatementVariantA /></FadeInSection>
        <LandingFooter />
      </main>
    </>
  );
}
