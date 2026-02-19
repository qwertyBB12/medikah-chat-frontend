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
    <section className="py-24 md:py-36">
      <div className="max-w-5xl mx-auto px-6 md:px-8">
        <FadeInSection>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-px bg-teal-500" />
            <p className="font-body text-[0.6875rem] font-medium uppercase tracking-[0.25em] text-teal-500">
              {isEs ? 'Servicios' : 'Services'}
            </p>
          </div>
          <h2 className="font-heading text-[clamp(2rem,4vw,3.5rem)] font-medium uppercase leading-[0.95] tracking-[-0.02em] text-deep-charcoal mb-16 max-w-3xl">
            {isEs ? 'Lo que ofrezco' : 'What I offer'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.slice(0, 6).map((service, i) => (
              <article
                key={i}
                className="bg-linen-white border border-warm-gray-800/[0.06] rounded-lg p-8 transition-all duration-400 hover:-translate-y-1.5 hover:shadow-[0_20px_48px_rgba(27,42,65,0.1)]"
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
