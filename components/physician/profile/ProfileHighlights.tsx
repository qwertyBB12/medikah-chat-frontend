import FadeInSection from './FadeInSection';

interface ProfileHighlightsProps {
  primarySpecialty?: string;
  subSpecialties?: string[];
  communicationStyle?: string;
  firstConsultExpectation?: string;
  currentInstitutions?: string[];
  boardCertifications?: { board: string; certification: string }[];
  isEs: boolean;
}

const STYLE_COPY: Record<string, { en: string; es: string }> = {
  thorough: {
    en: 'Thorough, evidence-based care',
    es: 'Atencion exhaustiva y basada en evidencia',
  },
  collaborative: {
    en: 'Patient-partnered care',
    es: 'Atencion en colaboracion con el paciente',
  },
  direct: {
    en: 'Clear, direct communication',
    es: 'Comunicacion clara y directa',
  },
  reassuring: {
    en: 'Warm, reassuring care',
    es: 'Atencion calida y tranquilizadora',
  },
};

function cleanText(value?: string | null): string {
  return (value || '').trim().replace(/\s+/g, ' ');
}

export default function ProfileHighlights({
  primarySpecialty,
  subSpecialties,
  communicationStyle,
  firstConsultExpectation,
  currentInstitutions,
  boardCertifications,
  isEs,
}: ProfileHighlightsProps) {
  const t = isEs
    ? {
        sectionLabel: 'Puntos Destacados',
        sectionTitle: 'Lo que define esta atencion',
        specialtyLabel: 'Enfoque de Especialidad',
        approachLabel: 'Mi Enfoque',
        firstVisitLabel: 'Su Primera Visita',
        specialtyFallback: 'Especialidades disponibles durante su consulta.',
        approachFallback: 'Atencion clinica personalizada.',
        firstVisitFallback: 'Agende una consulta para conocer mas.',
      }
    : {
        sectionLabel: 'Highlights',
        sectionTitle: 'What defines this care',
        specialtyLabel: 'Specialty Focus',
        approachLabel: 'My Approach',
        firstVisitLabel: 'Your First Visit',
        specialtyFallback: 'Specialty details available during your consultation.',
        approachFallback: 'Personalized clinical care.',
        firstVisitFallback: 'Schedule a consultation to learn more.',
      };

  const cleanedPrimary = cleanText(primarySpecialty);
  const cleanedSubSpecialties = (subSpecialties || []).map(cleanText).filter(Boolean);
  const boardFallback = (boardCertifications || [])
    .map((cert) => cleanText(cert.certification || cert.board))
    .filter(Boolean)
    .slice(0, 2)
    .join(', ');

  const specialtyFocus = cleanedPrimary && cleanedSubSpecialties.length > 0
    ? `${cleanedPrimary}, ${isEs ? 'con enfoque en' : 'focused on'} ${cleanedSubSpecialties.join(', ')}`
    : cleanedSubSpecialties.join(', ')
      || (boardFallback ? `${cleanedPrimary ? `${cleanedPrimary} · ` : ''}${boardFallback}` : '')
      || cleanedPrimary;
  const hasSpecialtyData = Boolean(cleanedPrimary || cleanedSubSpecialties.length > 0 || boardFallback);

  const styleKey = cleanText(communicationStyle).toLowerCase();
  const styleCopy = STYLE_COPY[styleKey];
  const firstInstitution = cleanText(currentInstitutions?.[0]);
  const approachText = (isEs ? styleCopy?.es : styleCopy?.en) || firstInstitution || t.approachFallback;
  const hasApproachData = Boolean(styleCopy || firstInstitution);

  const firstVisitText = cleanText(firstConsultExpectation) || t.firstVisitFallback;
  const hasFirstVisitData = Boolean(cleanText(firstConsultExpectation));

  if (!hasSpecialtyData && !hasApproachData && !hasFirstVisitData) {
    return null;
  }

  return (
    <section className="bg-linen-warm py-16 md:py-20">
      <div className="max-w-5xl mx-auto px-6 md:px-8">
        <FadeInSection>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-px bg-teal-500" />
            <p className="font-body text-[0.6875rem] font-medium uppercase tracking-[0.25em] text-teal-500">
              {t.sectionLabel}
            </p>
          </div>
          <h2 className="font-heading text-[clamp(1.8rem,3.6vw,2.75rem)] font-medium uppercase leading-[0.95] tracking-[-0.02em] text-deep-charcoal mb-10 max-w-3xl">
            {t.sectionTitle}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <article className="bg-linen-white border border-warm-gray-800/[0.06] border-t-2 border-t-teal-500 rounded-lg p-8">
              <p className="font-body text-[0.625rem] font-medium uppercase tracking-[0.2em] text-teal-500 mb-3">
                {t.specialtyLabel}
              </p>
              <p className="font-dm-sans text-base leading-[1.7] text-body-slate">
                {specialtyFocus || t.specialtyFallback}
              </p>
            </article>

            <article className="bg-linen-white border border-warm-gray-800/[0.06] border-t-2 border-t-teal-500 rounded-lg p-8">
              <p className="font-body text-[0.625rem] font-medium uppercase tracking-[0.2em] text-teal-500 mb-3">
                {t.approachLabel}
              </p>
              <p className="font-dm-sans text-base leading-[1.7] text-body-slate">
                {approachText}
              </p>
            </article>

            <article className="bg-linen-white border border-warm-gray-800/[0.06] border-t-2 border-t-teal-500 rounded-lg p-8">
              <p className="font-body text-[0.625rem] font-medium uppercase tracking-[0.2em] text-teal-500 mb-3">
                {t.firstVisitLabel}
              </p>
              <p className="font-dm-sans text-base leading-[1.7] text-body-slate">
                {firstVisitText}
              </p>
            </article>
          </div>
        </FadeInSection>
      </div>
    </section>
  );
}
