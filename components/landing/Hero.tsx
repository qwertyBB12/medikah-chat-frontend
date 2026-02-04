import Image from 'next/image';
const LOGO_DARK = '/logo-BLU.png';

export default function Hero() {
  return (
    <section className="relative bg-white px-6 py-24 sm:py-32 md:py-40 overflow-hidden hero-texture">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10">
          <Image
            src={LOGO_DARK}
            alt="Medikah"
            width={96}
            height={96}
            priority
            className="w-20 h-auto sm:w-24"
          />
        </div>

        <h1 className="font-extrabold text-4xl sm:text-5xl md:text-[56px] lg:text-[64px] leading-[1.1] mb-10">
          <span className="text-clinical-teal uppercase tracking-[0.04em] block mb-2">
            Connect With Physicians Across Borders.
          </span>
          <span className="text-inst-blue tracking-[-0.02em] block">
            Receive Care Where They&rsquo;re Licensed.
          </span>
        </h1>

        <p className="font-medium text-lg sm:text-xl md:text-[22px] text-body-slate leading-relaxed max-w-3xl mb-5">
          The Americas function as one medical theater&mdash;but systems
          remain divided by borders that families and physicians routinely cross.
        </p>

        <p className="font-medium text-lg sm:text-xl md:text-[22px] text-body-slate leading-relaxed max-w-3xl mb-12">
          Medikah provides the coordination infrastructure these realities require.
          Not as innovation. As institutional necessity.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <a
            href="#early-access"
            className="inline-block px-8 py-4 bg-inst-blue text-white font-bold text-lg tracking-wide hover:bg-clinical-teal transition rounded-sm text-center"
          >
            Begin Coordination
          </a>
          <a
            href="mailto:partnerships@medikah.health"
            className="inline-block px-8 py-4 text-clinical-teal font-bold text-lg tracking-wide border border-clinical-teal hover:bg-clinical-teal hover:text-white transition rounded-sm text-center"
          >
            Institutional Partnerships
          </a>
        </div>
      </div>
    </section>
  );
}
