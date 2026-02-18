import { useRouter } from 'next/router';

type Locale = 'en' | 'es';

const STEPS = [
  {
    number: '01',
    title: { en: 'Tell us', es: 'Cuéntenos' },
    body: {
      en: 'Describe what\u2019s going on \u2014 in English or Spanish. We organize your information and handle the cross-border details.',
      es: 'Describa lo que le pasa \u2014 en inglés o español. Nosotros organizamos su información y gestionamos los detalles entre países.',
    },
    tag: { en: 'English & Spanish', es: 'Inglés y español' },
  },
  {
    number: '02',
    title: { en: 'We find', es: 'Buscamos' },
    body: {
      en: 'We identify a verified, licensed physician who fits your needs, your language, and your location. Every doctor on Medikah is credentialed and confirmed.',
      es: 'Identificamos un médico verificado y licenciado que se ajuste a lo que necesita, su idioma y su ubicación. Cada médico en Medikah está acreditado y confirmado.',
    },
    tag: { en: 'Verified doctors', es: 'Médicos verificados' },
  },
  {
    number: '03',
    title: { en: 'You meet', es: 'Se conocen' },
    body: {
      en: 'Meet your doctor face to face by secure video. Appointments set in your timezone, consent handled, follow-up coordinated.',
      es: 'Conozca a su médico cara a cara por video seguro. Citas en su zona horaria, consentimiento resuelto, seguimiento coordinado.',
    },
    tag: { en: 'Secure & private', es: 'Seguro y privado' },
  },
];

export default function HowItWorks() {
  const router = useRouter();
  const locale = (router.locale || 'en') as Locale;

  const t = {
    eyebrow: { en: 'How it works', es: 'Cómo funciona' },
    heading1: { en: 'Your Doctor Is', es: 'Su médico está' },
    heading2: { en: 'Closer Than', es: 'más cerca de' },
    headingAccent: { en: 'You Think', es: 'lo que cree' },
    lead: {
      en: 'Tell us what you need. We handle the rest \u2014 so you can sit down with a real doctor, in your language, ready to listen.',
      es: 'Cuéntenos lo que necesita. Nosotros nos encargamos del resto \u2014 para que usted se siente con un médico real, en su idioma, listo para escucharlo.',
    },
  };

  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 min-h-screen" id="about">
      {/* Left pinned */}
      <div className="lg:sticky lg:top-0 lg:h-screen flex flex-col justify-center px-[clamp(2rem,5vw,6rem)] py-16 bg-linen min-h-[60vh]">
        <div className="flex items-center gap-4 mb-8">
          <span className="w-12 h-px bg-teal-500" />
          <span className="font-body text-[0.6875rem] font-medium uppercase tracking-[0.25em] text-teal-500">
            {t.eyebrow[locale]}
          </span>
        </div>
        <h2 className="font-heading text-[clamp(2.5rem,5vw,4.5rem)] font-medium uppercase leading-[0.95] tracking-[-0.02em] text-deep-charcoal">
          {t.heading1[locale]}<br />
          {t.heading2[locale]}<br />
          <span className="text-teal-500">{t.headingAccent[locale]}</span>
        </h2>
        <p className="text-[clamp(1rem,1.5vw,1.125rem)] leading-[1.7] text-text-secondary max-w-[480px] mt-8">
          {t.lead[locale]}
        </p>
      </div>

      {/* Right scrolling */}
      <div className="bg-linen-warm border-l border-teal-500/10">
        {STEPS.map((step) => (
          <div
            key={step.number}
            className="relative min-h-[50vh] flex flex-col justify-center px-[clamp(2rem,4vw,4rem)] py-[clamp(3rem,6vh,6rem)] border-b border-teal-500/[0.08] last:border-b-0 border-l-[3px] border-l-teal-500"
          >
            <div className="font-heading text-[clamp(3.5rem,7vw,6rem)] font-medium text-teal-500/[0.12] leading-none mb-4">
              {step.number}
            </div>
            <h3 className="font-heading text-[clamp(1.25rem,2vw,1.75rem)] font-medium uppercase tracking-[0.02em] text-deep-charcoal mb-4">
              {step.title[locale]}
            </h3>
            <p className="text-base leading-[1.7] text-text-secondary max-w-[480px]">
              {step.body[locale]}
            </p>
            <span className="inline-block mt-6 text-[0.6875rem] font-medium uppercase tracking-[0.04em] text-teal-700 bg-teal-500/[0.08] px-3.5 py-1.5 rounded-lg w-fit">
              {step.tag[locale]}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
