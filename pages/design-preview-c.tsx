import Head from 'next/head';
import Link from 'next/link';
import Nav from '../components/landing/Nav';
import HeroVariantC from '../components/landing/HeroVariantC';
import ValuesVariantC from '../components/landing/ValuesVariantC';
import Governance from '../components/landing/Governance';
import ClosingStatementVariantC from '../components/landing/ClosingStatementVariantC';
import LandingFooter from '../components/landing/LandingFooter';
import FadeInSection from '../components/landing/FadeInSection';

/**
 * Design Preview Page - Variant C
 *
 * Playfair Display + Source Sans 3
 * - Editorial gravitas
 * - Classic newspaper/journal aesthetic
 * - Established institution feel
 *
 * This is the most traditional option - think The Economist, WSJ, NYT
 */
export default function DesignPreviewC() {
  return (
    <>
      <Head>
        <title>Design Preview — Variant C: Playfair Display + Source Sans</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      {/* Preview banner */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-inst-blue text-white text-center py-2 text-sm font-semibold">
        DESIGN PREVIEW — Variant C: Playfair Display + Source Sans
        <Link href="/" className="ml-4 underline hover:no-underline">
          ← Current
        </Link>
        <Link href="/design-preview" className="ml-3 underline hover:no-underline">
          A
        </Link>
        <Link href="/design-preview-b" className="ml-3 underline hover:no-underline">
          B
        </Link>
        <Link href="/design-preview-d" className="ml-3 underline hover:no-underline font-bold">
          D★
        </Link>
      </div>

      <Nav />

      <main id="main-content" className="pt-28 landing-sections">
        <HeroVariantC />
        <FadeInSection><ValuesVariantC /></FadeInSection>
        <FadeInSection><Governance /></FadeInSection>
        <FadeInSection><ClosingStatementVariantC /></FadeInSection>
        <LandingFooter />
      </main>
    </>
  );
}
