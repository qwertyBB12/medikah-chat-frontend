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
    <section
      className="relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #1B2A41 0%, #0D1520 100%)' }}
    >
      {/* Grain texture */}
      <div
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.012'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-[2] max-w-5xl mx-auto px-6 md:px-8 py-24 md:py-36">
        <FadeInSection>
          {/* Eyebrow */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-px bg-teal-500" />
            <span className="font-body text-[0.6875rem] font-medium uppercase tracking-[0.25em] text-teal-400">
              {isEs ? 'Credenciales Clínicas' : 'Clinical Credentials'}
            </span>
          </div>

          <h2 className="font-heading text-[clamp(2rem,4vw,3.5rem)] font-medium uppercase leading-[0.95] tracking-[-0.02em] text-white mb-6 max-w-3xl">
            {isEs ? 'Formado para la excelencia' : 'Trained for excellence'}
          </h2>
          <p className="text-[0.9375rem] text-white/50 leading-[1.7] max-w-[75ch] mb-16">
            {isEs
              ? 'Cada credencial representa un compromiso con estándares clínicos que priorizan seguridad, evidencia y resultados.'
              : 'Each credential represents a commitment to clinical standards that prioritize safety, evidence, and outcomes.'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-[clamp(1.5rem,3vw,2.5rem)]">
            {columns.map((c) => (
              <div
                key={c.num}
                className="bg-[rgba(27,42,65,0.4)] backdrop-blur-[8px] border border-white/[0.06] border-t-[3px] border-t-teal-500 rounded-lg p-[clamp(2rem,3vw,3rem)] transition-all duration-400 hover:border-white/[0.1] hover:border-t-teal-400 hover:-translate-y-1"
              >
                <span className="font-heading text-[clamp(1.5rem,2.5vw,2rem)] font-medium text-teal-400 leading-none mb-6 block">
                  {c.num}
                </span>
                <p className="text-[0.625rem] font-medium uppercase tracking-[0.2em] text-teal-300 mb-4">
                  {c.label}
                </p>
                <h3 className="font-heading text-[clamp(1.25rem,2vw,1.5rem)] font-medium uppercase leading-[1.05] text-white mb-4">
                  {c.title}
                </h3>
                <p className="text-[0.9375rem] leading-[1.8] text-white/50">{c.detail}</p>
              </div>
            ))}
          </div>
        </FadeInSection>
      </div>
    </section>
  );
}
