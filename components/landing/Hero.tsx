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

        <h1 className="font-extrabold text-4xl sm:text-5xl md:text-6xl lg:text-[80px] leading-[1.1] tracking-[-0.02em] mb-10 uppercase">
          <span className="text-clinical-teal block animate-[fadeInUp_0.8s_ease-out_both]">
            Connect With Physicians Across Borders.
          </span>
          <span className="text-inst-blue block animate-[fadeInUp_0.8s_ease-out_0.15s_both]">
            Receive Care Where They&rsquo;re Licensed.
          </span>
        </h1>

        <div className="max-w-3xl mb-12 space-y-5 animate-[fadeInUp_0.8s_ease-out_0.3s_both]">
          <p className="font-semibold text-lg sm:text-xl md:text-2xl text-body-slate leading-relaxed">
            The Americas function as one healthcare theater&mdash;but healthcare systems
            remain divided by borders that families and physicians routinely cross.
          </p>
          <p className="font-semibold text-lg sm:text-xl md:text-2xl text-body-slate leading-relaxed">
            Medikah provides the coordination infrastructure these realities require.
            Not as innovation. As institutional necessity.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 animate-[fadeInUp_0.8s_ease-out_0.45s_both]">
          <a
            href="#early-access"
            className="inline-block px-8 py-4 bg-inst-blue text-white font-bold text-lg tracking-wide hover:bg-clinical-teal hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300 rounded-sm text-center"
          >
            Begin Coordination
          </a>
          <a
            href="mailto:partnerships@medikah.health"
            className="inline-block px-8 py-4 text-clinical-teal font-bold text-lg tracking-wide border-2 border-clinical-teal hover:bg-clinical-teal hover:text-white hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300 rounded-sm text-center"
          >
            Institutional Partnerships
          </a>
        </div>
      </div>
    </section>
  );
}
