/**
 * VARIANT B: Closing Statement with Instrument Serif + Inter
 *
 * Design principles:
 * - Dramatic serif headline
 * - Minimal, elegant layout
 * - Subtle background treatment
 */
export default function ClosingStatementVariantB() {
  return (
    <section className="bg-inst-blue px-6 py-28 sm:py-36 md:py-44">
      <div className="max-w-4xl mx-auto text-center">
        {/* Main statement - Instrument Serif, dramatic */}
        <h2 className="font-instrument text-white leading-[0.92] tracking-[-0.03em] mb-8
                       text-[32px] sm:text-[44px] md:text-[60px] lg:text-[80px]">
          Care is too important
          <span className="block">to remain fragmented.</span>
        </h2>

        {/* Supporting text - Inter, refined */}
        <p className="font-inter font-normal text-lg md:text-xl text-white/70 mb-14 max-w-xl mx-auto leading-[1.6]">
          The Americas are too connected to leave care divided.
          Medikah coordinates what should never have been separated.
        </p>

        {/* CTA - minimal, elegant */}
        <a
          href="mailto:partnerships@medikah.health"
          className="inline-block px-8 py-4 text-white font-inter font-medium tracking-wide text-base
                     border border-white/30 hover:bg-white hover:text-inst-blue
                     transition-all duration-300"
        >
          Begin Coordination Inquiry
        </a>
      </div>
    </section>
  );
}
