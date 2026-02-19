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
    <section className="relative overflow-hidden bg-inst-blue">
      {/* Grain texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.012'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-[2] max-w-5xl mx-auto px-6 md:px-8 py-24 md:py-36">
        <FadeInSection>
          <p className="text-[13px] uppercase tracking-[0.15em] text-[#C4A57B] font-semibold mb-4">
            {isEs ? 'Credenciales Clínicas' : 'Clinical Credentials'}
          </p>
          <h2 className="font-heading text-4xl md:text-5xl font-bold tracking-[-0.025em] text-white mb-6 max-w-3xl">
            {isEs ? 'Formado para la excelencia' : 'Trained for excellence'}
          </h2>
          <p className="text-lg text-white/80 leading-[1.7] max-w-[75ch] mb-16">
            {isEs
              ? 'Cada credencial representa un compromiso con estándares clínicos que priorizan seguridad, evidencia y resultados.'
              : 'Each credential represents a commitment to clinical standards that prioritize safety, evidence, and outcomes.'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {columns.map((c) => (
              <div
                key={c.num}
                className="bg-white/[0.07] border border-white/[0.12] backdrop-blur-sm rounded-[12px] p-10"
              >
                <div className="w-12 h-12 rounded-full bg-[#C4A57B]/20 flex items-center justify-center mb-6">
                  <span className="text-[#C4A57B] font-bold text-lg">{c.num}</span>
                </div>
                <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-white/50 mb-2">
                  {c.label}
                </p>
                <h3 className="text-xl font-bold text-white mb-3 tracking-[-0.01em]">
                  {c.title}
                </h3>
                <p className="text-[15px] text-white/70 leading-[1.7]">{c.detail}</p>
              </div>
            ))}
          </div>
        </FadeInSection>
      </div>
    </section>
  );
}
