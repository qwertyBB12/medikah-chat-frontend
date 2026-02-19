import FadeInSection from './FadeInSection';
import { DAYS_OF_WEEK } from '../../../lib/physicianOnboardingContent';

interface ProfileAvailabilityProps {
  availableDays?: string[];
  availableHoursStart?: string;
  availableHoursEnd?: string;
  timezone?: string;
  languages?: string[];
  currentInstitutions?: string[];
  isEs: boolean;
}

export default function ProfileAvailability({
  availableDays,
  availableHoursStart,
  availableHoursEnd,
  timezone,
  languages,
  currentInstitutions,
  isEs,
}: ProfileAvailabilityProps) {
  const hasDays = availableDays && availableDays.length > 0;
  const hasHours = availableHoursStart && availableHoursEnd;
  const hasLanguages = languages && languages.length > 0;
  const hasInstitutions = currentInstitutions && currentInstitutions.length > 0;

  if (!hasDays && !hasHours && !timezone && !hasLanguages && !hasInstitutions) {
    return null;
  }

  function getDayLabel(dayValue: string): string {
    const day = DAYS_OF_WEEK.find((d) => d.value === dayValue);
    if (!day) return dayValue;
    return isEs ? day.es : day.en;
  }

  return (
    <section className="bg-linen-warm py-24 md:py-36">
      <div className="max-w-5xl mx-auto px-6 md:px-8">
        <FadeInSection>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-px bg-teal-500" />
            <p className="font-body text-[0.6875rem] font-medium uppercase tracking-[0.25em] text-teal-500">
              {isEs ? 'Práctica y Disponibilidad' : 'Practice & Availability'}
            </p>
          </div>
          <h2 className="font-heading text-[clamp(2rem,4vw,3.5rem)] font-medium uppercase leading-[0.95] tracking-[-0.02em] text-deep-charcoal mb-16 max-w-3xl">
            {isEs ? 'Cómo agendar' : 'How to schedule'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {hasDays && (
              <div className="bg-linen-white border border-warm-gray-800/[0.06] rounded-lg p-8">
                <h3 className="font-bold text-lg text-deep-charcoal mb-4">
                  {isEs ? 'Días Disponibles' : 'Available Days'}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {availableDays!.map((day) => (
                    <span
                      key={day}
                      className="px-4 py-2 bg-teal-500/[0.08] text-teal-500 font-semibold text-sm rounded-full"
                    >
                      {getDayLabel(day)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {hasHours && (
              <div className="bg-linen-white border border-warm-gray-800/[0.06] rounded-lg p-8">
                <h3 className="font-bold text-lg text-deep-charcoal mb-4">
                  {isEs ? 'Horario' : 'Hours'}
                </h3>
                <p className="text-body-slate text-lg">
                  {availableHoursStart} – {availableHoursEnd}
                </p>
                {timezone && (
                  <p className="text-archival-grey text-sm mt-1">
                    {timezone.replace(/_/g, ' ')}
                  </p>
                )}
              </div>
            )}

            {hasLanguages && (
              <div className="bg-linen-white border border-warm-gray-800/[0.06] rounded-lg p-8">
                <h3 className="font-bold text-lg text-deep-charcoal mb-4">
                  {isEs ? 'Idiomas' : 'Languages'}
                </h3>
                <p className="text-body-slate text-lg">{languages!.join(', ')}</p>
              </div>
            )}

            {hasInstitutions && (
              <div className="bg-linen-white border border-warm-gray-800/[0.06] rounded-lg p-8">
                <h3 className="font-bold text-lg text-deep-charcoal mb-4">
                  {isEs ? 'Afiliaciones' : 'Affiliations'}
                </h3>
                <ul className="space-y-2">
                  {currentInstitutions!.map((inst, i) => (
                    <li key={i} className="text-body-slate text-lg">{inst}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </FadeInSection>
      </div>
    </section>
  );
}
