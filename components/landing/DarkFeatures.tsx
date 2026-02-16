import { useRouter } from 'next/router';

type Locale = 'en' | 'es';

const FEATURES = [
  {
    roman: 'I',
    eyebrow: { en: 'Intelligence', es: 'Inteligencia' },
    title: { en: 'Cross-Border\nTriage', es: 'Triaje\nTransfronterizo' },
    body: {
      en: 'AI-powered conversational intake that understands symptoms in both languages, assesses urgency, and navigates cross-border regulatory requirements automatically.',
      es: 'Admisi\u00f3n conversacional con IA que entiende s\u00edntomas en ambos idiomas, eval\u00faa urgencia, y navega requisitos regulatorios transfronterizos autom\u00e1ticamente.',
    },
    tags: ['GPT-4o', 'Bilingual', '24/7'],
  },
  {
    roman: 'II',
    eyebrow: { en: 'Network', es: 'Red' },
    title: { en: 'Physician\nNetwork', es: 'Red de\nM\u00e9dicos' },
    body: {
      en: 'Verified physicians across borders with three-tier credential verification. Auto-verify through COFEPRIS and US State Medical Boards, semi-auto LinkedIn matching, manual review queue.',
      es: 'M\u00e9dicos verificados transfronterizamente con verificaci\u00f3n de credenciales de tres niveles. Verificaci\u00f3n autom\u00e1tica a trav\u00e9s de COFEPRIS y juntas m\u00e9dicas de EE.UU.',
    },
    tags: ['3-Tier Verify', 'Cross-Border'],
  },
  {
    roman: 'III',
    eyebrow: { en: 'Connection', es: 'Conexi\u00f3n' },
    title: { en: 'Secure\nTelemedicine', es: 'Telemedicina\nSegura' },
    body: {
      en: 'HIPAA-compliant video consultations via Doxy.me, appointment scheduling with timezone intelligence, digital consent, and encrypted communication.',
      es: 'Videoconsultas compatibles con HIPAA v\u00eda Doxy.me, programaci\u00f3n de citas con inteligencia de zona horaria, consentimiento digital y comunicaci\u00f3n encriptada.',
    },
    tags: ['Doxy.me', 'HIPAA', 'Encrypted'],
  },
];

export default function DarkFeatures() {
  const router = useRouter();
  const locale = (router.locale || 'en') as Locale;

  const t = {
    eyebrow: { en: 'Platform Architecture', es: 'Arquitectura de Plataforma' },
    heading: { en: 'The Platform', es: 'La Plataforma' },
  };

  return (
    <section
      className="relative"
      style={{
        background: 'linear-gradient(180deg, #1A1918 0%, #2D2B29 100%)',
      }}
      id="physicians"
    >
      {/* Grain */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.012'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="max-w-[1400px] mx-auto py-[clamp(4rem,8vh,8rem)] px-[clamp(1.5rem,6vw,6rem)] relative z-[1]">
        {/* Header */}
        <div className="text-center mb-[clamp(3rem,6vh,6rem)]">
          <div className="text-[0.625rem] font-medium uppercase tracking-[0.3em] text-teal-400 mb-6">
            {t.eyebrow[locale]}
          </div>
          <h2 className="font-heading text-[clamp(2rem,4vw,3.5rem)] font-normal uppercase leading-[0.95] text-white">
            {t.heading[locale]}
          </h2>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-[clamp(1.5rem,3vw,2.5rem)]">
          {FEATURES.map((feature) => (
            <div
              key={feature.roman}
              className="relative bg-white/[0.04] backdrop-blur-[24px] border border-white/[0.06] rounded-sm overflow-hidden transition-all duration-400 hover:bg-white/[0.07] hover:-translate-y-1.5 hover:shadow-[0_24px_64px_rgba(0,0,0,0.3)] max-w-[600px] mx-auto lg:max-w-none"
              style={{ WebkitBackdropFilter: 'blur(24px)' }}
            >
              {/* Teal top accent */}
              <div
                className="absolute top-0 left-0 right-0 h-[3px]"
                style={{ background: 'linear-gradient(90deg, #2C7A8C, #7BBFCC)' }}
              />

              <div className="p-[clamp(2rem,3vw,3rem)]">
                <div className="font-heading text-[clamp(3rem,5vw,4.5rem)] font-light text-teal-400 leading-none mb-6 opacity-80">
                  {feature.roman}
                </div>
                <div className="text-[0.625rem] font-medium uppercase tracking-[0.2em] text-teal-300 mb-4">
                  {feature.eyebrow[locale]}
                </div>
                <h3 className="font-heading text-[clamp(1.25rem,2vw,1.75rem)] font-normal uppercase leading-none text-white mb-4 whitespace-pre-line">
                  {feature.title[locale]}
                </h3>
                <p className="text-[0.9375rem] leading-[1.8] text-cream-400">
                  {feature.body[locale]}
                </p>
                <div className="flex gap-3 mt-6 flex-wrap">
                  {feature.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[0.625rem] font-medium uppercase tracking-[0.1em] text-cream-500 px-4 py-1.5 border border-white/10 rounded-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
