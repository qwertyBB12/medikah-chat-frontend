/**
 * LanguageToggle — visible EN ↔ ES switch (Aguirre UX audit U9).
 *
 * The physician dashboard previously derived its language solely from the
 * browser locale, so a Spanish-speaking doctor had no in-app way to switch.
 * This control flips Next's `router.locale` (which persists via the NEXT_LOCALE
 * cookie), so the choice carries across every portal surface — dashboard,
 * workspace, profile editor — without changing browser settings.
 *
 * Tone is light by default (navy sidebar / header backgrounds).
 */
import { useRouter } from 'next/router';

interface LanguageToggleProps {
  className?: string;
}

const LANGS: { code: 'en' | 'es'; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
];

export default function LanguageToggle({ className = '' }: LanguageToggleProps) {
  const router = useRouter();
  const current: 'en' | 'es' = router.locale?.toLowerCase().startsWith('es') ? 'es' : 'en';

  const switchTo = (code: 'en' | 'es') => {
    if (code === current) return;
    // Same path, swap locale — Next sets the NEXT_LOCALE cookie so the choice persists.
    router.push({ pathname: router.pathname, query: router.query }, router.asPath, {
      locale: code,
      scroll: false,
    });
  };

  return (
    <div
      role="group"
      aria-label={current === 'es' ? 'Idioma' : 'Language'}
      className={`inline-flex items-center rounded-full border border-white/20 overflow-hidden ${className}`}
    >
      {LANGS.map((l, i) => {
        const active = l.code === current;
        return (
          <button
            key={l.code}
            type="button"
            onClick={() => switchTo(l.code)}
            aria-pressed={active}
            lang={l.code}
            className={`font-body text-xs font-semibold tracking-wide px-3 py-1.5 transition ${
              active ? 'bg-white/15 text-white' : 'text-white/55 hover:text-white'
            } ${i === 0 ? 'border-r border-white/20' : ''}`}
          >
            {l.label}
          </button>
        );
      })}
    </div>
  );
}
