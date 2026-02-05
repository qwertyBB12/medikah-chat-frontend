import Image from 'next/image';
const LOGO_DARK = '/logo-BLU.png';

/**
 * VARIANT B: Instrument Serif + Inter
 *
 * Design principles:
 * - Instrument Serif for headlines (elegant, editorial, single weight)
 * - Inter for body copy (contemporary precision, high legibility)
 * - Centered layout with dramatic scale contrast
 * - Minimal, refined aesthetic
 * - Relies on size/spacing for hierarchy (Instrument only has 400 weight)
 */
export default function HeroVariantB() {
  return (
    <section className="relative bg-white px-6 py-32 sm:py-40 md:py-48 lg:py-60 overflow-hidden hero-texture">
      <div className="max-w-5xl mx-auto text-center">
        {/* Logo - centered, refined */}
        <div className="mb-16 md:mb-24 flex justify-center">
          <Image
            src={LOGO_DARK}
            alt="Medikah"
            width={96}
            height={96}
            priority
            className="w-20 h-auto sm:w-24"
          />
        </div>

        {/* Main headline - Instrument Serif, dramatic scale */}
        <h1 className="mb-12 md:mb-16">
          {/* Primary statement - massive, elegant serif */}
          <span
            className="font-instrument text-clinical-teal block
                       text-[38px] sm:text-[52px] md:text-[72px] lg:text-[100px] xl:text-[120px]
                       leading-[0.9] tracking-[-0.04em]
                       mb-4 md:mb-6"
          >
            Connect With Physicians
          </span>
          <span
            className="font-instrument text-clinical-teal block
                       text-[38px] sm:text-[52px] md:text-[72px] lg:text-[100px] xl:text-[120px]
                       leading-[0.9] tracking-[-0.04em]"
          >
            Across Borders.
          </span>

          {/* Secondary line - italic for contrast */}
          <span
            className="font-instrument italic text-inst-blue block mt-6 md:mt-10
                       text-[24px] sm:text-[32px] md:text-[44px] lg:text-[56px]
                       leading-[1] tracking-[-0.02em]"
          >
            Receive Care Where They&rsquo;re Licensed.
          </span>
        </h1>

        {/* Subheadlines - Inter, clean and precise */}
        <div className="max-w-2xl mx-auto space-y-5 mb-16">
          <p className="font-inter font-normal text-lg sm:text-xl md:text-[22px] text-body-slate leading-[1.6] tracking-[-0.01em]">
            The Americas function as one medical theater—but systems
            remain divided by borders that families and physicians routinely cross.
          </p>

          <p className="font-inter font-medium text-lg sm:text-xl md:text-[22px] text-inst-blue leading-[1.6] tracking-[-0.01em]">
            Medikah provides the coordination infrastructure these realities require.
          </p>
        </div>

        {/* CTAs - refined, centered */}
        <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-5">
          <a
            href="#early-access"
            className="inline-block px-10 py-4 bg-inst-blue text-white font-inter font-semibold text-base tracking-wide
                       hover:bg-clinical-teal transition-colors duration-300 text-center"
          >
            Begin Coordination
          </a>
          <a
            href="mailto:partnerships@medikah.health"
            className="inline-block px-10 py-4 text-inst-blue font-inter font-semibold text-base tracking-wide
                       border border-inst-blue/30 hover:border-inst-blue hover:bg-inst-blue/5
                       transition-all duration-300 text-center"
          >
            Institutional Partnerships
          </a>
        </div>
      </div>
    </section>
  );
}
