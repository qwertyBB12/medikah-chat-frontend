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
    <section className="bg-linen py-24 md:py-36">
      <div className="max-w-5xl mx-auto px-6 md:px-8">
        <FadeInSection>
          <p className="text-[13px] uppercase tracking-[0.15em] text-clinical-teal font-semibold mb-4">
            {isEs ? 'Especialidades' : 'Specialties'}
          </p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-[-0.025em] text-inst-blue mb-16 max-w-3xl">
            {isEs ? 'Areas de experiencia' : 'Areas of expertise'}
          </h2>

          {primarySpecialty && (
            <div className="mb-8">
              <article className="bg-white rounded-[12px] p-10 shadow-[0_2px_8px_rgba(27,42,65,0.08),0_16px_48px_rgba(27,42,65,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_4px_8px_rgba(27,42,65,0.08),0_20px_40px_rgba(27,42,65,0.08)]">
                <p className="text-[13px] uppercase tracking-[0.15em] text-clinical-teal font-semibold mb-3">
                  {isEs ? 'Especialidad Principal' : 'Primary Specialty'}
                </p>
                <h3 className="font-bold text-xl text-inst-blue tracking-[-0.01em]">
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
                  className="bg-white rounded-[12px] p-10 shadow-[0_1px_3px_rgba(27,42,65,0.06),0_8px_24px_rgba(27,42,65,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_4px_8px_rgba(27,42,65,0.08),0_20px_40px_rgba(27,42,65,0.08)]"
                >
                  <h3 className="font-bold text-lg text-inst-blue tracking-[-0.01em]">
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
