import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Hero() {
  const router = useRouter();
  const locale = (router.locale || 'en') as 'en' | 'es';

  const t = {
    eyebrow: { en: 'Pan-American Telehealth', es: 'Telesalud Panamericana' },
    line1: { en: 'Care That', es: 'Cuidado Que' },
    line2: { en: 'Crosses Borders', es: 'Cruza Fronteras' },
    bilingual: {
      en: 'Atenci\u00f3n que cruza fronteras.',
      es: 'Care that crosses borders.',
    },
    ctaPrimary: { en: 'Get Started', es: 'Comenzar' },
    ctaSecondary: { en: 'For Physicians', es: 'Para M\u00e9dicos' },
    scroll: { en: 'Scroll', es: 'Desplazar' },
  };

  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center text-center overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #1B2A41 0%, #0D1520 100%)',
      }}
    >
      {/* Grain texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.012'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Overlapping circles */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] pointer-events-none">
        <div
          className="absolute w-[320px] h-[320px] rounded-full opacity-[0.08]"
          style={{ background: '#2C7A8C', top: '30%', left: '15%' }}
        />
        <div
          className="absolute w-[320px] h-[320px] rounded-full opacity-[0.08]"
          style={{ background: '#3A5A85', top: '20%', right: '15%' }}
        />
      </div>

      {/* Content */}
      <div className="relative z-[2] max-w-[1000px] px-[clamp(1.5rem,6vw,6rem)]">
        {/* Eyebrow */}
        <div className="flex items-center justify-center gap-4 mb-[clamp(1.5rem,3vh,3rem)]">
          <span className="w-12 h-px bg-teal-400" />
          <span className="font-body text-[0.6875rem] font-medium uppercase tracking-[0.3em] text-teal-300">
            {t.eyebrow[locale]}
          </span>
          <span className="w-12 h-px bg-teal-400" />
        </div>

        {/* Headline */}
        <h1 className="font-heading font-medium uppercase leading-[0.9] tracking-[-0.03em]">
          <span className="block text-white text-[clamp(3.5rem,12vw,10rem)]">
            {t.line1[locale]}
          </span>
          <span className="block text-teal-400 text-[clamp(3.5rem,12vw,10rem)]">
            {t.line2[locale]}
          </span>
        </h1>

        {/* Bilingual subtitle */}
        <p className="font-body text-[clamp(0.9375rem,1.5vw,1.125rem)] font-light italic text-cream-500 opacity-50 mt-[clamp(1rem,2vh,2rem)]">
          {t.bilingual[locale]}
        </p>

        {/* CTAs */}
        <div className="flex gap-5 justify-center mt-[clamp(2rem,4vh,3.5rem)] flex-col sm:flex-row items-center">
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 font-body text-xs font-medium uppercase tracking-[0.1em] px-10 py-4 bg-teal-500 text-white border-2 border-teal-500 rounded-sm hover:bg-teal-600 hover:border-teal-600 hover:-translate-y-[3px] hover:shadow-[0_12px_32px_rgba(44,122,140,0.3)] transition-all duration-300"
          >
            {t.ctaPrimary[locale]} &rarr;
          </Link>
          <Link
            href="/chat?role=physician"
            className="inline-flex items-center gap-2 font-body text-xs font-medium uppercase tracking-[0.1em] px-10 py-4 bg-transparent text-white border-2 border-white/30 rounded-sm hover:bg-white/10 hover:border-white/50 hover:-translate-y-[3px] transition-all duration-300"
          >
            {t.ctaSecondary[locale]} &rarr;
          </Link>
        </div>

        {/* Trust badges */}
        <div className="flex gap-6 justify-center items-center mt-[clamp(2.5rem,5vh,4rem)] flex-wrap">
          {['HIPAA Compliant', 'Bilingual EN/ES', 'Cross-Border'].map((badge) => (
            <span key={badge} className="flex items-center gap-2 font-body text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-cream-500">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
              {badge}
            </span>
          ))}
        </div>
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-[clamp(1.5rem,3vh,3rem)] right-[clamp(1.5rem,4vw,4rem)] flex flex-col items-center gap-2 z-[2]">
        <div className="w-px h-12 bg-gradient-to-b from-teal-400 to-transparent animate-scrollPulse origin-top" />
        <span className="text-[0.625rem] font-medium uppercase tracking-[0.2em] text-cream-500" style={{ writingMode: 'vertical-rl' }}>
          {t.scroll[locale]}
        </span>
      </div>
    </section>
  );
}
