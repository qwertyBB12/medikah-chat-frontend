const VALUES = [
  {
    title: 'Continuity',
    body: 'Your relationship with your physician shouldn\u2019t end because you crossed a border. Care requires continuity\u2014across cities, countries, contexts. We believe coordination between providers restores the humanity and compassion that fragmented systems have lost. Your care narrative should remain unbroken.',
  },
  {
    title: 'Access',
    body: 'Excellent physicians practice throughout the Americas. Institutional barriers\u2014not medical capability\u2014prevent patients from connecting with them. Medikah removes coordination barriers while maintaining regulatory integrity. Licensed providers. Credentialed networks. Clear jurisdictional frameworks. Access to expertise, not shortcuts around compliance.',
  },
  {
    title: 'Coordination',
    body: 'Fragmentation harms everyone. Insurers, hospitals, physicians, and patients all benefit when systems work together. Medikah exists to make that coordination real. We don\u2019t replace existing systems. We connect them. We don\u2019t bypass regulations. We navigate them. We don\u2019t create new bureaucracy. We reduce it.',
  },
];

/**
 * VARIANT A: Values with Fraunces Headlines
 *
 * Design principles:
 * - Section title in Fraunces serif (institutional)
 * - Card titles in Fraunces (cohesive hierarchy)
 * - Staggered card heights for visual rhythm
 * - Left-aligned section title (matches Hero)
 */
export default function ValuesVariantA() {
  return (
    <section className="bg-gradient-to-b from-white via-clinical-surface to-white px-6 py-28 sm:py-36">
      <div className="max-w-6xl mx-auto">
        {/* Section header - left-aligned with accent */}
        <div className="mb-20 max-w-2xl">
          <p className="font-body text-sm font-semibold text-clinical-teal uppercase tracking-[0.15em] mb-4">
            Our Foundation
          </p>
          <h2 className="font-display font-bold text-4xl md:text-[56px] lg:text-[64px] text-inst-blue leading-[0.95] tracking-[-0.02em]">
            What We Believe
          </h2>
        </div>

        {/* Cards with staggered offset */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {VALUES.map((item, index) => (
            <div
              key={item.title}
              className={`bg-white shadow-[0_1px_3px_rgba(27,42,65,0.06),0_8px_24px_rgba(27,42,65,0.04)]
                         rounded-[12px] p-8 sm:p-10
                         ${index === 1 ? 'md:mt-8' : ''}
                         ${index === 2 ? 'md:mt-16' : ''}`}
            >
              <h3 className="font-display font-semibold text-3xl md:text-[32px] text-clinical-teal mb-4 leading-[1.1] tracking-[-0.01em]">
                {item.title}
              </h3>
              <p className="text-lg text-body-slate leading-[1.7]">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
