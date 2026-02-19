import FadeInSection from './FadeInSection';

interface ProfileCTAProps {
  fullName: string;
  timezone?: string;
  languages?: string[];
  availableHoursStart?: string;
  availableHoursEnd?: string;
  isEs: boolean;
  onScheduleClick: () => void;
}

export default function ProfileCTA({
  fullName,
  timezone,
  languages,
  availableHoursStart,
  availableHoursEnd,
  isEs,
  onScheduleClick,
}: ProfileCTAProps) {
  const firstName = fullName.split(' ')[0];

  return (
    <section className="relative overflow-hidden bg-inst-blue">
      {/* Grain texture */}
      <div
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.012'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-[2] max-w-5xl mx-auto px-6 md:px-8 py-24 md:py-36 text-center">
        <FadeInSection>
          <p className="font-body text-[0.6875rem] font-medium uppercase tracking-[0.25em] text-teal-400 mb-8">
            {isEs ? 'Primera Consulta' : 'First Consultation'}
          </p>

          <h2 className="font-heading text-[clamp(2rem,4vw,3.5rem)] font-medium uppercase leading-[0.95] tracking-[-0.02em] text-white mb-8 max-w-3xl mx-auto">
            {isEs
              ? `Listo para agendar con ${firstName}?`
              : `Ready to schedule with Dr. ${firstName}?`}
          </h2>

          <p className="text-[0.9375rem] text-white/50 leading-[1.7] max-w-[65ch] mx-auto mb-12">
            {isEs
              ? 'Atención sin distancia.'
              : 'Care Without Distance.'}
          </p>

          <button
            onClick={onScheduleClick}
            className="inline-flex items-center justify-center font-body text-[0.8125rem] font-medium uppercase tracking-[0.04em] px-9 py-3.5 bg-teal-500 text-white border-2 border-teal-500 rounded-lg hover:bg-teal-600 hover:border-teal-600 hover:-translate-y-[3px] hover:shadow-[0_12px_32px_rgba(44,122,140,0.3)] transition-all duration-300"
          >
            {isEs ? 'Agendar Consulta' : 'Schedule Consultation'}
          </button>

          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mt-16 pt-8 border-t border-white/[0.06] text-[0.8125rem] text-white/40">
            {timezone && (
              <span>{timezone.replace(/_/g, ' ')}</span>
            )}
            {availableHoursStart && availableHoursEnd && (
              <>
                <span className="hidden sm:inline text-white/20">&middot;</span>
                <span>{availableHoursStart} – {availableHoursEnd}</span>
              </>
            )}
            {languages && languages.length > 0 && (
              <>
                <span className="hidden sm:inline text-white/20">&middot;</span>
                <span>{languages.join(' · ')}</span>
              </>
            )}
          </div>
        </FadeInSection>
      </div>
    </section>
  );
}
