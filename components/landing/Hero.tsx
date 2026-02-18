import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Hero() {
  const router = useRouter();
  const locale = (router.locale || 'en') as 'en' | 'es';

  const t = {
    eyebrow: { en: 'Cross-Border Coordination', es: 'Coordinaci\u00f3n Transfronteriza' },
    line1: { en: 'Connect With Physicians', es: 'Con\u00e9ctese Con M\u00e9dicos' },
    line2: { en: 'Across Borders', es: 'A Trav\u00e9s De Fronteras' },
    subtitle: {
      en: 'Receive Care Where They\u2019re Licensed.',
      es: 'Reciba Atenci\u00f3n Donde Est\u00e1n Autorizados.',
    },
    body1: {
      en: 'The Americas function as one medical theater \u2014 but systems remain divided by borders that families and physicians routinely cross.',
      es: 'Las Am\u00e9ricas funcionan como un solo teatro m\u00e9dico \u2014 pero los sistemas permanecen divididos por fronteras que familias y m\u00e9dicos cruzan rutinariamente.',
    },
    body2: {
      en: 'Medikah provides the coordination infrastructure these realities require. Not as innovation. As institutional necessity.',
      es: 'Medikah provee la infraestructura de coordinaci\u00f3n que estas realidades requieren. No como innovaci\u00f3n. Como necesidad institucional.',
    },
    ctaPrimary: { en: 'Begin Coordination', es: 'Iniciar Coordinaci\u00f3n' },
    ctaSecondary: { en: 'Institutional Partnerships', es: 'Alianzas Institucionales' },
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

        {/* Subtitle */}
        <p className="font-body text-[clamp(1.125rem,2vw,1.5rem)] font-light italic text-cream-300 mt-[clamp(1rem,2vh,2rem)]">
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
            className="inline-flex items-center gap-2 font-body text-xs font-medium uppercase tracking-[0.1em] px-10 py-4 bg-teal-500 text-white border-2 border-teal-500 rounded-sm hover:bg-teal-600 hover:border-teal-600 hover:-translate-y-[3px] hover:shadow-[0_12px_32px_rgba(44,122,140,0.3)] transition-all duration-300"
          >
            {t.ctaPrimary[locale]} &rarr;
          </Link>
          <a
            href="mailto:partnerships@medikah.health"
            className="inline-flex items-center gap-2 font-body text-xs font-medium uppercase tracking-[0.1em] px-10 py-4 bg-transparent text-white border-2 border-white/30 rounded-sm hover:bg-white/10 hover:border-white/50 hover:-translate-y-[3px] transition-all duration-300"
          >
            {t.ctaSecondary[locale]} &rarr;
          </a>
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
