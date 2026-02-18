import { useRouter } from 'next/router';

type Locale = 'en' | 'es';

const FEATURES = [
  {
    roman: 'I',
    eyebrow: { en: 'Listening', es: 'Escuchar' },
    title: { en: 'We listen in\nboth languages', es: 'Escuchamos en\nambos idiomas' },
    body: {
      en: 'Tell us what you need in English or Spanish. We organize your information and navigate the cross-border requirements \u2014 so your doctor gets a complete picture before you even meet.',
      es: 'Cuéntenos lo que necesita en inglés o español. Organizamos su información y gestionamos los requisitos entre países \u2014 para que su médico tenga el panorama completo antes de conocerse.',
    },
    tags: ['Bilingual', 'Automated', '24/7'],
  },
  {
    roman: 'II',
    eyebrow: { en: 'Trust', es: 'Confianza' },
    title: { en: 'Every doctor\nis verified', es: 'Cada médico\nestá verificado' },
    body: {
      en: 'Three levels of verification \u2014 automated license checks through COFEPRIS and US medical boards, professional profile matching, and manual review. Because trust isn\u2019t optional.',
      es: 'Tres niveles de verificación \u2014 validación automática de licencias vía COFEPRIS y juntas médicas de EE.\u202fUU., cotejo de perfil profesional y revisión manual. Porque la confianza no es opcional.',
    },
    tags: ['3-Tier Verify', 'Cross-Border'],
  },
  {
    roman: 'III',
    eyebrow: { en: 'Privacy', es: 'Privacidad' },
    title: { en: 'Your conversation\nstays private', es: 'Su conversación\nes privada' },
    body: {
      en: 'HIPAA-compliant video, scheduling that adjusts to your timezone, digital consent, and encrypted communication. The technology stays invisible \u2014 the care doesn\u2019t.',
      es: 'Video que cumple con HIPAA, agenda ajustada a su zona horaria, consentimiento digital y comunicación cifrada. La tecnología pasa desapercibida \u2014 el cuidado, no.',
    },
    tags: ['Video', 'HIPAA', 'Encrypted'],
  },
];

export default function DarkFeatures() {
  const router = useRouter();
  const locale = (router.locale || 'en') as Locale;

  const t = {
    eyebrow: { en: 'What makes it possible', es: 'Lo que lo hace posible' },
    heading: { en: 'Built for human care', es: 'Construido para el cuidado humano' },
  };

  return (
    <section
      className="relative"
      style={{
        background: 'linear-gradient(180deg, #1B2A41 0%, #0D1520 100%)',
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
          <div className="text-[0.6875rem] font-medium uppercase tracking-[0.25em] text-teal-400 mb-6">
            {t.eyebrow[locale]}
          </div>
          <h2 className="font-heading text-[clamp(2rem,4vw,3.5rem)] font-medium uppercase leading-[0.95] text-white">
            {t.heading[locale]}
          </h2>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-[clamp(1.5rem,3vw,2.5rem)]">
          {FEATURES.map((feature) => (
            <div
              key={feature.roman}
              className="relative bg-[rgba(27,42,65,0.4)] backdrop-blur-[8px] border border-white/[0.06] border-t-[3px] border-t-teal-500 rounded-lg overflow-hidden transition-all duration-400 hover:border-white/[0.1] hover:border-t-teal-400 hover:-translate-y-1 hover:shadow-[0_24px_64px_rgba(0,0,0,0.3)] max-w-[600px] mx-auto lg:max-w-none"
              style={{ WebkitBackdropFilter: 'blur(8px)' }}
            >
              <div className="p-[clamp(2rem,3vw,3rem)]">
                <div className="font-heading text-[clamp(1.5rem,2.5vw,2rem)] font-medium text-teal-400 leading-none mb-6">
                  {feature.roman}
                </div>
                <div className="text-[0.625rem] font-medium uppercase tracking-[0.2em] text-teal-300 mb-4">
                  {feature.eyebrow[locale]}
                </div>
                <h3 className="font-heading text-[clamp(1.25rem,2vw,1.75rem)] font-medium uppercase leading-[1.05] text-white mb-4 whitespace-pre-line">
                  {feature.title[locale]}
                </h3>
                <p className="text-[0.9375rem] leading-[1.8] text-white/50">
                  {feature.body[locale]}
                </p>
                <div className="flex gap-3 mt-6 flex-wrap">
                  {feature.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[0.625rem] font-medium uppercase tracking-[0.1em] text-cream-500 px-4 py-1.5 border border-white/[0.08] rounded-lg"
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
