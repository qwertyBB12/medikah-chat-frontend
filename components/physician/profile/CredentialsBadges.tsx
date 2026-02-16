import FadeInSection from './FadeInSection';

interface CredentialsBadgesProps {
  medicalSchool?: string;
  medicalSchoolCountry?: string;
  graduationYear?: number;
  residency?: { institution: string; specialty: string; startYear: number; endYear: number }[];
  fellowships?: { institution: string; specialty: string; startYear: number; endYear: number }[];
  boardCertifications?: { board: string; certification: string; year?: number }[];
  isEs: boolean;
}

export default function CredentialsBadges({
  medicalSchool,
  medicalSchoolCountry,
  graduationYear,
  residency,
  fellowships,
  boardCertifications,
  isEs,
}: CredentialsBadgesProps) {
  const hasEducation = medicalSchool;
  const hasTraining = (residency && residency.length > 0) || (fellowships && fellowships.length > 0);
  const hasCerts = boardCertifications && boardCertifications.length > 0;

  if (!hasEducation && !hasTraining && !hasCerts) {
    return null;
  }

  const columns: { num: string; label: string; title: string; detail: string }[] = [];

  if (hasEducation) {
    columns.push({
      num: '01',
      label: isEs ? 'Formación Médica' : 'Medical Education',
      title: medicalSchool || '',
      detail: [
        medicalSchoolCountry,
        graduationYear ? (isEs ? `Graduación ${graduationYear}` : `Class of ${graduationYear}`) : '',
      ]
        .filter(Boolean)
        .join(' · '),
    });
  }

  if (hasTraining) {
    const items: string[] = [];
    residency?.forEach((r) => {
      items.push(`${r.institution} — ${r.specialty} (${r.startYear}–${r.endYear})`);
    });
    fellowships?.forEach((f) => {
      items.push(`${f.institution} — ${f.specialty} (${f.startYear}–${f.endYear})`);
    });
    columns.push({
      num: String(columns.length + 1).padStart(2, '0'),
      label: isEs ? 'Residencia y Fellowship' : 'Residency & Fellowship',
      title: residency?.[0]?.institution || fellowships?.[0]?.institution || '',
      detail: items.join('. '),
    });
  }

  if (hasCerts) {
    columns.push({
      num: String(columns.length + 1).padStart(2, '0'),
      label: isEs ? 'Certificaciones' : 'Board Certifications',
      title: boardCertifications![0].board,
      detail: boardCertifications!
        .map((c) => `${c.certification}${c.year ? ` (${c.year})` : ''}`)
        .join(', '),
    });
  }

  return (
    <section className="bg-linen py-24 md:py-36">
      <div className="max-w-5xl mx-auto px-6 md:px-8">
        <FadeInSection>
          <p className="text-[13px] uppercase tracking-[0.15em] text-clinical-teal font-semibold mb-4">
            {isEs ? 'Credenciales Clínicas' : 'Clinical Credentials'}
          </p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-[-0.025em] text-inst-blue mb-6 max-w-3xl">
            {isEs ? 'Formado para la excelencia' : 'Trained for excellence'}
          </h2>
          <p className="text-lg text-body-slate leading-[1.7] max-w-[75ch] mb-16">
            {isEs
              ? 'Cada credencial representa un compromiso con estándares clínicos que priorizan seguridad, evidencia y resultados.'
              : 'Each credential represents a commitment to clinical standards that prioritize safety, evidence, and outcomes.'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {columns.map((c) => (
              <div
                key={c.num}
                className="bg-white rounded-[12px] p-10 shadow-[0_1px_3px_rgba(27,42,65,0.06),0_8px_24px_rgba(27,42,65,0.04)]"
              >
                <div className="w-12 h-12 rounded-full bg-clinical-teal/10 flex items-center justify-center mb-6">
                  <span className="text-clinical-teal font-bold text-lg">{c.num}</span>
                </div>
                <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-archival-grey mb-2">
                  {c.label}
                </p>
                <h3 className="text-xl font-bold text-inst-blue mb-3 tracking-[-0.01em]">
                  {c.title}
                </h3>
                <p className="text-[15px] text-body-slate leading-[1.7]">{c.detail}</p>
              </div>
            ))}
          </div>
        </FadeInSection>
      </div>
    </section>
  );
}
