import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';

interface ProfileLayoutProps {
  children: React.ReactNode;
  title: string;
  description: string;
  jsonLd?: Record<string, unknown>;
}

export default function ProfileLayout({ children, title, description, jsonLd }: ProfileLayoutProps) {
  const router = useRouter();
  const isEs = router.locale === 'es';
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function switchLocale(locale: string) {
    router.push(router.pathname, router.asPath, { locale });
  }

  const navLinks = [
    { label: { en: 'Home', es: 'Inicio' }, href: '/' },
    { label: { en: 'For Physicians', es: 'Para Médicos' }, href: '/physicians' },
  ];

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="profile" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        {jsonLd && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
        )}
      </Head>

      {/* ── Nav ─────────────────────────────────────────── */}
      <header
        className={`fixed top-0 left-0 right-0 z-[100] h-20 transition-all duration-400 ${
          scrolled ? '' : 'bg-transparent'
        }`}
        style={
          scrolled
            ? {
                backgroundColor: 'rgba(240, 234, 224, 0.92)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
              }
            : {}
        }
      >
        <div className="max-w-[1600px] mx-auto px-[clamp(1.5rem,4vw,4rem)] h-full flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Image
              src={scrolled ? '/logo-BLU.png' : '/logo.png'}
              alt="Medikah"
              width={24}
              height={24}
              className="transition-opacity duration-300"
            />
            <span
              className={`font-body text-[1.25rem] font-medium tracking-[0.04em] lowercase transition-colors duration-300 ${
                scrolled ? 'text-inst-blue' : 'text-white'
              }`}
            >
              medikah
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-[clamp(1.5rem,3vw,3rem)]">
            {navLinks.map((link) => (
              <Link
                key={link.label.en}
                href={link.href}
                className={`font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] transition-colors duration-300 ${
                  scrolled
                    ? 'text-text-muted hover:text-deep-charcoal'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {isEs ? link.label.es : link.label.en}
              </Link>
            ))}

            {/* EN / ES toggle */}
            <div
              className={`flex rounded-sm overflow-hidden border transition-colors duration-300 ${
                scrolled ? 'border-warm-gray-800/15' : 'border-white/15'
              }`}
            >
              {['en', 'es'].map((loc) => (
                <button
                  key={loc}
                  onClick={() => switchLocale(loc)}
                  className={`font-body text-[0.6875rem] font-medium tracking-[0.06em] px-2.5 py-1 transition-all duration-200 ${
                    router.locale === loc
                      ? 'bg-teal-500 text-white'
                      : scrolled
                        ? 'bg-transparent text-text-muted hover:text-deep-charcoal'
                        : 'bg-transparent text-white/50 hover:text-white/80'
                  }`}
                >
                  {loc.toUpperCase()}
                </button>
              ))}
            </div>
          </nav>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden flex flex-col gap-1.5 z-[101]"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            <span
              className={`block w-6 h-0.5 transition-all duration-300 origin-center ${
                scrolled ? 'bg-deep-charcoal' : 'bg-white'
              } ${mobileOpen ? 'rotate-45 translate-y-2' : ''}`}
            />
            <span
              className={`block w-6 h-0.5 transition-all duration-300 ${
                scrolled ? 'bg-deep-charcoal' : 'bg-white'
              } ${mobileOpen ? 'opacity-0' : ''}`}
            />
            <span
              className={`block w-6 h-0.5 transition-all duration-300 origin-center ${
                scrolled ? 'bg-deep-charcoal' : 'bg-white'
              } ${mobileOpen ? '-rotate-45 -translate-y-2' : ''}`}
            />
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden absolute top-20 left-0 right-0 bg-linen border-t border-warm-gray-300/20 shadow-lg px-6 py-6 space-y-4">
            {navLinks.map((link) => (
              <Link
                key={link.label.en}
                href={link.href}
                className="block font-body text-sm font-medium text-deep-charcoal hover:text-teal-500 transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {isEs ? link.label.es : link.label.en}
              </Link>
            ))}
            <div className="flex rounded-sm overflow-hidden border border-warm-gray-800/15 w-fit">
              {['en', 'es'].map((loc) => (
                <button
                  key={loc}
                  onClick={() => {
                    switchLocale(loc);
                    setMobileOpen(false);
                  }}
                  className={`font-body text-[0.6875rem] font-medium tracking-[0.06em] px-2.5 py-1 transition-all duration-200 ${
                    router.locale === loc
                      ? 'bg-teal-500 text-white'
                      : 'bg-transparent text-text-muted hover:text-deep-charcoal'
                  }`}
                >
                  {loc.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* ── Main ────────────────────────────────────────── */}
      <main className="font-body bg-linen">{children}</main>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #1B2A41 0%, #0D1520 100%)',
          borderRadius: '32px 32px 0 0',
        }}
      >
        {/* Grain */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.012'/%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative max-w-[1400px] mx-auto px-[clamp(1.5rem,6vw,6rem)] pt-[clamp(3rem,8vh,6rem)] pb-[clamp(2rem,4vh,3rem)]">
          {/* Top row */}
          <div className="flex flex-col sm:flex-row justify-between gap-8 pb-12">
            <div>
              <span className="font-body text-2xl font-medium text-white lowercase tracking-[0.04em]">
                medikah
              </span>
              <p className="text-white/50 text-[0.9375rem] mt-5 max-w-[320px] leading-[1.7]">
                {isEs
                  ? 'Plataforma de coordinación de salud que cumple con HIPAA. Médicos verificados, en su idioma, en sus condiciones.'
                  : 'HIPAA-compliant healthcare coordination platform. Verified physicians, in your language, on your terms.'}
              </p>
              <div className="font-body text-[0.8125rem] font-medium tracking-[0.04em] text-teal-400 mt-8">
                {isEs ? 'Cuidado humano sin distancia.' : 'Human care without distance.'}
              </div>
              {/* Trust badges */}
              <div className="flex gap-3 mt-5 flex-wrap">
                {['HIPAA', isEs ? 'Bilingüe' : 'Bilingual', isEs ? 'Cifrado' : 'Encrypted'].map((badge) => (
                  <span
                    key={badge}
                    className="inline-flex items-center text-[0.6875rem] font-medium uppercase tracking-[0.04em] text-teal-300 bg-[rgba(44,122,140,0.15)] px-3.5 py-[5px] rounded-lg"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </div>

            {/* Legal links */}
            <div>
              <h4 className="text-[0.625rem] font-medium uppercase tracking-[0.2em] text-teal-400 mb-6">
                {isEs ? 'Legal' : 'Legal'}
              </h4>
              <ul className="space-y-3">
                {[
                  { label: { en: 'Privacy Policy', es: 'Política de privacidad' }, href: '/privacy' },
                  { label: { en: 'Terms of Service', es: 'Términos de servicio' }, href: '/terms' },
                  { label: { en: 'HIPAA Notice', es: 'Aviso HIPAA' }, href: '/privacy#hipaa' },
                ].map((link) => (
                  <li key={link.label.en}>
                    <Link
                      href={link.href}
                      className="text-white/50 text-[0.9375rem] hover:text-white transition-colors duration-200"
                    >
                      {isEs ? link.label.es : link.label.en}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-white/[0.06] pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-cream-500 text-xs">
              &copy; {new Date().getFullYear()} Medikah Corporation.{' '}
              {isEs ? 'Todos los derechos reservados.' : 'All rights reserved.'}
            </p>
            <div className="flex gap-[clamp(1rem,2vw,2rem)] flex-wrap justify-center">
              {[
                { label: 'BeNeXT Global', href: 'https://benext.global' },
                { label: 'Futuro', href: 'https://futuro.ngo' },
                { label: 'NeXT', href: 'https://next.ngo' },
                { label: 'Héctor H. López', href: 'https://hectorhlopez.com' },
                { label: 'Medikah', href: '/', current: true },
              ].map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className={`font-heading text-[0.625rem] font-medium uppercase tracking-[0.1em] transition-colors duration-200 ${
                    link.current
                      ? 'text-teal-400'
                      : 'text-white/30 hover:text-white'
                  }`}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
