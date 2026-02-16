import Link from 'next/link';
import { useRouter } from 'next/router';

export default function LandingFooter() {
  const router = useRouter();
  const isEs = router.locale === 'es';

  return (
    <footer
      className="relative overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #2D2B29 0%, #1A1918 100%)',
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
            <span className="font-body text-2xl font-normal text-white lowercase tracking-[0.02em]">
              medikah
            </span>
            <p className="text-cream-400 text-[0.9375rem] mt-5 max-w-[320px] leading-[1.7]">
              {isEs
                ? 'Coordinaci\u00f3n de salud que cruza fronteras. Triaje con IA, m\u00e9dicos verificados, telemedicina segura \u2014 en su idioma, en sus t\u00e9rminos.'
                : 'Healthcare coordination that crosses borders. AI-powered triage, verified physicians, secure telemedicine \u2014 in your language, on your terms.'}
            </p>
            <div className="font-body text-xs font-medium uppercase tracking-[0.08em] text-teal-400 mt-8">
              {isEs ? 'Atenci\u00f3n que cruza fronteras.' : 'Care that crosses borders.'}
            </div>
            {/* Trust badges */}
            <div className="flex gap-4 mt-5 flex-wrap">
              {['HIPAA', 'Bilingual', 'Encrypted'].map((badge) => (
                <span
                  key={badge}
                  className="text-[0.625rem] font-medium uppercase tracking-[0.1em] text-cream-500 px-3 py-1 border border-white/[0.08] rounded-sm"
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>

          {/* Platform nav */}
          <div>
            <h4 className="text-[0.625rem] font-medium uppercase tracking-[0.2em] text-teal-400 mb-6">
              {isEs ? 'Plataforma' : 'Platform'}
            </h4>
            <ul className="space-y-3">
              {[
                { label: { en: 'For Patients', es: 'Para Pacientes' }, href: '/chat?role=patient' },
                { label: { en: 'For Physicians', es: 'Para M\u00e9dicos' }, href: '/chat?role=physician' },
                { label: { en: 'AI Triage', es: 'Triaje IA' }, href: '#chat-section' },
                { label: { en: 'About', es: 'Acerca' }, href: '#about' },
              ].map((link) => (
                <li key={link.label.en}>
                  <Link
                    href={link.href}
                    className="text-cream-400 text-[0.9375rem] hover:text-white transition-colors duration-200"
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
                { label: { en: 'Privacy Policy', es: 'Pol\u00edtica de Privacidad' }, href: '/privacy' },
                { label: { en: 'Terms of Service', es: 'T\u00e9rminos de Servicio' }, href: '/terms' },
                { label: { en: 'HIPAA Notice', es: 'Aviso HIPAA' }, href: '/privacy#hipaa' },
                { label: { en: 'Contact', es: 'Contacto' }, href: 'mailto:support@medikah.health' },
              ].map((link) => (
                <li key={link.label.en}>
                  <Link
                    href={link.href}
                    className="text-cream-400 text-[0.9375rem] hover:text-white transition-colors duration-200"
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
            &copy; {new Date().getFullYear()} Medikah Health. {isEs ? 'Todos los derechos reservados.' : 'All rights reserved.'}
          </p>
          <div className="flex gap-[clamp(1rem,2vw,2rem)] flex-wrap justify-center">
            {[
              { label: 'BeNeXT Global', href: 'https://benext.global' },
              { label: 'Futuro', href: 'https://futuro.ngo' },
              { label: 'NeXT', href: 'https://next.ngo' },
              { label: 'H\u00e9ctor H. L\u00f3pez', href: 'https://hectorhlopez.com' },
              { label: 'Medikah', href: '/', current: true },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                className={`font-heading text-[0.625rem] font-medium uppercase tracking-[0.1em] transition-colors duration-200 ${
                  link.current
                    ? 'text-teal-400'
                    : 'text-white/30 hover:text-white'
                }`}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
