const PORTALS = [
  {
    title: 'Patient Coordination',
    description:
      'Connect with physicians across borders. Continuity maintained across jurisdictions.',
    featured: true,
  },
  {
    title: 'Physician Network',
    description:
      'Consult across jurisdictions within clear regulatory frameworks. Credentialed, licensed, supported. Clinical relationships without bureaucratic barriers.',
  },
  {
    title: 'Insurance Integration',
    description:
      'Facilitate communication between patients, providers, and insurers. Coordinate eligibility transparently. Cross-border compatibility by design.',
  },
  {
    title: 'Corporate Partnerships',
    description:
      'Support workforce health across the Americas. Group coordination. Compliance maintained. Institutional standards upheld.',
  },
];

export default function Architecture() {
  const featured = PORTALS[0];
  const supporting = PORTALS.slice(1);

  return (
    <section id="architecture" className="bg-white px-6 py-28 sm:py-36">
      <div className="max-w-[1400px] mx-auto">
        <h2 className="font-dm-serif text-4xl md:text-[52px] lg:text-[64px] text-inst-blue text-center mb-12 leading-[0.98] tracking-[-0.02em]">
          Coordination Architecture
        </h2>

        <p className="font-dm-sans text-lg md:text-xl text-body-slate leading-[1.7] text-center max-w-[900px] mx-auto mb-16">
          Medikah coordinates care through institutional interfaces, each serving
          coordination needs while maintaining regulatory compliance.
        </p>

        {/* Featured card — full width */}
        <div className="mb-8">
          <div className="bg-white shadow-[0_2px_8px_rgba(27,42,65,0.08),0_16px_48px_rgba(27,42,65,0.12)] rounded-lg p-12 md:p-[60px] cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-1 hover:shadow-[0_4px_8px_rgba(27,42,65,0.08),0_20px_40px_rgba(27,42,65,0.08)] active:-translate-y-0.5 active:shadow-[0_2px_4px_rgba(27,42,65,0.08),0_12px_24px_rgba(27,42,65,0.06)]">
            <h3 className="font-dm-serif text-[26px] md:text-[32px] text-clinical-teal mb-6 leading-[1.15]">
              {featured.title}
            </h3>
            <p className="font-dm-sans text-base md:text-lg text-body-slate leading-[1.7] max-w-[75ch]">
              {featured.description}
            </p>
          </div>
        </div>

        {/* Supporting cards — 3 across */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-14">
          {supporting.map((portal) => (
            <div
              key={portal.title}
              className="bg-white shadow-[0_1px_3px_rgba(27,42,65,0.04),0_8px_24px_rgba(27,42,65,0.06)] rounded-lg p-8 md:p-10 cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-1 hover:shadow-[0_4px_8px_rgba(27,42,65,0.08),0_20px_40px_rgba(27,42,65,0.08)] active:-translate-y-0.5 active:shadow-[0_2px_4px_rgba(27,42,65,0.08),0_12px_24px_rgba(27,42,65,0.06)]"
            >
              <h3 className="font-dm-serif text-xl md:text-2xl text-clinical-teal mb-4 leading-[1.15]">
                {portal.title}
              </h3>
              <p className="font-dm-sans text-base text-body-slate leading-[1.7]">
                {portal.description}
              </p>
            </div>
          ))}
        </div>

        <p className="font-dm-sans font-medium text-lg text-deep-charcoal text-center max-w-[700px] mx-auto leading-[1.6]">
          Technology platform designed for institutional partnership&mdash;without
          replacing existing systems.
        </p>
      </div>
    </section>
  );
}
