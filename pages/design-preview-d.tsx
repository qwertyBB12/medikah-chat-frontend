import Head from 'next/head';
import Link from 'next/link';
import Nav from '../components/landing/Nav';
import HeroVariantD from '../components/landing/HeroVariantD';
import ValuesVariantD from '../components/landing/ValuesVariantD';
import Governance from '../components/landing/Governance';
import ClosingStatementVariantD from '../components/landing/ClosingStatementVariantD';
import LandingFooter from '../components/landing/LandingFooter';
import FadeInSection from '../components/landing/FadeInSection';

/**
 * Design Preview Page - Variant D (RECOMMENDED)
 *
 * DM Serif Display + DM Sans
 * - Modern institution with confidence
 * - Bold serif headlines with geometric sans body
 * - Designed as a cohesive pair
 * - The sweet spot between traditional and contemporary
 */
export default function DesignPreviewD() {
  return (
    <>
      <Head>
        <title>Design Preview — Variant D: DM Serif Display + DM Sans (Recommended)</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      {/* Preview banner - green for recommended */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-confirm-green text-white text-center py-2 text-sm font-semibold">
        DESIGN PREVIEW — Variant D: DM Serif + DM Sans (Recommended)
        <Link href="/" className="ml-4 underline hover:no-underline">
          ← Current
        </Link>
        <Link href="/design-preview" className="ml-3 underline hover:no-underline">
          A
        </Link>
        <Link href="/design-preview-b" className="ml-3 underline hover:no-underline">
          B
        </Link>
        <Link href="/design-preview-c" className="ml-3 underline hover:no-underline">
          C
        </Link>
      </div>

      <Nav />

      <main id="main-content" className="pt-28 landing-sections">
        <HeroVariantD />
        <FadeInSection><ValuesVariantD /></FadeInSection>
        <FadeInSection><Governance /></FadeInSection>
        <FadeInSection><ClosingStatementVariantD /></FadeInSection>
        <LandingFooter />
      </main>
    </>
  );
}
