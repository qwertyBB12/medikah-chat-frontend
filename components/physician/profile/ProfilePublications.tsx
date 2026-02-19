import FadeInSection from './FadeInSection';

interface ProfilePublicationsProps {
  publications?: { title: string; journal?: string; year?: number; url?: string }[];
  isEs: boolean;
}

export default function ProfilePublications({ publications, isEs }: ProfilePublicationsProps) {
  if (!publications || publications.length === 0) {
    return null;
  }

  return (
    <section className="bg-linen-warm py-24 md:py-36">
      <div className="max-w-5xl mx-auto px-6 md:px-8">
        <FadeInSection>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-px bg-teal-500" />
            <p className="font-body text-[0.6875rem] font-medium uppercase tracking-[0.25em] text-teal-500">
              {isEs ? 'Contribuciones a la Medicina' : 'Contributions to Medicine'}
            </p>
          </div>
          <h2 className="font-heading text-[clamp(2rem,4vw,3.5rem)] font-medium uppercase leading-[0.95] tracking-[-0.02em] text-deep-charcoal mb-16 max-w-3xl">
            {isEs ? 'Publicaciones' : 'Publications'}
          </h2>

          <div className="space-y-6">
            {publications.map((pub, i) => (
              <div
                key={i}
                className="bg-linen-white border border-warm-gray-800/[0.06] rounded-lg p-8"
              >
                <h3 className="font-bold text-lg text-deep-charcoal mb-2 tracking-[-0.01em]">
                  {pub.url ? (
                    <a
                      href={pub.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-teal-500 transition-colors"
                    >
                      {pub.title}
                    </a>
                  ) : (
                    pub.title
                  )}
                </h3>
                <p className="text-body-slate text-[15px]">
                  {[pub.journal, pub.year].filter(Boolean).join(' · ')}
                </p>
              </div>
            ))}
          </div>
        </FadeInSection>
      </div>
    </section>
  );
}
