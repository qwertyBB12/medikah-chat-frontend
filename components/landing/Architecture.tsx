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
    <section id="architecture" className="bg-clinical-surface px-6 py-24 sm:py-[100px]">
      <div className="max-w-[900px] mx-auto">
        <h2 className="font-bold text-4xl md:text-5xl text-inst-blue text-center mb-6">
          Coordination Architecture
        </h2>

        <p className="text-lg text-body-slate leading-[1.7] text-center max-w-[800px] mx-auto mb-14">
          Medikah operates through four institutional interfaces&mdash;each designed for
          specific participants in the healthcare ecosystem.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-14">
          {PORTALS.map((portal) => (
            <div
              key={portal.title}
              className="bg-white border border-border-line rounded-sm p-8"
            >
              <h3 className="font-bold text-xl text-clinical-teal mb-4">
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
