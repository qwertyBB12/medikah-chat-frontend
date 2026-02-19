import FadeInSection from './FadeInSection';

interface Props {
  services?: { title: string; description: string; icon?: string }[];
  isEs: boolean;
}

export default function WebsiteServices({ services, isEs }: Props) {
  if (!services || services.length === 0) {
    return null;
  }

  return (
    <section className="bg-linen py-24 md:py-36">
      <div className="max-w-5xl mx-auto px-6 md:px-8">
        <FadeInSection>
          <p className="text-[13px] uppercase tracking-[0.15em] text-clinical-teal font-semibold mb-4">
            {isEs ? 'Servicios' : 'Services'}
          </p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-[-0.025em] text-inst-blue mb-16 max-w-3xl">
            {isEs ? 'Lo que ofrezco' : 'What I offer'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.slice(0, 6).map((service, i) => (
              <article
                key={i}
                className="bg-white rounded-[12px] border border-border-line p-8 shadow-[0_1px_3px_rgba(27,42,65,0.06),0_8px_24px_rgba(27,42,65,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_4px_8px_rgba(27,42,65,0.08),0_20px_40px_rgba(27,42,65,0.08)]"
              >
                <h3 className="font-dm-sans font-bold text-xl text-deep-charcoal mb-3">
                  {service.title}
                </h3>
                <p className="font-dm-sans text-sm text-body-slate leading-relaxed">
                  {service.description}
                </p>
              </article>
            ))}
          </div>
        </FadeInSection>
      </div>
    </section>
  );
}
