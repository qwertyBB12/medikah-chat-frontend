import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

const LINKS = [
  { label: { en: 'Patients', es: 'Pacientes' }, href: '#patients' },
  { label: { en: 'Physicians', es: 'Médicos' }, href: '#physicians' },
  { label: { en: 'About', es: 'Acerca' }, href: '#about' },
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
          className={`font-body text-[1.375rem] font-normal tracking-[0.02em] lowercase transition-colors duration-400 ${
            scrolled ? 'text-deep-charcoal' : 'text-white'
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
              className={`font-body text-xs font-medium uppercase tracking-[0.12em] transition-colors duration-400 ${
                scrolled
                  ? 'text-text-muted hover:text-deep-charcoal'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {link.label[locale]}
            </Link>
          ))}
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
        </div>
      )}
    </nav>
  );
}
