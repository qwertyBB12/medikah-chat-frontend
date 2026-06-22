/**
 * pages/cue/aviso-privacidad.tsx
 *
 * Cue-scoped aviso de privacidad — bilingual (ES / EN) — CUE-13
 *
 * Route: /cue/aviso-privacidad
 *
 * This page renders the cueAvisoContent module keyed by router.locale.
 * It is a standalone informational surface; it does NOT collect user input.
 *
 * DRAFT STATUS: The content rendered here is a structured draft pending
 * review by Hector H. Lopez and Mexico-qualified legal counsel.
 * See lib/cueAvisoContent.ts file header for full status notice.
 *
 * Design:
 * - Mulish (font-body) for all body text, labels, UI chrome
 * - Oswald (font-heading) for the primary headline (ALL CAPS per CLAUDE.md)
 * - inst-blue / clinical-teal / linen brand palette
 * - Rounded scale per tailwind.config.js
 * - Mirrors the layout chrome of pages/privacy.tsx (nav + prose + footer)
 *   WITHOUT modifying that frozen file
 *
 * Frozen legal files NOT touched:
 *   pages/privacy.tsx, pages/terms.tsx,
 *   lib/consentContent.ts, lib/physicianConsentContent.ts
 */

import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';

import { LOGO_DARK_SRC } from '../../lib/assets';
import { cueAvisoContent, CueAvisoSection } from '../../lib/cueAvisoContent';
import { SupportedLang } from '../../lib/i18n';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toLocale(raw: string | undefined): SupportedLang {
  if (raw === 'es') return 'es';
  return 'en';
}

