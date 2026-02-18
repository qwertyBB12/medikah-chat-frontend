import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

const LINKS = [
  { label: { en: 'Patients', es: 'Pacientes' }, href: '#patients' },
  { label: { en: 'Physicians', es: 'M\u00e9dicos' }, href: '#physicians' },
  { label: { en: 'About', es: 'Acerca' }, href: '#about' },
  { label: { en: 'Contact', es: 'Contacto' }, href: 'mailto:partnerships@medikah.health' },
  { label: { en: 'Get Started', es: 'Comenzar' }, href: '/chat' },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const locale = (router.locale || 'en') as 'en' | 'es';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function switchLocale(newLocale: 'en' | 'es') {
    router.push(router.pathname, router.asPath, { locale: newLocale });
  }

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-[100] h-20 transition-all duration-400 ${
        scrolled
          ? 'bg-linen/[0.92] backdrop-blur-[16px]'
          : 'bg-transparent'
      }`}
      style={{ WebkitBackdropFilter: scrolled ? 'blur(16px)' : 'none' }}
    >
      <div className="max-w-[1600px] mx-auto px-[clamp(1.5rem,4vw,4rem)] h-full flex items-center justify-between">
        {/* Logo — text wordmark */}
        <Link
          href="/"
          className={`font-body text-[1.25rem] font-medium tracking-[0.04em] lowercase transition-colors duration-400 ${
            scrolled ? 'text-inst-blue' : 'text-white'
          }`}
        >
          medikah
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-[clamp(1.5rem,3vw,3rem)]">
          {LINKS.map((link) => (
            <Link
              key={link.label.en}
              href={link.href}
              className={`font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] transition-colors duration-400 ${
                scrolled
                  ? 'text-text-muted hover:text-deep-charcoal'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {link.label[locale]}
            </Link>
          ))}

          {/* Language toggle */}
          <div className={`flex rounded-sm overflow-hidden border transition-colors duration-400 ${
            scrolled ? 'border-warm-gray-800/15' : 'border-white/15'
          }`}>
            <button
              onClick={() => switchLocale('en')}
              className={`font-body text-[0.6875rem] font-medium tracking-[0.06em] px-2.5 py-1 transition-all duration-200 border-none cursor-pointer ${
                locale === 'en'
                  ? 'bg-teal-500 text-white'
                  : scrolled
                    ? 'bg-transparent text-text-muted hover:text-deep-charcoal'
                    : 'bg-transparent text-white/50 hover:text-white/80'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => switchLocale('es')}
              className={`font-body text-[0.6875rem] font-medium tracking-[0.06em] px-2.5 py-1 transition-all duration-200 border-none cursor-pointer ${
                locale === 'es'
                  ? 'bg-teal-500 text-white'
                  : scrolled
                    ? 'bg-transparent text-text-muted hover:text-deep-charcoal'
                    : 'bg-transparent text-white/50 hover:text-white/80'
              }`}
            >
              ES
            </button>
          </div>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          <span className={`block w-6 h-0.5 transition-all duration-200 ${
            scrolled ? 'bg-deep-charcoal' : 'bg-white'
          } ${mobileOpen ? 'rotate-45 translate-y-2' : ''}`} />
          <span className={`block w-6 h-0.5 transition-all duration-200 ${
            scrolled ? 'bg-deep-charcoal' : 'bg-white'
          } ${mobileOpen ? 'opacity-0' : ''}`} />
          <span className={`block w-6 h-0.5 transition-all duration-200 ${
            scrolled ? 'bg-deep-charcoal' : 'bg-white'
          } ${mobileOpen ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-linen border-t border-warm-gray-300/20 shadow-lg px-6 py-6 space-y-4">
          {LINKS.map((link) => (
            <Link
              key={link.label.en}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block font-body text-sm font-medium text-deep-charcoal hover:text-teal-500 transition-colors"
            >
              {link.label[locale]}
            </Link>
          ))}

          {/* Mobile language toggle */}
          <div className="flex rounded-sm overflow-hidden border border-warm-gray-800/15 w-fit mt-2">
            <button
              onClick={() => { switchLocale('en'); setMobileOpen(false); }}
              className={`font-body text-[0.6875rem] font-medium tracking-[0.06em] px-3 py-1.5 transition-all duration-200 border-none cursor-pointer ${
                locale === 'en'
                  ? 'bg-teal-500 text-white'
                  : 'bg-transparent text-text-muted hover:text-deep-charcoal'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => { switchLocale('es'); setMobileOpen(false); }}
              className={`font-body text-[0.6875rem] font-medium tracking-[0.06em] px-3 py-1.5 transition-all duration-200 border-none cursor-pointer ${
                locale === 'es'
                  ? 'bg-teal-500 text-white'
                  : 'bg-transparent text-text-muted hover:text-deep-charcoal'
              }`}
            >
              ES
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
