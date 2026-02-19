import FadeInSection from './FadeInSection';

interface SpecialtiesGridProps {
  primarySpecialty?: string;
  subSpecialties?: string[];
  isEs: boolean;
}

export default function SpecialtiesGrid({
  primarySpecialty,
  subSpecialties,
  isEs,
}: SpecialtiesGridProps) {
  if (!primarySpecialty && (!subSpecialties || subSpecialties.length === 0)) {
    return null;
  }

  return (
    <section className="bg-linen-warm py-24 md:py-36">
      <div className="max-w-5xl mx-auto px-6 md:px-8">
        <FadeInSection>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-px bg-teal-500" />
            <p className="font-body text-[0.6875rem] font-medium uppercase tracking-[0.25em] text-teal-500">
              {isEs ? 'Especialidades' : 'Specialties'}
            </p>
          </div>
          <h2 className="font-heading text-[clamp(2rem,4vw,3.5rem)] font-medium uppercase leading-[0.95] tracking-[-0.02em] text-deep-charcoal mb-16 max-w-3xl">
            {isEs ? 'Areas de experiencia' : 'Areas of expertise'}
          </h2>

          {primarySpecialty && (
            <div className="mb-8">
              <article className="bg-linen-white border border-warm-gray-800/[0.06] border-l-4 border-l-teal-500 rounded-lg p-10 transition-all duration-400 hover:-translate-y-1.5 hover:shadow-[0_20px_48px_rgba(27,42,65,0.1)]">
                <p className="font-body text-[0.6875rem] font-medium uppercase tracking-[0.25em] text-teal-500 mb-3">
                  {isEs ? 'Especialidad Principal' : 'Primary Specialty'}
                </p>
                <h3 className="font-heading text-[1.25rem] font-medium uppercase tracking-[0.02em] text-deep-charcoal">
                  {primarySpecialty}
                </h3>
              </article>
            </div>
          )}

          {subSpecialties && subSpecialties.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {subSpecialties.map((sub, i) => (
                <article
                  key={i}
                  className="bg-linen-white border border-warm-gray-800/[0.06] border-t-2 border-t-teal-500/30 rounded-lg p-10 transition-all duration-400 hover:-translate-y-1.5 hover:shadow-[0_20px_48px_rgba(27,42,65,0.1)]"
                >
                  <h3 className="font-heading text-lg font-medium uppercase tracking-[0.02em] text-deep-charcoal">
                    {sub}
                  </h3>
                </article>
              ))}
            </div>
          )}
        </FadeInSection>
      </div>
    </section>
  );
}
