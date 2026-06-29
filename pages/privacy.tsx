import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';

import { LOGO_DARK_SRC } from '../lib/assets';
import LegalDocument from '../components/legal/LegalDocument';
import { PRIVACY_NOTICE } from '../lib/legal/privacyContent';

const LOGO_DARK = LOGO_DARK_SRC;

/**
 * Privacy Notice / Aviso de Privacidad Integral.
 *
 * Counsel (Luis Ignacio) authored ONE jurisdiction-complete bilingual document:
 * Common Body + Annex A (Mexico / LFPDPPP) + Annex B (United States / HIPAA +
 * CCPA/CPRA), with a conflict clause ("the Annex governs for the applicable
 * jurisdiction"). It is served as-is to everyone — NO geolocation split.
 */
export default function PrivacyNotice() {
  const { locale } = useRouter();
  const es = locale === 'es';
  const title = es ? 'Aviso de Privacidad — Medikah' : 'Privacy Notice — Medikah';
  const back = es ? '← Volver al Inicio' : '← Back to Home';

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content="Medikah Privacy Notice / Aviso de Privacidad. HIPAA-compliant healthcare coordination platform." />
        <link rel="canonical" href="https://medikah.health/privacy" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://medikah.health/privacy" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content="Medikah Privacy Notice / Aviso de Privacidad. HIPAA-compliant healthcare coordination platform." />
        <meta property="og:image" content="https://medikah.health/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:image" content="https://medikah.health/og-image.png" />
      </Head>

      <nav className="sticky top-0 bg-white/95 backdrop-blur-[12px] backdrop-saturate-[180%] border-b border-border-line/30 shadow-[0_1px_3px_rgba(27,42,65,0.04)] z-[1000] h-20">
        <div className="max-w-[1400px] mx-auto px-6 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src={LOGO_DARK} alt="" width={320} height={320} priority className="w-7 h-auto opacity-70" />
            <span className="font-body text-[1.125rem] font-medium tracking-[0.04em] lowercase text-inst-blue">
              medikah
            </span>
          </Link>
          <Link
            href="/"
            className="font-bold text-[15px] tracking-[0.02em] text-deep-charcoal hover:text-clinical-teal transition-colors"
          >
            {back}
          </Link>
        </div>
      </nav>

      <main className="bg-white min-h-screen">
        <div className="max-w-[720px] mx-auto px-6 py-12 sm:py-20">
          <LegalDocument blocks={PRIVACY_NOTICE} />
        </div>
      </main>

      <footer className="bg-inst-blue px-6 pt-14 pb-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="font-semibold text-[15px] text-white leading-relaxed mb-4">
              Medikah Corporation · Incorporated in Delaware, USA
            </p>
            <p className="text-sm">
              <a href="mailto:privacy@medikah.health" className="text-clinical-teal hover:text-white transition-colors">
                privacy@medikah.health
              </a>
            </p>
          </div>
          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[13px] text-white/60">© 2026 Medikah Corporation. All rights reserved.</p>
            <div className="text-[13px]">
              <span className="text-white/80">Privacy Notice</span>
              <span className="text-white/30 mx-2">|</span>
              <Link href="/terms" className="text-white/60 hover:text-white transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
