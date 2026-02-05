const VALUES = [
  {
    title: 'Continuity',
    body: 'Your relationship with your physician shouldn\u2019t end because you crossed a border. Care requires continuity\u2014across cities, countries, contexts. We believe coordination between providers restores the humanity and compassion that fragmented systems have lost. Your care narrative should remain unbroken.',
  },
  {
    title: 'Access',
    body: 'Excellent physicians practice throughout the Americas. Institutional barriers\u2014not medical capability\u2014prevent patients from connecting with them. Medikah removes coordination barriers while maintaining regulatory integrity. Licensed providers. Credentialed networks. Clear jurisdictional frameworks.',
  },
  {
    title: 'Coordination',
    body: 'Fragmentation harms everyone. Insurers, hospitals, physicians, and patients all benefit when systems work together. Medikah exists to make that coordination real. We don\u2019t replace existing systems. We connect them. We don\u2019t bypass regulations. We navigate them.',
  },
];

/**
 * VARIANT D: Values with DM Serif Display + DM Sans
 *
 * Design principles:
 * - Modern cards with confident typography
 * - DM Serif for titles - bold presence
 * - DM Sans for body - clean, readable
 * - Subtle hover interactions
 * - Balanced whitespace
 */
export default function ValuesVariantD() {
  return (
    <section className="bg-gradient-to-b from-white via-clinical-surface/50 to-white px-6 py-28 sm:py-36">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16 md:mb-24">
          <p className="font-dm-sans text-sm font-semibold text-clinical-teal uppercase tracking-[0.15em] mb-4">
            Our Foundation
          </p>
          <h2 className="font-dm-serif text-4xl md:text-[52px] lg:text-[64px] text-inst-blue leading-[0.98] tracking-[-0.02em]">
            What We Believe
          </h2>
        </div>

        {/* Values grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {VALUES.map((item) => (
            <div
              key={item.title}
              className="group bg-white rounded-lg p-8 md:p-10
                         shadow-[0_1px_3px_rgba(27,42,65,0.04),0_8px_24px_rgba(27,42,65,0.06)]
                         hover:shadow-[0_4px_12px_rgba(27,42,65,0.08),0_16px_40px_rgba(27,42,65,0.1)]
                         transition-shadow duration-300"
            >
              {/* Title - DM Serif */}
              <h3 className="font-dm-serif text-2xl md:text-[28px] text-clinical-teal mb-4 leading-[1.15]
                             group-hover:text-clinical-teal-dark transition-colors duration-200">
                {item.title}
              </h3>

              {/* Body - DM Sans */}
              <p className="font-dm-sans text-base text-body-slate leading-[1.7]">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
