import Link from 'next/link';
import { useRouter } from 'next/router';

type Locale = 'en' | 'es';

const CARDS = [
  {
    initial: 'P',
    imgClass: 'bg-gradient-to-br from-teal-200 to-linen-warm',
    meta: { en: 'Patient Portal', es: 'Portal de pacientes' },
    title: { en: 'Find your\ndoctor', es: 'Encuentre a\nsu médico' },
    body: {
      en: 'Tell us what you need in your language. We handle consent, scheduling, and timezone logistics so you can focus on your health.',
      es: 'Cuéntenos lo que necesita en su idioma. Nosotros gestionamos consentimiento, agenda y zona horaria para que se enfoque en su salud.',
    },
    badge: { en: 'English & Spanish', es: 'Inglés y español' },
    link: { label: { en: 'Find a doctor', es: 'Encontrar un médico' }, href: '/chat?role=patient' },
  },
  {
    initial: 'MD',
    imgClass: 'bg-gradient-to-br from-linen-warm to-teal-200',
    meta: { en: 'Physician Portal', es: 'Portal de médicos' },
    title: { en: 'Reach more\npatients', es: 'Llegue a más\npacientes' },
    body: {
      en: 'Join a network of verified physicians. Onboard in minutes, manage your patients, and extend your reach across countries.',
      es: '\u00danase a una red de m\u00e9dicos verificados. Reg\u00edstrese en minutos, gestione sus pacientes y ampl\u00ede su alcance entre pa\u00edses.',
    },
    badge: { en: '3-Tier Verification', es: 'Verificación de 3 niveles' },
    link: { label: { en: 'Join the network', es: 'Unirse a la red' }, href: '/chat?role=physician' },
  },
  {
    initial: 'AI',
    imgClass: 'bg-gradient-to-br from-teal-200 to-linen-warm',
    meta: { en: 'For physicians', es: 'Para médicos' },
    title: { en: 'Clinical decision\nsupport', es: 'Apoyo a decisiones\nclínicas' },
    body: {
      en: 'A diagnostic support tool that helps physicians organize symptoms and consider differentials \u2014 so they can make better-informed decisions for their patients.',
      es: 'Herramienta de apoyo diagnóstico que ayuda a los médicos a organizar síntomas y considerar diferenciales \u2014 para tomar decisiones más informadas por sus pacientes.',
    },
    badge: { en: 'For licensed physicians', es: 'Para médicos licenciados' },
    link: { label: { en: 'Learn more', es: 'Conocer más' }, href: '#chat-section' },
  },
];

const STAGGER_OFFSETS = ['mt-0', 'mt-[clamp(3rem,6vh,6rem)]', 'mt-[clamp(1.5rem,3vh,3rem)]'];

export default function StaggeredGrid() {
  const router = useRouter();
  const locale = (router.locale || 'en') as Locale;

  const t = {
    eyebrow: { en: 'For Patients & Physicians', es: 'Para pacientes y médicos' },
    heading: { en: 'Two Portals.\nOne Platform.', es: 'Dos portales.\nUna plataforma.' },
  };

  return (
    <section className="py-[clamp(4rem,8vh,8rem)] bg-linen-light" id="patients">
      {/* Header */}
      <div className="max-w-[1400px] mx-auto px-[clamp(1.5rem,6vw,6rem)] mb-[clamp(3rem,6vh,6rem)]">
        <div className="flex items-center gap-4 mb-6">
          <span className="w-12 h-px bg-teal-500" />
          <span className="font-body text-[0.6875rem] font-medium uppercase tracking-[0.25em] text-teal-500">
            {t.eyebrow[locale]}
          </span>
        </div>
        <h2 className="font-heading text-[clamp(2rem,4vw,3.5rem)] font-medium uppercase leading-[0.95] text-deep-charcoal whitespace-pre-line">
          {t.heading[locale]}
        </h2>
      </div>

      {/* Grid */}
      <div className="max-w-[1400px] mx-auto px-[clamp(1.5rem,6vw,6rem)] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[clamp(1.5rem,3vw,3rem)]">
        {CARDS.map((card, i) => (
          <div
            key={card.initial}
            className={`bg-linen-white border border-warm-gray-800/[0.06] rounded-lg overflow-hidden transition-all duration-400 hover:-translate-y-1.5 hover:shadow-[0_20px_48px_rgba(27,42,65,0.1)] ${
              STAGGER_OFFSETS[i] || ''
            } md:nth-child-2:mt-0 lg:nth-child-2:mt-[clamp(3rem,6vh,6rem)]`}
            style={i === 1 ? {} : {}}
          >
            {/* Card image area */}
            <div className={`h-[clamp(120px,14vw,160px)] flex items-center justify-center relative overflow-hidden ${card.imgClass}`}>
              <span className="font-heading text-[clamp(2.5rem,4vw,3.5rem)] font-medium text-teal-300 opacity-60">
                {card.initial}
              </span>
              <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-t from-white/50 to-transparent" />
            </div>

            {/* Card body */}
            <div className="p-[clamp(1.25rem,2vw,2rem)]">
              <div className="text-[0.625rem] font-medium uppercase tracking-[0.15em] text-teal-600 mb-2">
                {card.meta[locale]}
              </div>
              <h3 className="font-heading text-[1.25rem] font-medium uppercase tracking-[0.02em] text-deep-charcoal mb-2 whitespace-pre-line">
                {card.title[locale]}
              </h3>
              <p className="text-sm text-text-muted leading-[1.7]">
                {card.body[locale]}
              </p>
              <span className="inline-block mt-3 text-[0.6875rem] font-medium uppercase tracking-[0.04em] text-teal-700 bg-teal-500/[0.08] px-3.5 py-1.5 rounded-lg">
                {card.badge[locale]}
              </span>
              <Link
                href={card.link.href}
                className="flex items-center gap-2 mt-5 text-xs font-medium uppercase tracking-[0.1em] text-teal-500 hover:gap-3 transition-all duration-300"
              >
                {card.link.label[locale]} &rarr;
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
