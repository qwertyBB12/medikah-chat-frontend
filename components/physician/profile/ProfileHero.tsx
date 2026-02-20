import Image from 'next/image';
import FadeInSection from './FadeInSection';

interface ProfileHeroProps {
  fullName: string;
  photoUrl?: string;
  tagline?: string;
  primarySpecialty?: string;
  languages?: string[];
  timezone?: string;
  isEs: boolean;
  onScheduleClick: () => void;
}

export default function ProfileHero({
  fullName,
  photoUrl,
  tagline,
  primarySpecialty,
  languages,
  timezone,
  isEs,
  onScheduleClick,
}: ProfileHeroProps) {
  return (
    <section
      className="relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #1B2A41 0%, #0D1520 100%)' }}
    >
      {/* Grain texture */}
      <div
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.012'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-[2] max-w-5xl mx-auto px-6 md:px-8 pt-28 pb-20 md:pt-32 md:pb-28">
        <FadeInSection>
          <div className="flex items-start justify-between mb-12">
            <div className="flex-1">
              {/* Eyebrow */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-px bg-teal-500" />
                <span className="font-body text-[0.6875rem] font-medium uppercase tracking-[0.25em] text-teal-400">
                  {primarySpecialty || (isEs ? 'Médico' : 'Physician')}
                  {timezone && ` · ${timezone.replace('America/', '').replace(/_/g, ' ')}`}
                </span>
              </div>

              <h1 className="font-heading text-[clamp(2.5rem,8vw,4.5rem)] font-medium uppercase tracking-[-0.02em] leading-[0.95] text-white">
                {fullName}
              </h1>
              {tagline && tagline.trim().length > 0 && (
                <p className="text-white/60 text-lg font-body mt-3">{tagline}</p>
              )}
            </div>

            {photoUrl && (
              <div className="hidden lg:block shrink-0 ml-8">
                <div className="relative w-36 h-36 rounded-full overflow-hidden ring-4 ring-teal-400 ring-offset-4 ring-offset-warm-gray-900">
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
              <div className="relative w-36 h-36 rounded-full overflow-hidden ring-4 ring-teal-400 ring-offset-4 ring-offset-warm-gray-900">
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

          <div className="flex flex-wrap items-center gap-6 mb-8">
            <button
              onClick={onScheduleClick}
              className="inline-flex items-center gap-2 font-body text-[0.8125rem] font-medium uppercase tracking-[0.04em] px-9 py-3.5 bg-teal-500 text-white border-2 border-teal-500 rounded-lg hover:bg-teal-600 hover:border-teal-600 hover:-translate-y-[3px] hover:shadow-[0_12px_32px_rgba(44,122,140,0.3)] transition-all duration-300"
            >
              {isEs ? 'Agendar Consulta' : 'Schedule Consultation'}
            </button>
            {languages && languages.length > 0 && (
              <p className="text-sm text-white/50 font-medium">{languages.join(' · ')}</p>
            )}
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
                className="inline-flex items-center text-[0.6875rem] font-medium uppercase tracking-[0.04em] text-teal-300 bg-[rgba(44,122,140,0.15)] px-3.5 py-[5px] rounded-lg"
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
