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
          <p className="text-[13px] uppercase tracking-[0.15em] text-clinical-teal font-semibold mb-4">
            {isEs ? 'Sobre' : 'About'}
          </p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-[-0.025em] text-inst-blue mb-6 max-w-3xl">
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
