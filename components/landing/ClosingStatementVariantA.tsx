/**
 * VARIANT A: Closing Statement with Fraunces Headlines
 *
 * Design principles:
 * - Fraunces serif for maximum impact on final CTA
 * - Slightly larger sizing for dramatic close
 * - Left-aligned with asymmetric whitespace
 */
export default function ClosingStatementVariantA() {
  return (
    <section className="bg-inst-blue px-6 py-24 sm:py-32 md:py-40">
      <div className="max-w-5xl mx-auto">
        {/* Main statement - Fraunces, left-aligned */}
        <h2 className="font-display font-bold text-white leading-[0.95] tracking-[-0.02em] mb-10
                       text-[32px] sm:text-[44px] md:text-[56px] lg:text-[72px]
                       max-w-4xl">
          Care is too important to remain fragmented.
          <span className="block mt-2 md:mt-4 text-white/80">
            The Americas are too connected to leave care divided.
          </span>
        </h2>

        {/* Supporting text */}
        <p className="font-body font-medium text-lg md:text-xl text-white/70 mb-12 max-w-2xl">
          Medikah coordinates what should never have been separated.
        </p>

        {/* CTA - more prominent */}
        <a
          href="mailto:partnerships@medikah.health"
          className="inline-block px-8 py-4 text-white font-bold tracking-wide text-base
                     border-2 border-white/50 hover:bg-white hover:text-inst-blue
                     transition-all duration-300 rounded-sm"
        >
          Begin Coordination Inquiry
        </a>
      </div>
    </section>
  );
}
