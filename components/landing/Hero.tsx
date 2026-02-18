import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Hero() {
  const router = useRouter();
  const locale = (router.locale || 'en') as 'en' | 'es';

  const t = {
    eyebrow: { en: 'Care Without Distance', es: 'Cuidado sin distancia' },
    line1: { en: 'Connect With Your Doctor', es: 'Conéctese con su médico' },
    line2: { en: 'Wherever You Are', es: 'donde usted esté' },
    subtitle: {
      en: 'Care from real doctors. In your language. Wherever you are.',
      es: 'Médicos reales. En su idioma. Donde usted esté.',
    },
    body1: {
      en: 'Families move between countries every day \u2014 but healthcare doesn\u2019t move with them. Patients lose access. Doctors lose reach. Care gets interrupted.',
      es: 'Las familias se mueven entre pa\u00edses a diario \u2014 pero la salud no se mueve con ellas. Los pacientes pierden acceso. Los m\u00e9dicos pierden alcance. La atenci\u00f3n se interrumpe.',
    },
    body2: {
      en: 'Medikah closes that gap so patients and doctors can focus on what matters \u2014 the consultation, the relationship, the care.',
      es: 'Medikah cierra esa brecha para que pacientes y m\u00e9dicos se concentren en lo que importa \u2014 la consulta, la relaci\u00f3n, el cuidado.',
    },
    ctaPrimary: { en: 'Find a doctor', es: 'Encontrar un médico' },
    ctaSecondary: { en: 'For institutions', es: 'Para instituciones' },
    scroll: { en: 'Scroll', es: 'Deslizar' },
  };

  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center text-center overflow-hidden pt-24 pb-16"
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
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] pointer-events-none">
        <div
          className="absolute w-[320px] h-[320px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(44, 122, 140, 0.12) 0%, rgba(44, 122, 140, 0.03) 60%, transparent 80%)',
            top: '40px',
            left: '20px',
          }}
        />
        <div
          className="absolute w-[280px] h-[280px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(58, 90, 133, 0.15) 0%, rgba(58, 90, 133, 0.04) 60%, transparent 80%)',
            top: '100px',
            right: '20px',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-[2] max-w-[1000px] px-[clamp(1.5rem,6vw,6rem)]">
        {/* Eyebrow */}
        <div className="mb-[clamp(1.5rem,3vh,3rem)]">
          <span className="font-body text-[0.6875rem] font-medium uppercase tracking-[0.25em] text-teal-400" style={{ fontVariant: 'small-caps' }}>
            {t.eyebrow[locale]}
          </span>
        </div>

        {/* Headline */}
        <h1 className="font-heading font-medium uppercase leading-[1.0] tracking-[-0.02em]">
          <span className="block text-white text-[clamp(2.5rem,8vw,6rem)]">
            {t.line1[locale]}
          </span>
          <span className="block text-teal-300 text-[clamp(2.5rem,8vw,6rem)]">
            {t.line2[locale]}
          </span>
        </h1>

        {/* Subtitle */}
        <p className="font-body text-[clamp(1rem,1.5vw,1.1875rem)] font-normal text-cream-500 mt-[clamp(1.5rem,3vh,2.5rem)]">
          {t.subtitle[locale]}
        </p>

        {/* Body */}
        <div className="max-w-[640px] mx-auto mt-[clamp(1.5rem,3vh,2.5rem)] space-y-4">
          <p className="font-body text-[clamp(0.875rem,1.2vw,1rem)] text-cream-400 leading-[1.7]">
            {t.body1[locale]}
          </p>
          <p className="font-body text-[clamp(0.875rem,1.2vw,1rem)] text-cream-400 leading-[1.7]">
            {t.body2[locale]}
          </p>
        </div>

        {/* CTAs */}
        <div className="flex gap-5 justify-center mt-[clamp(2rem,4vh,3.5rem)] flex-col sm:flex-row items-center">
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 font-body text-[0.8125rem] font-medium uppercase tracking-[0.04em] px-9 py-3.5 bg-teal-500 text-white border-2 border-teal-500 rounded-lg hover:bg-teal-600 hover:border-teal-600 hover:-translate-y-[3px] hover:shadow-[0_12px_32px_rgba(44,122,140,0.3)] transition-all duration-300"
          >
            {t.ctaPrimary[locale]} &rarr;
          </Link>
          <a
            href="mailto:partnerships@medikah.health"
            className="inline-flex items-center gap-2 font-body text-[0.8125rem] font-medium uppercase tracking-[0.04em] px-9 py-3.5 bg-transparent text-white border-2 border-white/30 rounded-lg hover:border-teal-400 hover:text-teal-300 hover:-translate-y-[3px] transition-all duration-300"
          >
            {t.ctaSecondary[locale]} &rarr;
          </a>
        </div>

        {/* Trust badges */}
        <div className="flex gap-3 justify-center mt-[clamp(2rem,4vh,3rem)] flex-wrap">
          {['HIPAA Compliant', 'English & Spanish', 'The Americas'].map((badge) => (
            <span key={badge} className="inline-flex items-center font-body text-[0.6875rem] font-medium uppercase tracking-[0.04em] text-teal-300 bg-[rgba(44,122,140,0.15)] px-3.5 py-[5px] rounded-lg">
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
