const PILLARS = [
  {
    icon: (
      <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
      </svg>
    ),
    label: 'Regulatory Compliance',
  },
  {
    icon: (
      <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
      </svg>
    ),
    label: 'Credentialed Networks',
  },
  {
    icon: (
      <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25h.375a9 9 0 0 1 9 9v.375M10.125 2.25A3.375 3.375 0 0 1 13.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 0 1 3.375 3.375M9 15l2.25 2.25L15 12" />
      </svg>
    ),
    label: 'Institutional Audit Standards',
  },
];

export default function Governance() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-inst-blue to-[#243447] px-6 py-[100px] md:py-[140px] compliance-dark">
      <div className="max-w-4xl mx-auto">
        <h2 className="font-extrabold text-4xl md:text-[56px] text-white text-center mb-12 leading-[1.1] tracking-[-0.02em]">
          Built for Institutional Scrutiny
        </h2>

        <p className="text-lg text-white/90 leading-[1.7] text-center max-w-[900px] mx-auto mb-6">
          Medikah&rsquo;s compliance framework was developed in consultation with healthcare
          regulatory experts across multiple jurisdictions. Our architecture is designed
          to withstand institutional audit from day one.
        </p>

        <p className="font-semibold text-sm text-white/80 text-center mb-10">
          Dual-jurisdiction compliance &middot; HIPAA and COFEPRIS frameworks &middot; Institutional governance from inception
        </p>

        <p className="text-lg text-white/90 leading-relaxed text-center max-w-[800px] mx-auto mb-6">
          Healthcare coordination across borders requires regulatory compliance, jurisdictional
          clarity, and institutional trust. Medikah operates within established
          frameworks&mdash;HIPAA, local medical licensing, bilateral agreements, and privacy
          standards.
        </p>

        <p className="text-lg text-white/90 leading-relaxed text-center max-w-[800px] mx-auto mb-16">
          Every interaction is audit-ready. Every provider is credentialed. Every coverage pathway is
          transparent. We do not operate in regulatory gray zones. We build infrastructure that
          institutions can trust and regulators can verify.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {PILLARS.map((pillar) => (
            <div key={pillar.label} className="flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                {pillar.icon}
              </div>
              <p className="font-bold text-sm tracking-wide text-white">
                {pillar.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
