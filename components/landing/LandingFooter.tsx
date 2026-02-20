import Link from 'next/link';
import { useRouter } from 'next/router';

export default function LandingFooter() {
  const router = useRouter();
  const isEs = router.locale === 'es';

  return (
    <footer
      className="relative overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #1B2A41 0%, #0D1520 100%)',
        borderRadius: '32px 32px 0 0',
      }}
    >
      {/* Grain */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.012'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="max-w-[1400px] mx-auto px-[clamp(1.5rem,6vw,6rem)] pt-[clamp(3rem,8vh,6rem)] pb-[clamp(2rem,4vh,3rem)] relative">
        {/* Top grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr_1fr] gap-[clamp(2rem,4vw,6rem)] pb-12">
          {/* Brand column */}
          <div>
            <span className="font-body text-2xl font-medium text-white lowercase tracking-[0.04em]">
              medikah
            </span>
            <p className="text-white/50 text-[0.9375rem] mt-5 max-w-[320px] leading-[1.7]">
              {isEs
                ? 'Plataforma tecnol\u00f3gica que cumple con HIPAA para coordinaci\u00f3n de salud entre pa\u00edses. M\u00e9dicos verificados, videoconferencia segura y agenda \u2014 en su idioma, en sus condiciones.'
                : 'HIPAA-compliant technology platform for international healthcare coordination. Verified physicians, secure video conferencing, and scheduling \u2014 in your language, on your terms.'}
            </p>
            <div className="font-body text-[0.8125rem] font-medium tracking-[0.04em] text-teal-400 mt-8">
              {isEs ? 'Cuidado humano sin distancia.' : 'Human care without distance.'}
            </div>
            {/* Trust badges */}
            <div className="flex gap-3 mt-5 flex-wrap">
              {['HIPAA', 'Bilingual', 'Encrypted'].map((badge) => (
                <span
                  key={badge}
                  className="inline-flex items-center text-[0.6875rem] font-medium uppercase tracking-[0.04em] text-teal-300 bg-[rgba(44,122,140,0.15)] px-3.5 py-[5px] rounded-lg"
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>

          {/* Platform nav */}
          <div>
            <h4 className="text-[0.625rem] font-medium uppercase tracking-[0.2em] text-teal-400 mb-6">
              {isEs ? 'plataforma' : 'Platform'}
            </h4>
            <ul className="space-y-3">
              {[
                { label: { en: 'For Patients', es: 'Para pacientes' }, href: '/chat?role=patient' },
                { label: { en: 'For Physicians', es: 'Para médicos' }, href: '/chat?role=physician' },
                { label: { en: 'Coordination', es: 'Coordinación' }, href: '#chat-section' },
                { label: { en: 'About', es: 'Acerca' }, href: '#about' },
              ].map((link) => (
                <li key={link.label.en}>
                  <Link
                    href={link.href}
                    className="text-white/50 text-[0.9375rem] hover:text-white transition-colors duration-200"
                  >
                    {isEs ? link.label.es : link.label.en}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal nav */}
          <div>
            <h4 className="text-[0.625rem] font-medium uppercase tracking-[0.2em] text-teal-400 mb-6">
              {isEs ? 'Legal' : 'Legal'}
            </h4>
            <ul className="space-y-3">
              {[
                { label: { en: 'Privacy Policy', es: 'Política de privacidad' }, href: '/privacy' },
                { label: { en: 'Terms of Service', es: 'Términos de servicio' }, href: '/terms' },
                { label: { en: 'HIPAA Notice', es: 'Aviso HIPAA' }, href: '/privacy#hipaa' },
                { label: { en: 'Contact', es: 'Contacto' }, href: 'mailto:support@medikah.health' },
                { label: { en: 'Partnerships', es: 'Alianzas' }, href: 'mailto:partnerships@medikah.health' },
                { label: { en: 'Legal', es: 'Legal' }, href: 'mailto:legal@medikah.health' },
              ].map((link) => (
                <li key={link.label.en}>
                  <Link
                    href={link.href}
                    className="text-white/50 text-[0.9375rem] hover:text-white transition-colors duration-200"
                  >
                    {isEs ? link.label.es : link.label.en}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/[0.06] pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-cream-500 text-xs">
            &copy; {new Date().getFullYear()} Medikah Corporation. {isEs ? 'Todos los derechos reservados.' : 'All rights reserved.'}
          </p>
          <span className="font-heading text-[0.625rem] font-medium uppercase tracking-[0.1em] text-teal-400">
            Medikah
          </span>
        </div>
      </div>
    </footer>
  );
}