// Renders a single aviso section's body text.
// Newlines in the content strings become <br /> pairs for readable spacing.
function SectionBody({ text }: { text: string }) {
  const paragraphs = text.split('\n\n');
  return (
    <div className="space-y-3">
      {paragraphs.map((para, i) => {
        // Lines within a paragraph that start with • are bullet lines
        const lines = para.split('\n');
        const isBulletBlock = lines.some((l) => l.trimStart().startsWith('•'));

        if (isBulletBlock) {
          return (
            <div key={i}>
              {lines.map((line, j) => {
                const trimmed = line.trimStart();
                if (trimmed.startsWith('•')) {
                  return (
                    <p
                      key={j}
                      className="text-body-slate text-[15px] leading-relaxed pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-clinical-teal"
                    >
                      &nbsp;&nbsp;{trimmed.slice(1).trim()}
                    </p>
                  );
                }
                if (trimmed.length === 0) return null;
                return (
                  <p key={j} className="text-body-slate text-[15px] leading-relaxed">
                    {trimmed}
                  </p>
                );
              })}
            </div>
          );
        }

        return (
          <p key={i} className="text-body-slate text-[15px] leading-relaxed whitespace-pre-line">
            {para}
          </p>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function CueAvisoPrivacidad() {
  const router = useRouter();
  const locale = toLocale(router.locale);
  const content = cueAvisoContent[locale];

  const langToggle = locale === 'es' ? 'English' : 'Español';
  const langTogglePath = `/cue/aviso-privacidad`;
  const langToggleLocale = locale === 'es' ? 'en' : 'es';

  return (
    <>
      <Head>
        <title>{content.htmlTitle}</title>
        <meta
          name="description"
          content={
            locale === 'es'
              ? 'Aviso de privacidad de Cue bajo la LFPDPPP y NOM-024-SSA3 — Práctikah / Medikah.'
              : 'Cue privacy notice under LFPDPPP and NOM-024-SSA3 — Práctikah / Medikah.'
          }
        />
        <meta name="robots" content="noindex, nofollow" />
        <link
          rel="canonical"
          href={`https://medikah.health/cue/aviso-privacidad`}
        />
        <link
          rel="alternate"
          hrefLang="es"
          href="https://medikah.health/cue/aviso-privacidad"
        />
        <link
          rel="alternate"
          hrefLang="en"
          href="https://medikah.health/cue/aviso-privacidad"
        />
      </Head>

      {/* ------------------------------------------------------------------ */}
      {/* Navigation                                                           */}
      {/* ------------------------------------------------------------------ */}
      <nav className="sticky top-0 bg-white/95 backdrop-blur-[12px] backdrop-saturate-[180%] border-b border-border-line/30 shadow-[0_1px_3px_rgba(27,42,65,0.04)] z-[1000] h-20">
        <div className="max-w-[1400px] mx-auto px-6 h-full flex items-center justify-between">
          {/* Wordmark */}
          <Link href="/" className="flex items-center gap-2">
            <Image
              src={LOGO_DARK_SRC}
              alt=""
              width={320}
              height={320}
              priority
              className="w-7 h-auto opacity-70"
            />
            <span className="font-body text-[1.125rem] font-medium tracking-[0.04em] lowercase text-inst-blue">
              medikah
            </span>
          </Link>

          {/* Right cluster */}
          <div className="flex items-center gap-6">
            {/* Language toggle */}
            <button
              onClick={() =>
                router.push(langTogglePath, undefined, { locale: langToggleLocale })
              }
              className="font-body text-[13px] font-medium text-archival-grey hover:text-clinical-teal transition-colors border border-border-line/50 rounded-sm px-3 py-1.5"
            >
              {langToggle}
            </button>

            <Link
              href="/"
              className="font-body font-bold text-[15px] tracking-[0.02em] text-deep-charcoal hover:text-clinical-teal transition-colors"
            >
              &larr; {locale === 'es' ? 'Inicio' : 'Home'}
            </Link>
          </div>
        </div>
      </nav>

      {/* ------------------------------------------------------------------ */}
      {/* Draft banner                                                         */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-caution-amber/10 border-b border-caution-amber/30 px-6 py-3">
        <div className="max-w-[720px] mx-auto">
          <p className="font-body text-[13px] font-semibold text-caution-amber leading-snug">
            {content.draftBanner}
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Main content                                                         */}
      {/* ------------------------------------------------------------------ */}
      <main className="bg-white min-h-screen">
        <div className="max-w-[720px] mx-auto px-6 py-16 sm:py-24">

          {/* Page headline — Oswald, ALL CAPS per typography override */}
          <h1 className="font-heading font-semibold text-4xl md:text-[48px] uppercase text-inst-blue leading-[0.95] tracking-[-0.02em] mb-4">
            {content.headline}
          </h1>

          {/* Subtitle label */}
          <p className="font-body text-base font-medium text-clinical-teal tracking-[0.04em] uppercase mb-6">
            {locale === 'es'
              ? 'Cue — Asistente de IA para Médicos'
              : 'Cue — AI Assistant for Physicians'}
          </p>

          {/* Responsable block */}
          <div className="bg-linen rounded-md p-5 mb-4">
            <p className="font-body text-[14px] font-semibold text-inst-blue mb-1">
              {locale === 'es' ? 'Responsable del tratamiento' : 'Data Controller'}
            </p>
            <p className="font-body text-[14px] text-body-slate whitespace-pre-line leading-relaxed">
              {content.responsableBlock}
            </p>
          </div>

          {/* Date / version note */}
          <p className="font-body text-[13px] text-archival-grey mb-12">
            {content.dateNote}
          </p>

          {/* Divider */}
          <hr className="border-border-line/30 mb-12" />

          {/* Sections */}
          <div className="space-y-10">
            {content.sections.map((section: CueAvisoSection) => (
              <section key={section.id} id={section.id}>
                <h2 className="font-body font-bold text-[18px] text-inst-blue mb-3 leading-snug">
                  {section.heading}
                </h2>
                <SectionBody text={section.body} />
              </section>
            ))}
          </div>

          {/* Divider */}
          <hr className="border-border-line/30 mt-12 mb-8" />

          {/* Footer note (not-a-BAA statement) */}
          <div className="bg-inst-blue/5 border border-inst-blue/15 rounded-md p-5">
            <p className="font-body text-[13px] text-body-slate leading-relaxed italic">
              {content.footerNote}
            </p>
          </div>

          {/* Legal links */}
          <div className="mt-10 flex flex-wrap gap-4 text-[13px]">
            <Link
              href="/privacy"
              className="font-body text-archival-grey hover:text-clinical-teal transition-colors underline underline-offset-2"
            >
              {locale === 'es' ? 'Política de Privacidad General' : 'General Privacy Policy'}
            </Link>
            <Link
              href="/terms"
              className="font-body text-archival-grey hover:text-clinical-teal transition-colors underline underline-offset-2"
            >
              {locale === 'es' ? 'Términos de Servicio' : 'Terms of Service'}
            </Link>
          </div>
        </div>
      </main>

      {/* ------------------------------------------------------------------ */}
      {/* Footer                                                               */}
      {/* ------------------------------------------------------------------ */}
      <footer className="bg-inst-blue px-6 pt-14 pb-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="font-body font-semibold text-[15px] text-white leading-relaxed mb-4">
              Medikah Corporation &middot;{' '}
              {locale === 'es'
                ? 'Incorporada en Delaware, EE. UU.'
                : 'Incorporated in Delaware, USA'}
            </p>
            <p className="font-body text-sm">
              <a
                href="mailto:privacy@medikah.health"
                className="text-clinical-teal hover:text-white transition-colors"
              >
                privacy@medikah.health
              </a>
            </p>
          </div>
          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="font-body text-[13px] text-white/60">
              &copy; 2026 Medikah Corporation.{' '}
              {locale === 'es' ? 'Todos los derechos reservados.' : 'All rights reserved.'}
            </p>
            <div className="font-body text-[13px]">
              <Link href="/privacy" className="text-white/60 hover:text-white transition-colors">
                {locale === 'es' ? 'Privacidad' : 'Privacy'}
              </Link>
              <span className="text-white/30 mx-2">|</span>
              <Link href="/terms" className="text-white/60 hover:text-white transition-colors">
                {locale === 'es' ? 'Términos' : 'Terms'}
              </Link>
              <span className="text-white/30 mx-2">|</span>
              <span className="text-white/80">
                {locale === 'es' ? 'Aviso Cue' : 'Cue Notice'}
              </span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
