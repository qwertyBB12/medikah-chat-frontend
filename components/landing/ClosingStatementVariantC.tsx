/**
 * VARIANT C: Closing Statement with Playfair Display + Source Sans 3
 *
 * Design principles:
 * - Bold editorial statement
 * - Classic newspaper headline energy
 * - Strong institutional presence
 */
export default function ClosingStatementVariantC() {
  return (
    <section className="bg-inst-blue px-6 py-24 sm:py-32 md:py-40">
      <div className="max-w-4xl mx-auto text-center">
        {/* Main statement - Playfair, bold editorial */}
        <h2 className="font-playfair font-bold text-white leading-[1.05] tracking-[-0.02em] mb-6
                       text-[28px] sm:text-[40px] md:text-[52px] lg:text-[68px]">
          Care is too important to remain fragmented.
        </h2>

        <p className="font-playfair font-medium text-white/80 leading-[1.1] tracking-[-0.01em] mb-10
                      text-[22px] sm:text-[28px] md:text-[36px] lg:text-[44px]">
          The Americas are too connected to leave care divided.
        </p>

        {/* Supporting text - Source Sans */}
        <p className="font-source text-lg md:text-xl text-white/60 mb-12 max-w-xl mx-auto leading-[1.6]">
          Medikah coordinates what should never have been separated.
        </p>

        {/* CTA */}
        <a
          href="mailto:partnerships@medikah.health"
          className="inline-block px-8 py-4 text-white font-source font-semibold tracking-wide text-base
                     border-2 border-white/40 hover:bg-white hover:text-inst-blue
                     transition-all duration-200"
        >
          Begin Coordination Inquiry
        </a>
      </div>
    </section>
  );
}
