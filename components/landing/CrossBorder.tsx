export default function CrossBorder() {
  return (
    <section className="bg-white px-6 py-24 sm:py-32 overflow-hidden">
      <div className="max-w-5xl mx-auto">
        <h2 className="font-extrabold text-4xl md:text-[56px] text-inst-blue text-center mb-8 leading-[1.15] tracking-[-0.01em]">
          The Americas Are Already One Medical Theater
        </h2>

        <p className="text-lg text-body-slate leading-relaxed text-center max-w-[900px] mx-auto mb-16">
          Patients already live across borders. Families span multiple countries. Physicians trained
          in one nation practice in another. Insurers operate multinational employer groups. The
          medical reality is hemispheric&mdash;but the infrastructure isn&rsquo;t.
        </p>

        <p className="text-lg text-body-slate leading-relaxed text-center max-w-[900px] mx-auto mb-20">
          Medikah builds that infrastructure. Not as disruption. As coordination. Not as marketplace.
          As institutional layer. Not as movement. As recognition of what already exists.
        </p>

        {/* Abstract Americas visualization — pure CSS */}
        <div className="relative mx-auto w-full max-w-lg h-72 sm:h-80" aria-hidden="true">
          {/* Continental shapes — abstract ovals */}
          <div className="absolute top-4 left-1/2 -translate-x-[40%] w-28 h-44 rounded-[50%] bg-inst-blue/[0.07] rotate-[-8deg]" />
          <div className="absolute top-32 left-1/2 -translate-x-[30%] w-20 h-52 rounded-[50%] bg-inst-blue/[0.05] rotate-[-12deg]" />

          {/* Flow dots — suggesting connectivity */}
          <div className="absolute top-10 left-[38%] w-2.5 h-2.5 rounded-full bg-clinical-teal/60 animate-pulse" />
          <div className="absolute top-24 left-[45%] w-2 h-2 rounded-full bg-clinical-teal/40 animate-pulse [animation-delay:0.5s]" />
          <div className="absolute top-40 left-[42%] w-3 h-3 rounded-full bg-clinical-teal/50 animate-pulse [animation-delay:1s]" />
          <div className="absolute top-56 left-[48%] w-2 h-2 rounded-full bg-clinical-teal/40 animate-pulse [animation-delay:1.5s]" />
          <div className="absolute top-[72%] left-[44%] w-2.5 h-2.5 rounded-full bg-clinical-teal/60 animate-pulse [animation-delay:2s]" />

          {/* Connecting lines — subtle arcs */}
          <div className="absolute top-16 left-[30%] w-[40%] h-px bg-gradient-to-r from-transparent via-clinical-teal/20 to-transparent" />
          <div className="absolute top-36 left-[28%] w-[44%] h-px bg-gradient-to-r from-transparent via-clinical-teal/15 to-transparent rotate-[5deg]" />
          <div className="absolute top-52 left-[32%] w-[36%] h-px bg-gradient-to-r from-transparent via-clinical-teal/20 to-transparent rotate-[-3deg]" />

          {/* Soft radial glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-clinical-teal/[0.04] blur-3xl" />
        </div>
      </div>
    </section>
  );
}
