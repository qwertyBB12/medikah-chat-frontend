const PORTALS = [
  {
    title: 'Patient Coordination',
    description:
      'Access care across borders. Medical history travels with you. Coverage remains transparent. Continuity maintained across jurisdictions.',
  },
  {
    title: 'Physician Network',
    description:
      'Practice across jurisdictions within clear regulatory frameworks. Credentialed, licensed, supported. Clinical relationships without bureaucratic barriers.',
  },
  {
    title: 'Insurance Integration',
    description:
      'Connect products across borders. Define coverage logic. Coordinate eligibility transparently. Cross-border compatibility by design.',
  },
  {
    title: 'Corporate Partnerships',
    description:
      'Manage workforce health across the Americas. Group coverage. Compliance reporting. Institutional standards maintained.',
  },
];

export default function Architecture() {
  return (
    <section id="architecture" className="bg-gradient-to-b from-clinical-surface to-white px-6 py-24 sm:py-[100px]">
      <div className="max-w-[1200px] mx-auto">
        <h2 className="font-extrabold text-4xl md:text-[56px] text-inst-blue text-center mb-12 leading-[1.15] tracking-[-0.01em]">
          Coordination Architecture
        </h2>

        <p className="text-lg text-body-slate leading-[1.7] text-center max-w-[800px] mx-auto mb-14">
          Medikah coordinates care through four institutional interfaces, each serving
          a distinct role in cross-border healthcare delivery.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-14">
          {PORTALS.map((portal) => (
            <div
              key={portal.title}
              className="bg-white shadow-[0_1px_3px_rgba(27,42,65,0.06),0_8px_24px_rgba(27,42,65,0.04)] rounded-[12px] p-10 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_6px_rgba(27,42,65,0.08),0_16px_32px_rgba(27,42,65,0.06)]"
            >
              <h3 className="font-extrabold text-2xl text-clinical-teal mb-4 leading-[1.3]">
                {portal.title}
              </h3>
              <p className="text-base text-body-slate leading-relaxed">
                {portal.description}
              </p>
            </div>
          ))}
        </div>

        <p className="font-semibold text-lg text-deep-charcoal text-center max-w-[700px] mx-auto leading-relaxed">
          Together, these interfaces enable compliant, coordinated care&mdash;without
          replacing existing systems.
        </p>
      </div>
    </section>
  );
}
