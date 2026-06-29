import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import type { GetServerSideProps } from 'next';

import { LOGO_DARK_SRC } from '../lib/assets';
import LanguageToggle from '../components/LanguageToggle';
import LegalDocument from '../components/legal/LegalDocument';
import { TERMS_CONTENT, type TermsRegion, type TermsLocale } from '../lib/legal/termsContent';
import { detectRegion, type Region } from '../lib/legal/region';

const LOGO_DARK = LOGO_DARK_SRC;

type Props = { region: Region; locale: TermsLocale };

const COPY = {
  en: {
    title: 'Terms of Service — Medikah',
    back: '← Back to Home',
    appliesTo: 'These Terms apply to users in',
    region: { US: 'the United States', MX: 'Mexico' },
    elsewhere: 'Located elsewhere?',
    viewOther: (other: string) => `View the ${other} Terms`,
    otherName: { US: 'United States', MX: 'Mexico' },
  },
  es: {
    title: 'Términos y Condiciones — Medikah',
    back: '← Volver al Inicio',
    appliesTo: 'Estos Términos aplican a usuarios en',
    region: { US: 'Estados Unidos', MX: 'México' },
    elsewhere: '¿Se encuentra en otra ubicación?',
    viewOther: (other: string) => `Ver los Términos de ${other}`,
    otherName: { US: 'Estados Unidos', MX: 'México' },
  },
} as const;

export default function TermsOfService({ region, locale }: Props) {
  const t = COPY[locale];
  const blocks = TERMS_CONTENT[region as TermsRegion][locale];
  const other: Region = region === 'US' ? 'MX' : 'US';

  return (
    <>
      <Head>
        <title>{t.title}</title>
        <meta name="description" content="Medikah Terms of Service. HIPAA-compliant healthcare coordination platform." />
        <link rel="canonical" href="https://medikah.health/terms" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://medikah.health/terms" />
        <meta property="og:title" content={t.title} />
        <meta property="og:description" content="Medikah Terms of Service. HIPAA-compliant healthcare coordination platform." />
        <meta property="og:image" content="https://medikah.health/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={t.title} />
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
          <div className="flex items-center gap-4">
            <LanguageToggle tone="light" />
            <Link
              href="/"
              className="font-bold text-[15px] tracking-[0.02em] text-deep-charcoal hover:text-clinical-teal transition-colors"
            >
              {t.back}
            </Link>
          </div>
        </div>
      </nav>

      <main className="bg-white min-h-screen">
        <div className="max-w-[720px] mx-auto px-6 py-12 sm:py-20">

          {/* Region banner — which jurisdiction's terms are shown + a self-select escape hatch */}
          <div className="mb-10 rounded-md border border-clinical-teal/25 bg-clinical-teal/[0.04] px-4 py-3 text-[13px] text-body-slate flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>
              {t.appliesTo} <strong className="text-inst-blue">{t.region[region]}</strong>.
            </span>
            <span className="text-archival-grey">
              {t.elsewhere}{' '}
              <Link href={`/terms?region=${other.toLowerCase()}`} className="text-clinical-teal hover:underline font-medium">
                {t.viewOther(t.otherName[other])}
              </Link>
            </span>
          </div>

          <LegalDocument blocks={blocks} />

        </div>
      </main>

      <footer className="bg-inst-blue px-6 pt-14 pb-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="font-semibold text-[15px] text-white leading-relaxed mb-4">
              Medikah Corporation · Incorporated in Delaware, USA
            </p>
            <p className="text-sm">
              <a href="mailto:partnerships@medikah.health" className="text-clinical-teal hover:text-white transition-colors">
                partnerships@medikah.health
              </a>
            </p>
          </div>
          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[13px] text-white/60">© 2026 Medikah Corporation. All rights reserved.</p>
            <div className="text-[13px]">
              <Link href="/privacy" className="text-white/60 hover:text-white transition-colors">Privacy Policy</Link>
              <span className="text-white/30 mx-2">|</span>
              <span className="text-white/80">Terms of Service</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const region = detectRegion(ctx);
  const locale: TermsLocale = ctx.locale === 'es' ? 'es' : 'en';
  return { props: { region, locale } };
};
