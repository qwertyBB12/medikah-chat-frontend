import Image from 'next/image';
const LOGO_DARK = '/logo-BLU.png';

/**
 * VARIANT C: Playfair Display + Source Sans 3
 *
 * Design principles:
 * - Playfair Display for headlines (classic editorial, high contrast serifs)
 * - Source Sans 3 for body (Adobe's institutional workhorse, supreme legibility)
 * - Traditional newspaper/editorial layout
 * - Strong visual hierarchy through weight and size contrast
 * - This is the "established institution" look
 */
export default function HeroVariantC() {
  return (
    <section className="relative bg-white px-6 py-28 sm:py-36 md:py-44 lg:py-52 overflow-hidden hero-texture">
      <div className="max-w-5xl mx-auto">
        {/* Logo */}
        <div className="mb-12 md:mb-16">
          <Image
            src={LOGO_DARK}
            alt="Medikah"
            width={96}
            height={96}
            priority
            className="w-20 h-auto sm:w-24"
          />
        </div>

        {/* Main headline - Playfair, classic editorial weight */}
        <h1 className="mb-10 md:mb-14 max-w-4xl">
          {/* Primary - bold, commanding */}
          <span
            className="font-playfair font-bold text-clinical-teal block
                       text-[36px] sm:text-[48px] md:text-[64px] lg:text-[88px] xl:text-[104px]
                       leading-[1] tracking-[-0.02em]"
          >
            Connect With Physicians
          </span>
          <span
            className="font-playfair font-bold text-clinical-teal block
                       text-[36px] sm:text-[48px] md:text-[64px] lg:text-[88px] xl:text-[104px]
                       leading-[1] tracking-[-0.02em]"
          >
            Across Borders.
          </span>

          {/* Secondary - medium weight, elegant contrast */}
          <span
            className="font-playfair font-medium text-inst-blue block mt-5 md:mt-8
                       text-[24px] sm:text-[32px] md:text-[40px] lg:text-[52px]
                       leading-[1.1] tracking-[-0.01em]"
          >
            Receive Care Where They&rsquo;re Licensed.
          </span>
        </h1>

        {/* Subheadlines - Source Sans 3, institutional clarity */}
        <div className="max-w-2xl space-y-5 mb-14">
          <p className="font-source text-lg sm:text-xl md:text-[22px] text-body-slate leading-[1.65] tracking-[0.01em]">
            The Americas function as one medical theater—but systems
            remain divided by borders that families and physicians routinely cross.
          </p>

          <p className="font-source font-semibold text-lg sm:text-xl md:text-[22px] text-inst-blue leading-[1.65] tracking-[0.01em]">
            Medikah provides the coordination infrastructure these realities require.
            Not as innovation. As institutional necessity.
          </p>
        </div>

        {/* CTAs - substantial, institutional */}
        <div className="flex flex-col sm:flex-row gap-4">
          <a
            href="#early-access"
            className="inline-block px-8 py-4 bg-inst-blue text-white font-source font-semibold text-base tracking-wide
                       hover:bg-clinical-teal transition-colors duration-200 text-center"
          >
            Begin Coordination
          </a>
          <a
            href="mailto:partnerships@medikah.health"
            className="inline-block px-8 py-4 text-inst-blue font-source font-semibold text-base tracking-wide
                       border-2 border-inst-blue hover:bg-inst-blue hover:text-white
                       transition-all duration-200 text-center"
          >
            Institutional Partnerships
          </a>
        </div>
      </div>
    </section>
  );
}
