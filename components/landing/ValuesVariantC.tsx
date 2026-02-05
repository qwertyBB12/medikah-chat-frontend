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
 * VARIANT C: Values with Playfair Display + Source Sans 3
 *
 * Design principles:
 * - Editorial magazine layout
 * - Large section number as visual anchor
 * - Two-column text layout for readability
 * - Classic newspaper/journal aesthetic
 */
export default function ValuesVariantC() {
  return (
    <section className="bg-clinical-surface px-6 py-28 sm:py-36 md:py-44">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-20 md:mb-28">
          <p className="font-source text-sm font-semibold text-clinical-teal uppercase tracking-[0.2em] mb-4">
            Our Foundation
          </p>
          <h2 className="font-playfair font-bold text-4xl md:text-[52px] lg:text-[64px] text-inst-blue leading-[1] tracking-[-0.02em]">
            What We Believe
          </h2>
        </div>

        {/* Values grid - editorial cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {VALUES.map((item, index) => (
            <div
              key={item.title}
              className="bg-white p-8 md:p-10 border border-border-line"
            >
              {/* Large number */}
              <span className="font-playfair text-[64px] md:text-[80px] text-clinical-teal/20 leading-none block mb-2">
                {index + 1}
              </span>

              {/* Title */}
              <h3 className="font-playfair font-bold text-2xl md:text-[28px] text-clinical-teal mb-4 leading-[1.15] tracking-[-0.01em]">
                {item.title}
              </h3>

              {/* Body */}
              <p className="font-source text-base text-body-slate leading-[1.7]">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
