import Head from 'next/head';
import Link from 'next/link';
import Nav from '../components/landing/Nav';
import HeroVariantB from '../components/landing/HeroVariantB';
import ValuesVariantB from '../components/landing/ValuesVariantB';
import Governance from '../components/landing/Governance';
import ClosingStatementVariantB from '../components/landing/ClosingStatementVariantB';
import LandingFooter from '../components/landing/LandingFooter';
import FadeInSection from '../components/landing/FadeInSection';

/**
 * Design Preview Page - Variant B
 *
 * Instrument Serif + Inter
 * - Contemporary precision
 * - Editorial elegance
 * - Minimal, refined aesthetic
 *
 * Key differences from Variant A:
 * - Instrument Serif is single-weight (400) - relies on size/italic for hierarchy
 * - Inter body copy is more geometric and contemporary than Mulish
 * - Centered layout vs left-aligned
 * - Horizontal divider layout for Values instead of cards
 */
export default function DesignPreviewB() {
  return (
    <>
      <Head>
        <title>Design Preview — Variant B: Instrument Serif + Inter</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      {/* Preview banner */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-clinical-teal text-white text-center py-2 text-sm font-semibold">
        DESIGN PREVIEW — Variant B: Instrument Serif + Inter
        <Link href="/" className="ml-4 underline hover:no-underline">
          ← Current
        </Link>
        <Link href="/design-preview" className="ml-3 underline hover:no-underline">
          A
        </Link>
        <Link href="/design-preview-c" className="ml-3 underline hover:no-underline">
          C
        </Link>
        <Link href="/design-preview-d" className="ml-3 underline hover:no-underline font-bold">
          D★
        </Link>
      </div>

      <Nav />

      <main id="main-content" className="pt-28 landing-sections">
        <HeroVariantB />
        <FadeInSection><ValuesVariantB /></FadeInSection>
        <FadeInSection><Governance /></FadeInSection>
        <FadeInSection><ClosingStatementVariantB /></FadeInSection>
        <LandingFooter />
      </main>
    </>
  );
}
