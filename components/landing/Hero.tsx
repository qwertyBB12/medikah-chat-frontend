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

        <h1 className="font-extrabold text-5xl sm:text-6xl md:text-7xl lg:text-[96px] leading-[1.05] tracking-[-0.025em] mb-8">
          <span className="text-clinical-teal">Healthcare That Crosses Borders.</span>
          <br />
          <span className="text-inst-blue">Care That Never Does.</span>
        </h1>

        <p className="font-semibold text-xl sm:text-2xl md:text-3xl text-body-slate leading-snug max-w-3xl mb-12">
          Coordinating quality healthcare across the Americas&mdash;with the continuity, compliance,
          and humanity that healthcare demands.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <a
            href="#early-access"
            className="inline-block px-8 py-4 bg-inst-blue text-white font-bold text-lg tracking-wide hover:bg-clinical-teal transition rounded-sm text-center"
          >
            Learn About Access
          </a>
          <a
            href="mailto:partnerships@medikah.com"
            className="inline-block px-8 py-4 text-clinical-teal font-bold text-lg tracking-wide border border-clinical-teal hover:bg-clinical-teal hover:text-white transition rounded-sm text-center"
          >
            Institutional Inquiry
          </a>
        </div>
      </div>
    </section>
  );
}
