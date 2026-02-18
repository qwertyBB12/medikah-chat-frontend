import Link from 'next/link';
import { useRouter } from 'next/router';

type Locale = 'en' | 'es';

const CARDS = [
  {
    initial: 'P',
    imgClass: 'bg-gradient-to-br from-teal-200 to-linen-warm',
    meta: { en: 'Patient Portal', es: 'Portal de Pacientes' },
    title: { en: 'Connect\nAcross Borders', es: 'Con\u00e9ctese\nTransfronterizamente' },
    body: {
      en: 'Bilingual intake in your language, cross-border consent, appointment scheduling with timezone support, and secure video conferencing.',
      es: 'Admisi\u00f3n biling\u00fce en su idioma, consentimiento transfronterizo, citas con soporte de zona horaria, y videoconferencia segura.',
    },
    badge: { en: 'EN/ES Bilingual', es: 'Biling\u00fce EN/ES' },
    link: { label: { en: 'Start Consultation', es: 'Iniciar Consulta' }, href: '/chat?role=patient' },
  },
  {
    initial: 'MD',
    imgClass: 'bg-gradient-to-br from-linen-warm to-teal-200',
    meta: { en: 'Physician Portal', es: 'Portal de M\u00e9dicos' },
    title: { en: 'Expand Your\nPractice', es: 'Expanda Su\nPr\u00e1ctica' },
    body: {
      en: 'Onboard in minutes with LinkedIn import, manage patient inquiries, use AI diagnostic tools, and set your own availability.',
      es: 'Reg\u00edstrese en minutos con LinkedIn, gestione consultas de pacientes, use herramientas de diagn\u00f3stico con IA, y configure su disponibilidad.',
    },
    badge: { en: '3-Tier Verification', es: 'Verificaci\u00f3n de 3 Niveles' },
    link: { label: { en: 'Join As Physician', es: 'Unirse como M\u00e9dico' }, href: '/chat?role=physician' },
  },
  {
    initial: 'AI',
    imgClass: 'bg-gradient-to-br from-teal-200 to-linen-warm',
    meta: { en: 'Clinical Decision Support', es: 'Apoyo a Decisiones Cl\u00ednicas' },
    title: { en: 'AI-Powered\nDiagnosis', es: 'Diagn\u00f3stico\nCon IA' },
    body: {
      en: 'GPT-4o differential diagnosis tool for physicians. Input symptoms, review AI assessment, make informed clinical decisions.',
      es: 'Herramienta de diagn\u00f3stico diferencial GPT-4o para m\u00e9dicos. Ingrese s\u00edntomas, revise la evaluaci\u00f3n de IA, tome decisiones cl\u00ednicas informadas.',
    },
    badge: { en: 'HIPAA Compliant', es: 'Compatible con HIPAA' },
    link: { label: { en: 'Learn More', es: 'Saber M\u00e1s' }, href: '#chat-section' },
  },
];

const STAGGER_OFFSETS = ['mt-0', 'mt-[clamp(3rem,6vh,6rem)]', 'mt-[clamp(1.5rem,3vh,3rem)]'];

export default function StaggeredGrid() {
  const router = useRouter();
  const locale = (router.locale || 'en') as Locale;

  const t = {
    eyebrow: { en: 'For Patients & Physicians', es: 'Para Pacientes y M\u00e9dicos' },
    heading: { en: 'Two Portals.\nOne Platform.', es: 'Dos Portales.\nUna Plataforma.' },
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
