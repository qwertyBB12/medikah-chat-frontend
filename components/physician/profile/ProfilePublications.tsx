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
    <section className="py-24 md:py-36">
      <div className="max-w-5xl mx-auto px-6 md:px-8">
        <FadeInSection>
          <p className="text-[13px] uppercase tracking-[0.15em] text-clinical-teal font-semibold mb-4">
            {isEs ? 'Contribuciones a la Medicina' : 'Contributions to Medicine'}
          </p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-[-0.025em] text-inst-blue mb-16 max-w-3xl">
            {isEs ? 'Publicaciones' : 'Publications'}
          </h2>

          <div className="space-y-6">
            {publications.map((pub, i) => (
              <div
                key={i}
                className="bg-white rounded-[12px] p-8 shadow-[0_1px_3px_rgba(27,42,65,0.06),0_8px_24px_rgba(27,42,65,0.04)]"
              >
                <h3 className="font-bold text-lg text-inst-blue mb-2 tracking-[-0.01em]">
                  {pub.url ? (
                    <a
                      href={pub.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-clinical-teal transition-colors"
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
