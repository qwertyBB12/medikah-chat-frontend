import FadeInSection from './FadeInSection';

interface ProfileAboutProps {
  fullName: string;
  primarySpecialty?: string;
  subSpecialties?: string[];
  bio?: string;
  approvedBioEn?: string;
  approvedBioEs?: string;
  generatedBioEn?: string;
  generatedBioEs?: string;
  narrativeStatus?: 'pending' | 'collected' | 'generated' | 'approved' | null;
  isEs: boolean;
}

function extractPullQuote(paragraph: string): { quote: string; attribution?: string } | null {
  const match = paragraph.match(/^[“"](.+?)[”"]\s*(?:—|-)\s*(.+)$/);
  if (!match) return null;
  return {
    quote: match[1].trim(),
    attribution: match[2].trim(),
  };
}

export default function ProfileAbout({
  fullName,
  primarySpecialty,
  subSpecialties,
  bio,
  approvedBioEn,
  approvedBioEs,
  generatedBioEn,
  generatedBioEs,
  narrativeStatus,
  isEs,
}: ProfileAboutProps) {
  const approvedBio = (isEs ? approvedBioEs : approvedBioEn)?.trim() || '';
  const generatedBio = narrativeStatus === 'approved'
    ? (isEs ? generatedBioEs : generatedBioEn)?.trim() || ''
    : '';
  const fallbackBio = primarySpecialty
    ? (isEs
        ? `${fullName} es especialista en ${primarySpecialty}${subSpecialties && subSpecialties.length > 0 ? `, con enfoque en ${subSpecialties.join(', ')}` : ''}. Como miembro de la Red de Médicos de Medikah, ofrece atención médica coordinada a pacientes en las Américas.`
        : `${fullName} specializes in ${primarySpecialty}${subSpecialties && subSpecialties.length > 0 ? `, with a focus on ${subSpecialties.join(', ')}` : ''}. As a member of the Medikah Physician Network, they provide coordinated healthcare to patients across the Americas.`)
    : (isEs
        ? `${fullName} es miembro verificado de la Red de Médicos de Medikah, ofreciendo atención médica coordinada a pacientes en las Américas.`
        : `${fullName} is a verified member of the Medikah Physician Network, providing coordinated healthcare to patients across the Americas.`);
  const displayBio = approvedBio || generatedBio || bio || fallbackBio;
  const richBio = approvedBio || generatedBio;
  const paragraphs = richBio
    ? richBio.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean)
    : [displayBio];

  return (
    <section className="py-24 md:py-36">
      <div className="max-w-5xl mx-auto px-6 md:px-8">
        <FadeInSection>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-px bg-teal-500" />
            <p className="font-body text-[0.6875rem] font-medium uppercase tracking-[0.25em] text-teal-500">
              {isEs ? 'Sobre' : 'About'}
            </p>
          </div>
          <h2 className="font-heading text-[clamp(2.25rem,5vw,4rem)] font-medium uppercase leading-[0.95] tracking-[-0.02em] text-deep-charcoal mb-6 max-w-4xl">
            {isEs ? 'Dedicación a la excelencia clínica' : 'Dedicated to clinical excellence'}
          </h2>
          <div className="space-y-5">
            {paragraphs.map((paragraph, index) => {
              const pullQuote = extractPullQuote(paragraph);
              if (pullQuote) {
                return (
                  <blockquote
                    key={`${index}-${pullQuote.quote.slice(0, 24)}`}
                    className="max-w-[75ch] border-l-4 border-l-teal-500 pl-5 py-1"
                  >
                    <p className="text-deep-charcoal italic text-[1.125rem] leading-[1.7]">
                      {`"${pullQuote.quote}"`}
                    </p>
                    {pullQuote.attribution && (
                      <cite className="mt-2 block text-[0.875rem] not-italic text-body-slate">
                        {pullQuote.attribution}
                      </cite>
                    )}
                  </blockquote>
                );
              }

              return (
                <p key={`${index}-${paragraph.slice(0, 24)}`} className="text-body-slate leading-[1.7] text-lg max-w-[75ch]">
                  {paragraph}
                </p>
              );
            })}
          </div>
        </FadeInSection>
      </div>
    </section>
  );
}
