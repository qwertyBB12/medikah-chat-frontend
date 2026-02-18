import Link from 'next/link';
import { useRouter } from 'next/router';

export default function CTAMonument() {
  const router = useRouter();
  const locale = (router.locale || 'en') as 'en' | 'es';

  const t = {
    thin: {
      en: 'The right doctor is waiting. In your language. On your terms.',
      es: 'El médico indicado lo espera. En su idioma. En sus condiciones.',
    },
    big1: { en: 'Begin Your ', es: 'Inicie su ' },
    bigAccent: { en: 'Consultation', es: 'consulta' },
    bilingual: {
      en: 'Comience su consulta hoy.',
      es: 'Begin your consultation today.',
    },
    ctaPrimary: { en: 'Find a doctor', es: 'Encontrar un médico' },
    ctaSecondary: { en: 'For institutions', es: 'Para instituciones' },
  };

  return (
    <section className="min-h-[80vh] flex flex-col items-center justify-center text-center px-[clamp(1.5rem,4vw,4rem)] py-[clamp(4rem,8vh,8rem)] bg-linen-warm">
      <h2 className="font-heading font-medium uppercase leading-[0.9] tracking-[-0.03em]">
        <span className="block font-body text-[clamp(0.875rem,1.5vw,1.125rem)] font-normal tracking-[0.02em] text-text-muted mb-[clamp(1rem,2vh,2rem)] normal-case max-w-[560px] mx-auto leading-[1.7]">
          {t.thin[locale]}
        </span>
        <span className="block text-[clamp(3rem,10vw,9rem)] text-deep-charcoal">
          {t.big1[locale]}<span className="text-teal-500">{t.bigAccent[locale]}</span>
        </span>
      </h2>
      <p className="font-body text-[0.8125rem] font-light italic text-text-muted mt-6 opacity-70">
        {t.bilingual[locale]}
      </p>
      <div className="flex gap-6 mt-[clamp(2rem,4vh,4rem)] flex-col sm:flex-row items-center">
        <Link
          href="/chat"
          className="inline-flex items-center gap-2 font-body text-[0.8125rem] font-medium uppercase tracking-[0.04em] px-9 py-3.5 bg-teal-500 text-white border-2 border-teal-500 rounded-lg hover:bg-teal-600 hover:border-teal-600 hover:-translate-y-[3px] hover:shadow-[0_12px_32px_rgba(44,122,140,0.3)] transition-all duration-300"
        >
          {t.ctaPrimary[locale]} &rarr;
        </Link>
        <a
          href="mailto:partnerships@medikah.health"
          className="inline-flex items-center gap-2 font-body text-[0.8125rem] font-medium uppercase tracking-[0.04em] px-9 py-3.5 bg-transparent text-warm-gray-800 border-2 border-warm-gray-800 rounded-lg hover:bg-warm-gray-800 hover:text-white hover:-translate-y-[3px] transition-all duration-300"
        >
          {t.ctaSecondary[locale]} &rarr;
        </a>
      </div>
    </section>
  );
}
