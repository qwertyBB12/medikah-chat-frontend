import { useRouter } from 'next/router';

type Locale = 'en' | 'es';

const STEPS = [
  {
    number: '01',
    title: { en: 'Intake', es: 'Admisi\u00f3n' },
    body: {
      en: 'Describe your health concerns in English or Spanish. Our coordination technology captures your information, organizes it for physician review, and navigates cross-border requirements.',
      es: 'Describa sus inquietudes de salud en ingl\u00e9s o espa\u00f1ol. Nuestra tecnolog\u00eda de coordinaci\u00f3n captura su informaci\u00f3n, la organiza para revisi\u00f3n m\u00e9dica, y navega requisitos transfronterizos.',
    },
    tag: { en: 'Bilingual', es: 'Biling\u00fce' },
  },
  {
    number: '02',
    title: { en: 'Match', es: 'Conexi\u00f3n' },
    body: {
      en: 'Based on your health concerns, location, and language, Medikah identifies verified physicians licensed to practice across borders. Every credential is verified through our three-tier system.',
      es: 'Seg\u00fan sus inquietudes de salud, ubicaci\u00f3n e idioma, Medikah identifica m\u00e9dicos verificados con licencia para ejercer transfronterizamente. Cada credencial se verifica a trav\u00e9s de nuestro sistema de tres niveles.',
    },
    tag: { en: 'Verified Physicians', es: 'M\u00e9dicos Verificados' },
  },
  {
    number: '03',
    title: { en: 'Connect', es: 'Conexi\u00f3n' },
    body: {
      en: 'Connect with your physician via secure video conferencing. Appointments scheduled in your timezone, consent handled digitally, and follow-up coordinated across borders.',
      es: 'Con\u00e9ctese con su m\u00e9dico v\u00eda videoconferencia segura. Citas programadas en su zona horaria, consentimiento digital, y seguimiento coordinado transfronterizamente.',
    },
    tag: { en: 'Encrypted', es: 'Encriptado' },
  },
];

export default function HowItWorks() {
  const router = useRouter();
  const locale = (router.locale || 'en') as Locale;

  const t = {
    eyebrow: { en: 'How Medikah Works', es: 'C\u00f3mo Funciona Medikah' },
    heading1: { en: 'Healthcare', es: 'Coordinaci\u00f3n' },
    heading2: { en: 'Coordination That', es: 'de Salud Que' },
    headingAccent: { en: 'Crosses Borders', es: 'Cruza Fronteras' },
    lead: {
      en: 'Our coordination technology connects you with the right physician, in your language, across any border. From first conversation to scheduled consultation.',
      es: 'Nuestra tecnolog\u00eda de coordinaci\u00f3n lo conecta con el m\u00e9dico adecuado, en su idioma, sin importar fronteras. Desde la primera conversaci\u00f3n hasta la consulta programada.',
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
            className="relative min-h-[50vh] flex flex-col justify-center px-[clamp(2.5rem,5vw,5rem)] py-[clamp(3rem,6vh,6rem)] border-b border-teal-500/[0.08] last:border-b-0"
          >
            {/* Teal left-border accent */}
            <div className="absolute left-0 top-[20%] bottom-[20%] w-[3px] rounded-sm bg-gradient-to-b from-teal-500 to-teal-300" />

            <div className="font-heading text-[clamp(3.5rem,7vw,6rem)] font-medium text-teal-500/[0.12] leading-none mb-4">
              {step.number}
            </div>
            <h3 className="font-heading text-[clamp(1.25rem,2vw,1.75rem)] font-medium uppercase tracking-[0.02em] text-deep-charcoal mb-4">
              {step.title[locale]}
            </h3>
            <p className="text-base leading-[1.7] text-text-secondary max-w-[480px]">
              {step.body[locale]}
            </p>
            <span className="inline-block mt-6 text-[0.6875rem] font-medium uppercase tracking-[0.04em] text-teal-700 bg-teal-500/[0.08] px-3.5 py-1.5 rounded-sm w-fit">
              {step.tag[locale]}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
