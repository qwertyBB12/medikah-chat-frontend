import Image from 'next/image';
import { LOGO_SRC, WORDMARK_SRC } from '../../lib/assets';

export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 py-24 bg-navy-900 overflow-hidden">
      {/* Subtle radial accent — echoes ecosystem hero patterns */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-teal/[0.06] blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-2xl mx-auto space-y-10">
        <Image
          src={LOGO_SRC}
          alt="Medikah"
          width={100}
          height={100}
          priority
          className="w-20 h-auto sm:w-24"
        />
        <Image
          src={WORDMARK_SRC}
          alt="Medikah"
          width={220}
          height={48}
          priority
          className="w-44 h-auto sm:w-56"
        />

        <div className="space-y-5 pt-6">
          <h1 className="font-heading font-light text-2xl sm:text-3xl md:text-4xl uppercase tracking-wide text-cream-300 leading-snug">
            Connecting patients with doctors across the Americas.
          </h1>
          <p className="font-body text-base text-cream-300/40 leading-relaxed">
            Conectando pacientes con m&eacute;dicos en toda Am&eacute;rica.
          </p>
        </div>

        <div className="pt-4">
          <a
            href="#early-access"
            className="inline-block px-8 py-3.5 bg-teal text-white font-heading font-normal uppercase tracking-wider text-sm hover:bg-teal-dark transition rounded-sm"
          >
            Request early access
          </a>
        </div>
      </div>
    </section>
  );
}
