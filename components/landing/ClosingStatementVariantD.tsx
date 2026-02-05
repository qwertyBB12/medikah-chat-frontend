/**
 * VARIANT D: Closing Statement with DM Serif Display + DM Sans
 *
 * Design principles:
 * - Confident, modern closing
 * - DM Serif for emotional impact
 * - Clean, actionable CTA
 */
export default function ClosingStatementVariantD() {
  return (
    <section className="bg-inst-blue px-6 py-24 sm:py-32 md:py-40">
      <div className="max-w-4xl mx-auto text-center">
        {/* Main statement - DM Serif, powerful */}
        <h2 className="font-dm-serif text-white leading-[0.98] tracking-[-0.02em] mb-4
                       text-[30px] sm:text-[42px] md:text-[56px] lg:text-[72px]">
          Care is too important
          <span className="block">to remain fragmented.</span>
        </h2>

        {/* Secondary statement - italic */}
        <p className="font-dm-serif italic text-white/75 leading-[1.05] tracking-[-0.01em] mb-10
                      text-[20px] sm:text-[26px] md:text-[32px] lg:text-[40px]">
          The Americas are too connected to leave care divided.
        </p>

        {/* Supporting text - DM Sans */}
        <p className="font-dm-sans text-lg md:text-xl text-white/60 mb-12 max-w-xl mx-auto leading-[1.6]">
          Medikah coordinates what should never have been separated.
        </p>

        {/* CTA */}
        <a
          href="mailto:partnerships@medikah.health"
          className="inline-block px-8 py-4 text-white font-dm-sans font-semibold tracking-wide text-base
                     border-2 border-white/40 hover:bg-white hover:text-inst-blue
                     transition-all duration-200"
        >
          Begin Coordination Inquiry
        </a>
      </div>
    </section>
  );
}
