import FadeInSection from './FadeInSection';

interface Props {
  practicePhilosophy?: string;
  valuePillars?: { title: string; description: string }[];
  isEs: boolean;
}

export default function WebsitePracticePhilosophy({
  practicePhilosophy,
  valuePillars,
  isEs,
}: Props) {
  if (!practicePhilosophy && (!valuePillars || valuePillars.length === 0)) {
    return null;
  }

  return (
    <section className="py-24 md:py-36">
      <div className="max-w-5xl mx-auto px-6 md:px-8">
        <FadeInSection>
          <p className="text-[13px] uppercase tracking-[0.15em] text-clinical-teal font-semibold mb-4">
            {isEs ? 'Filosofía de Práctica' : 'Practice Philosophy'}
          </p>
          <h2 className="font-heading text-4xl md:text-5xl font-bold tracking-[-0.025em] text-inst-blue mb-8 max-w-3xl">
            {isEs ? 'Mi enfoque clínico' : 'My clinical approach'}
          </h2>

          {practicePhilosophy && (
            <p className="text-body-slate leading-[1.7] text-lg max-w-[75ch] mb-12">
              {practicePhilosophy}
            </p>
          )}

          {valuePillars && valuePillars.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {valuePillars.slice(0, 3).map((pillar, i) => (
                <article
                  key={i}
                  className="bg-white rounded-[12px] p-8 shadow-[0_1px_3px_rgba(27,42,65,0.06),0_8px_24px_rgba(27,42,65,0.04)]"
                >
                  <h3 className="font-dm-sans font-bold text-xl text-deep-charcoal mb-3">
                    {pillar.title}
                  </h3>
                  <p className="font-dm-sans text-sm text-body-slate leading-relaxed">
                    {pillar.description}
                  </p>
                </article>
              ))}
            </div>
          )}
        </FadeInSection>
      </div>
    </section>
  );
}
