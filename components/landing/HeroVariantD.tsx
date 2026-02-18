import Image from 'next/image';
import { LOGO_DARK_SRC } from '../../lib/assets';
const LOGO_DARK = LOGO_DARK_SRC;

/**
 * VARIANT D: DM Serif Display + DM Sans
 *
 * Design principles:
 * - DM Serif Display: Bold, confident, modern serif with presence
 * - DM Sans: Designed as its natural pair - clean, geometric, highly legible
 * - This pairing says "modern institution with confidence"
 * - Balanced layout - not too traditional, not too startup
 * - Strong hierarchy through scale and weight
 */
export default function HeroVariantD() {
  return (
    <section className="relative bg-white px-6 py-28 sm:py-36 md:py-44 lg:py-52 overflow-hidden hero-texture">
      <div className="max-w-5xl mx-auto">
        {/* Logo */}
        <div className="mb-14 md:mb-20">
          <Image
            src={LOGO_DARK}
            alt="Medikah"
            width={96}
            height={96}
            priority
            className="w-20 h-auto sm:w-24"
          />
        </div>

        {/* Main headline - DM Serif Display, commanding presence */}
        <h1 className="mb-10 md:mb-14 max-w-5xl">
          {/* Primary statement - large, confident */}
          <span
            className="font-dm-serif text-clinical-teal block
                       text-[40px] sm:text-[56px] md:text-[76px] lg:text-[96px] xl:text-[112px]
                       leading-[0.95] tracking-[-0.02em]"
          >
            Connect With Physicians
          </span>
          <span
            className="font-dm-serif text-clinical-teal block
                       text-[40px] sm:text-[56px] md:text-[76px] lg:text-[96px] xl:text-[112px]
                       leading-[0.95] tracking-[-0.02em]"
          >
            Across Borders.
          </span>

          {/* Secondary line - italic for elegant contrast */}
          <span
            className="font-dm-serif italic text-inst-blue block mt-4 md:mt-8
                       text-[26px] sm:text-[34px] md:text-[44px] lg:text-[56px]
                       leading-[1.05] tracking-[-0.01em]"
          >
            Receive Care Where They&rsquo;re Licensed.
          </span>
        </h1>

        {/* Subheadlines - DM Sans, modern clarity */}
        <div className="max-w-2xl space-y-5 mb-14">
          <p className="font-dm-sans text-lg sm:text-xl md:text-[22px] text-body-slate leading-[1.6]">
            The Americas function as one medical theater—but systems
            remain divided by borders that families and physicians routinely cross.
          </p>

          <p className="font-dm-sans font-medium text-lg sm:text-xl md:text-[22px] text-inst-blue leading-[1.6]">
            Medikah provides the coordination infrastructure these realities require.
            <span className="block text-clinical-teal mt-1">
              Not as innovation. As institutional necessity.
            </span>
          </p>
        </div>

        {/* CTAs - confident, substantial */}
        <div className="flex flex-col sm:flex-row gap-4">
          <a
            href="#early-access"
            className="inline-block px-9 py-4 bg-inst-blue text-white font-dm-sans font-semibold text-base tracking-wide
                       hover:bg-clinical-teal transition-colors duration-200 text-center
                       shadow-[0_2px_12px_rgba(27,42,65,0.15)] hover:shadow-[0_4px_20px_rgba(44,122,140,0.25)]"
          >
            Begin Coordination
          </a>
          <a
            href="mailto:partnerships@medikah.health"
            className="inline-block px-9 py-4 text-inst-blue font-dm-sans font-semibold text-base tracking-wide
                       border-2 border-inst-blue/80 hover:bg-inst-blue hover:text-white
                       transition-all duration-200 text-center"
          >
            Institutional Partnerships
          </a>
        </div>
      </div>
    </section>
  );
}
