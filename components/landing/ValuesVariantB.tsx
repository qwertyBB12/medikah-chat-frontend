const VALUES = [
  {
    title: 'Continuity',
    body: 'Your relationship with your physician shouldn\u2019t end because you crossed a border. Care requires continuity\u2014across cities, countries, contexts. We believe coordination between providers restores the humanity and compassion that fragmented systems have lost.',
  },
  {
    title: 'Access',
    body: 'Excellent physicians practice throughout the Americas. Institutional barriers\u2014not medical capability\u2014prevent patients from connecting with them. Medikah removes coordination barriers while maintaining regulatory integrity.',
  },
  {
    title: 'Coordination',
    body: 'Fragmentation harms everyone. Insurers, hospitals, physicians, and patients all benefit when systems work together. We don\u2019t replace existing systems. We connect them. We don\u2019t bypass regulations. We navigate them.',
  },
];

/**
 * VARIANT B: Values with Instrument Serif + Inter
 *
 * Design principles:
 * - Clean, minimal cards with generous whitespace
 * - Instrument Serif for card titles (italic for elegance)
 * - Inter for body copy (precision)
 * - Horizontal rule separators
 * - Numbers as visual anchors
 */
export default function ValuesVariantB() {
  return (
    <section className="bg-white px-6 py-28 sm:py-36 md:py-44">
      <div className="max-w-5xl mx-auto">
        {/* Section header - centered, elegant */}
        <div className="text-center mb-20 md:mb-28">
          <h2 className="font-instrument text-4xl md:text-[56px] lg:text-[72px] text-inst-blue leading-[0.95] tracking-[-0.03em]">
            What We Believe
          </h2>
        </div>

        {/* Values - vertical stack with dividers */}
        <div className="space-y-0">
          {VALUES.map((item, index) => (
            <div
              key={item.title}
              className="py-12 md:py-16 border-t border-border-line first:border-t-0"
            >
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-12 items-start">
                {/* Number */}
                <div className="md:col-span-1">
                  <span className="font-inter text-sm text-archival-grey tracking-wide">
                    0{index + 1}
                  </span>
                </div>

                {/* Title */}
                <div className="md:col-span-3">
                  <h3 className="font-instrument italic text-2xl md:text-3xl text-clinical-teal leading-[1.1] tracking-[-0.01em]">
                    {item.title}
                  </h3>
                </div>

                {/* Body */}
                <div className="md:col-span-8">
                  <p className="font-inter text-base md:text-lg text-body-slate leading-[1.7]">
                    {item.body}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
