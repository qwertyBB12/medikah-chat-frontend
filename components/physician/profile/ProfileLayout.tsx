import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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

      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/95 backdrop-blur-md shadow-sm'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-5xl mx-auto px-6 md:px-8 py-4 flex items-center justify-between">
          <Link
            href="/"
            className={`font-heading font-bold text-xl tracking-tight transition-colors duration-300 ${
              scrolled ? 'text-inst-blue' : 'text-white'
            }`}
          >
            Medikah
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link
              href="/"
              className={`transition-colors duration-300 ${
                scrolled
                  ? 'text-body-slate hover:text-clinical-teal'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              {isEs ? 'Inicio' : 'Home'}
            </Link>
            <Link
              href="/physicians"
              className={`transition-colors duration-300 ${
                scrolled
                  ? 'text-body-slate hover:text-clinical-teal'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              {isEs ? 'Para Médicos' : 'For Physicians'}
            </Link>
            <button
              onClick={() => router.push('/chat')}
              className={`hidden sm:inline-flex px-4 py-2 text-sm font-semibold rounded-sm transition-all duration-300 ${
                scrolled
                  ? 'bg-inst-blue text-white hover:bg-clinical-teal opacity-100 translate-y-0'
                  : 'bg-white/10 text-white/0 border border-white/0 opacity-0 -translate-y-1 pointer-events-none'
              }`}
            >
              {isEs ? 'Agendar Consulta' : 'Schedule Consultation'}
            </button>
          </nav>
        </div>
      </header>

      <main>{children}</main>

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

        <div className="relative max-w-5xl mx-auto px-6 md:px-8 py-12">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <span className="font-heading text-lg font-medium text-white lowercase tracking-[0.04em]">
                medikah
              </span>
              <p className="text-white/40 text-sm mt-2 max-w-[320px] leading-relaxed">
                {isEs
                  ? 'Cuidado humano sin distancia.'
                  : 'Human care without distance.'}
              </p>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <Link href="/privacy" className="text-white/50 hover:text-white transition-colors duration-200">
                {isEs ? 'Privacidad' : 'Privacy'}
              </Link>
              <Link href="/terms" className="text-white/50 hover:text-white transition-colors duration-200">
                {isEs ? 'Términos' : 'Terms'}
              </Link>
            </div>
          </div>

          <div className="border-t border-white/[0.06] mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-white/30 text-xs">
              &copy; {new Date().getFullYear()} Medikah Corporation. {isEs ? 'Todos los derechos reservados.' : 'All rights reserved.'}
            </p>
            <div className="flex gap-4 flex-wrap justify-center">
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
