import FadeInSection from './FadeInSection';

interface ProfileAboutProps {
  fullName: string;
  primarySpecialty?: string;
  subSpecialties?: string[];
  bio?: string;
  isEs: boolean;
}

export default function ProfileAbout({
  fullName,
  primarySpecialty,
  subSpecialties,
  bio,
  isEs,
}: ProfileAboutProps) {
  const displayBio = bio || (primarySpecialty
    ? (isEs
        ? `${fullName} es especialista en ${primarySpecialty}${subSpecialties && subSpecialties.length > 0 ? `, con enfoque en ${subSpecialties.join(', ')}` : ''}. Como miembro de la Red de Médicos de Medikah, ofrece atención médica coordinada a pacientes en las Américas.`
        : `${fullName} specializes in ${primarySpecialty}${subSpecialties && subSpecialties.length > 0 ? `, with a focus on ${subSpecialties.join(', ')}` : ''}. As a member of the Medikah Physician Network, they provide coordinated healthcare to patients across the Americas.`)
    : (isEs
        ? `${fullName} es miembro verificado de la Red de Médicos de Medikah, ofreciendo atención médica coordinada a pacientes en las Américas.`
        : `${fullName} is a verified member of the Medikah Physician Network, providing coordinated healthcare to patients across the Americas.`));

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
          <h2 className="font-heading text-[clamp(2rem,4vw,3.5rem)] font-medium uppercase leading-[0.95] tracking-[-0.02em] text-deep-charcoal mb-6 max-w-3xl">
            {isEs ? 'Dedicación a la excelencia clínica' : 'Dedicated to clinical excellence'}
          </h2>
          <p className="text-body-slate leading-[1.7] text-lg max-w-[75ch]">
            {displayBio}
          </p>
        </FadeInSection>
      </div>
    </section>
  );
}
