import Link from 'next/link';
import { useRouter } from 'next/router';

export default function CTAMonument() {
  const router = useRouter();
  const locale = (router.locale || 'en') as 'en' | 'es';

  const t = {
    thin: {
      en: 'Healthcare technology that crosses borders. In your language. On your terms.',
      es: 'Tecnolog\u00eda de salud que cruza fronteras. En su idioma. En sus t\u00e9rminos.',
    },
    big1: { en: 'Begin Your ', es: 'Comience Su ' },
    bigAccent: { en: 'Consultation', es: 'Consulta' },
    bilingual: {
      en: 'Comience su consulta hoy.',
      es: 'Begin your consultation today.',
    },
    ctaPrimary: { en: 'Begin Coordination', es: 'Iniciar Coordinaci\u00f3n' },
    ctaSecondary: { en: 'Institutional Partnerships', es: 'Alianzas Institucionales' },
  };

  return (
    <section className="min-h-[80vh] flex flex-col items-center justify-center text-center px-[clamp(1.5rem,4vw,4rem)] py-[clamp(4rem,8vh,8rem)] bg-linen-warm">
      <h2 className="font-heading font-normal uppercase leading-[0.95] tracking-[-0.02em]">
        <span className="block font-body text-[clamp(0.875rem,1.5vw,1.125rem)] font-normal tracking-[0.08em] text-text-muted mb-[clamp(1rem,2vh,2rem)] normal-case">
          {t.thin[locale]}
        </span>
        <span className="block text-[clamp(2.5rem,8vw,7rem)] text-deep-charcoal">
          {t.big1[locale]}<span className="text-teal-500">{t.bigAccent[locale]}</span>
        </span>
      </h2>
      <p className="font-body text-[0.9375rem] font-light italic text-text-muted mt-6">
        {t.bilingual[locale]}
      </p>
      <div className="flex gap-6 mt-[clamp(2rem,4vh,4rem)] flex-col sm:flex-row items-center">
        <Link
          href="/chat"
          className="inline-flex items-center gap-2 font-body text-xs font-medium uppercase tracking-[0.1em] px-10 py-4 bg-teal-500 text-white border-2 border-teal-500 rounded-sm hover:bg-teal-600 hover:border-teal-600 hover:-translate-y-[3px] hover:shadow-[0_12px_32px_rgba(44,122,140,0.3)] transition-all duration-300"
        >
          {t.ctaPrimary[locale]} &rarr;
        </Link>
        <a
          href="mailto:partnerships@medikah.health"
          className="inline-flex items-center gap-2 font-body text-xs font-medium uppercase tracking-[0.1em] px-10 py-4 bg-transparent text-warm-gray-700 border-2 border-warm-gray-700 rounded-sm hover:bg-warm-gray-700 hover:text-white hover:-translate-y-[3px] transition-all duration-300"
        >
          {t.ctaSecondary[locale]} &rarr;
        </a>
      </div>
    </section>
  );
}
