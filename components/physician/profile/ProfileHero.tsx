import Image from 'next/image';
import FadeInSection from './FadeInSection';

interface ProfileHeroProps {
  fullName: string;
  photoUrl?: string;
  primarySpecialty?: string;
  boardCertifications?: { board: string; certification: string; year?: number }[];
  currentInstitutions?: string[];
  languages?: string[];
  timezone?: string;
  licenses?: { country: string; countryCode: string }[];
  isEs: boolean;
  onScheduleClick: () => void;
}

export default function ProfileHero({
  fullName,
  photoUrl,
  primarySpecialty,
  boardCertifications,
  currentInstitutions,
  languages,
  timezone,
  licenses,
  isEs,
  onScheduleClick,
}: ProfileHeroProps) {
  const countries = licenses
    ? Array.from(new Set(licenses.map((l) => l.country)))
    : [];

  const credentials: { bold: string; detail: string }[] = [];

  if (primarySpecialty) {
    credentials.push({
      bold: primarySpecialty,
      detail: isEs ? 'Especialidad Principal' : 'Primary Specialty',
    });
  }

  if (currentInstitutions && currentInstitutions.length > 0) {
    credentials.push({
      bold: currentInstitutions[0],
      detail: currentInstitutions.length > 1
        ? `+${currentInstitutions.length - 1} ${isEs ? 'más' : 'more'}`
        : '',
    });
  }

  if (boardCertifications && boardCertifications.length > 0) {
    credentials.push({
      bold: boardCertifications[0].certification || boardCertifications[0].board,
      detail: boardCertifications.length > 1
        ? `+${boardCertifications.length - 1} ${isEs ? 'más' : 'more'}`
        : '',
    });
  }

  if (countries.length > 0) {
    credentials.push({
      bold: isEs ? 'Licenciado en' : 'Licensed in',
      detail: countries.join(', '),
    });
  }

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-warm-gray-900 to-inst-blue">
      {/* Grain texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.012'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-[2] max-w-5xl mx-auto px-6 md:px-8 py-20 md:py-28">
        <FadeInSection>
          <div className="flex items-start justify-between mb-12">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-[2px] bg-[#C4A57B]" />
                <span className="text-[13px] font-semibold tracking-[0.15em] text-[#C4A57B] uppercase">
                  {primarySpecialty || (isEs ? 'Médico' : 'Physician')}
                  {timezone && ` · ${timezone.replace('America/', '').replace(/_/g, ' ')}`}
                </span>
              </div>

              <h1 className="font-heading text-4xl md:text-5xl font-bold tracking-[-0.025em] text-white mb-8">
                {fullName}
              </h1>
            </div>

            {photoUrl && (
              <div className="hidden lg:block shrink-0 ml-8">
                <div className="relative w-36 h-36 rounded-full overflow-hidden ring-4 ring-[#C4A57B] ring-offset-4 ring-offset-inst-blue">
                  <Image
                    src={photoUrl}
                    alt={fullName}
                    fill
                    className="object-cover"
                    sizes="144px"
                  />
                </div>
              </div>
            )}
          </div>

          {photoUrl && (
            <div className="flex justify-center mb-10 lg:hidden">
              <div className="relative w-36 h-36 rounded-full overflow-hidden ring-4 ring-[#C4A57B] ring-offset-4 ring-offset-inst-blue">
                <Image
                  src={photoUrl}
                  alt={fullName}
                  fill
                  className="object-cover"
                  sizes="144px"
                />
              </div>
            </div>
          )}

          {credentials.length > 0 && (
            <div className="space-y-5 mb-12 max-w-3xl">
              {credentials.map((c, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="w-1 h-6 bg-[#C4A57B] mt-1.5 shrink-0" />
                  <p className="text-lg text-white/90 leading-relaxed">
                    <strong className="font-semibold text-white">{c.bold}</strong>
                    {c.detail && ` — ${c.detail}`}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-6 mb-8">
            <button
              onClick={onScheduleClick}
              className="inline-block px-10 py-4 bg-white text-inst-blue font-semibold text-base rounded-sm hover:-translate-y-0.5 hover:bg-clinical-teal hover:text-white transition-all duration-300"
            >
              {isEs ? 'Agendar Consulta' : 'Schedule Consultation'}
            </button>
            <div className="text-sm text-white/60">
              {languages && languages.length > 0 && (
                <p className="font-medium">{languages.join(' · ')}</p>
              )}
            </div>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap gap-3">
            {[
              { en: 'Verified Physician', es: 'Médico Verificado' },
              { en: 'Medikah Network', es: 'Red Medikah' },
              { en: 'HIPAA Compliant', es: 'Cumple HIPAA' },
            ].map((badge) => (
              <span
                key={badge.en}
                className="inline-flex items-center text-[0.6875rem] font-medium uppercase tracking-[0.04em] text-white/80 bg-white/10 border border-white/20 px-3.5 py-[5px] rounded-lg"
              >
                {isEs ? badge.es : badge.en}
              </span>
            ))}
          </div>
        </FadeInSection>
      </div>
    </section>
  );
}
