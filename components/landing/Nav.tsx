import { useState, useEffect } from 'react';
import Image from 'next/image';

const LOGO_DARK = '/logo-BLU.png';

const LINKS = [
  { label: 'About', href: '#about' },
  { label: 'How It Works', href: '#architecture' },
  { label: 'Access', href: '#early-access' },
  { label: 'Contact', href: 'mailto:partnerships@medikah.com' },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-[1000] h-20 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-[16px] backdrop-saturate-[200%] border-b border-border-line/30 shadow-[0_2px_8px_rgba(27,42,65,0.08)]'
          : 'bg-white/90 backdrop-blur-[12px] backdrop-saturate-[180%] border-b border-border-line/30 shadow-[0_1px_3px_rgba(27,42,65,0.04)]'
      }`}
      style={{ WebkitBackdropFilter: scrolled ? 'blur(16px) saturate(200%)' : 'blur(12px) saturate(180%)' }}
    >
      <div className="max-w-[1400px] mx-auto px-6 h-full flex items-center justify-between">
        <Image
          src={LOGO_DARK}
          alt="Medikah"
          width={48}
          height={48}
          priority
          className="h-12 w-auto"
        />
        <div className="hidden sm:flex items-center gap-8">
          {LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="font-bold text-[17px] tracking-[0.02em] text-deep-charcoal hover:text-clinical-teal transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}
