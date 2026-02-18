import Image from 'next/image';
import { LOGO_DARK_SRC } from '../../lib/assets';
const LOGO_DARK = LOGO_DARK_SRC;

/**
 * VARIANT A: Fraunces Serif Headlines
 *
 * Design principles:
 * - Fraunces variable serif for headlines (institutional authority)
 * - Mulish remains for body copy (clarity, readability)
 * - Left-aligned hero (asymmetric tension)
 * - Larger typography (120px desktop) with tighter line-height (0.92)
 * - More generous vertical whitespace
 * - Staggered text blocks create visual rhythm
 */
export default function HeroVariantA() {
  return (
    <section className="relative bg-white px-6 py-32 sm:py-40 md:py-48 lg:py-56 overflow-hidden hero-texture">
      <div className="max-w-6xl mx-auto">
        {/* Logo - slightly larger, more presence */}
        <div className="mb-16 md:mb-20">
          <Image
            src={LOGO_DARK}
            alt="Medikah"
            width={120}
            height={120}
            priority
            className="w-24 h-auto sm:w-28 md:w-32"
          />
        </div>

        {/* Main headline - Fraunces serif, left-aligned, massive */}
        <h1 className="max-w-4xl mb-12 md:mb-16">
          {/* First line - teal, not uppercase (serifs don't need caps for authority) */}
          <span
            className="font-display font-bold text-clinical-teal block
                       text-[42px] sm:text-[56px] md:text-[80px] lg:text-[120px]
                       leading-[0.92] tracking-[-0.03em]"
          >
            Connect With Physicians
          </span>
          {/* Second line - slight indent creates visual rhythm */}
          <span
            className="font-display font-bold text-clinical-teal block
                       text-[42px] sm:text-[56px] md:text-[80px] lg:text-[120px]
                       leading-[0.92] tracking-[-0.03em]
                       md:ml-[5%]"
          >
            Across Borders.
          </span>
          {/* Third line - navy, offset more */}
          <span
            className="font-display font-medium text-inst-blue block mt-4 md:mt-6
                       text-[32px] sm:text-[42px] md:text-[56px] lg:text-[72px]
                       leading-[0.95] tracking-[-0.02em]
                       md:ml-[10%]"
          >
            Receive Care Where They&rsquo;re Licensed.
          </span>
        </h1>

        {/* Subheadlines - Mulish, controlled width, left-aligned */}
        <div className="max-w-2xl space-y-6 mb-16">
          <p className="font-body font-medium text-xl sm:text-2xl md:text-[28px] text-body-slate leading-[1.4] tracking-[-0.01em]">
            The Americas function as one medical theater&mdash;but systems
            remain divided by borders that families and physicians routinely cross.
          </p>

          <p className="font-body font-medium text-xl sm:text-2xl md:text-[28px] text-body-slate leading-[1.4] tracking-[-0.01em]">
            Medikah provides the coordination infrastructure these realities require.
            <span className="block mt-2 text-clinical-teal font-semibold">
              Not as innovation. As institutional necessity.
            </span>
          </p>
        </div>

        {/* CTAs - left-aligned, stacked creates hierarchy */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
          <a
            href="#early-access"
            className="inline-block px-10 py-5 bg-inst-blue text-white font-bold text-lg tracking-wide
                       hover:bg-clinical-teal transition-colors duration-300 rounded-sm text-center
                       shadow-[0_4px_20px_rgba(27,42,65,0.25)] hover:shadow-[0_8px_30px_rgba(44,122,140,0.3)]"
          >
            Begin Coordination
          </a>
          <a
            href="mailto:partnerships@medikah.health"
            className="inline-block px-10 py-5 text-clinical-teal font-bold text-lg tracking-wide
                       border-2 border-clinical-teal hover:bg-clinical-teal hover:text-white
                       transition-all duration-300 rounded-sm text-center"
          >
            Institutional Partnerships
          </a>
        </div>
      </div>

      {/* Decorative element - subtle vertical line accent */}
      <div
        className="hidden lg:block absolute left-[8%] top-1/4 bottom-1/4 w-px bg-gradient-to-b from-transparent via-clinical-teal/20 to-transparent"
        aria-hidden="true"
      />
    </section>
  );
}
