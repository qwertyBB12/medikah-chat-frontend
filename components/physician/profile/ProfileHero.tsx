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
    <section className="bg-white border-b border-border-line">
      <div className="max-w-5xl mx-auto px-6 md:px-8 py-20 md:py-28">
        <FadeInSection>
          <div className="flex items-start justify-between mb-12">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-[2px] bg-[#C4A57B]" />
                <span className="text-[13px] font-semibold tracking-[0.15em] text-clinical-teal uppercase">
                  {primarySpecialty || (isEs ? 'Médico' : 'Physician')}
                  {timezone && ` · ${timezone.replace('America/', '').replace(/_/g, ' ')}`}
                </span>
              </div>

              <h1 className="text-4xl md:text-5xl font-bold tracking-[-0.025em] text-inst-blue mb-8">
                {fullName}
              </h1>
            </div>

            {photoUrl && (
              <div className="hidden lg:block shrink-0 ml-8">
                <div className="relative w-28 h-28 rounded-full overflow-hidden ring-4 ring-clinical-teal ring-offset-4">
                  <Image
                    src={photoUrl}
                    alt={fullName}
                    fill
                    className="object-cover"
                    sizes="112px"
                  />
                </div>
              </div>
            )}
          </div>

          {photoUrl && (
            <div className="flex justify-center mb-10 lg:hidden">
              <div className="relative w-32 h-32 rounded-full overflow-hidden ring-4 ring-clinical-teal ring-offset-4">
                <Image
                  src={photoUrl}
                  alt={fullName}
                  fill
                  className="object-cover"
                  sizes="128px"
                />
              </div>
            </div>
          )}

          {credentials.length > 0 && (
            <div className="space-y-5 mb-12 max-w-3xl">
              {credentials.map((c, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="w-1 h-6 bg-[#C4A57B] mt-1.5 shrink-0" />
                  <p className="text-lg text-body-slate leading-relaxed">
                    <strong className="font-semibold text-inst-blue">{c.bold}</strong>
                    {c.detail && ` — ${c.detail}`}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-6">
            <button
              onClick={onScheduleClick}
              className="inline-block px-10 py-4 bg-inst-blue text-white font-semibold text-base rounded-sm hover:-translate-y-0.5 hover:bg-clinical-teal transition-all duration-300"
            >
              {isEs ? 'Agendar Consulta' : 'Schedule Consultation'}
            </button>
            <div className="text-sm text-archival-grey">
              {languages && languages.length > 0 && (
                <p className="font-medium">{languages.join(' · ')}</p>
              )}
            </div>
          </div>
        </FadeInSection>
      </div>
    </section>
  );
}
