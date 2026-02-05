const AUDIENCES = [
  {
    headline: 'Coordination That Follows You',
    label: 'For Patients',
    body: [
      'Whether you live between countries, seek specialized care across borders, or need access to physicians in other jurisdictions\u2014Medikah coordinates your journey with institutional rigor and human attention.',
      'Our platform connects you with licensed physicians across the Americas for informational consultations about your health needs. Medical care happens in-person, in the provider\u2019s licensed jurisdiction, with full regulatory compliance and complete documentation.',
      'Your physicians collaborate across jurisdictions. Your care happens compliantly, continuously. Bilingual support at every step. Designed for real lives, not insurance categories.',
    ],
    cta: {
      label: 'Learn About Patient Access',
      href: '#early-access',
    },
  },
  {
    headline: 'Consult Across Borders. Deliver Care In-Person.',
    label: 'For Physicians',
    body: [
      'Your expertise doesn\u2019t end at national borders. Neither should your patient relationships. Medikah enables cross-border patient consultation within clear regulatory and credentialing frameworks.',
      'Consult with patients across borders within compliant frameworks. Maintain longitudinal relationships regardless of where patients live. Coordinate seamlessly with referring physicians and specialists. Video consultations are informational and planning-focused. Medical diagnosis and treatment happen in-person, in your licensed jurisdiction.',
      'No regulatory gray zones. No jurisdictional ambiguity. Practice medicine as it should be\u2014focused on patient outcomes, not jurisdictional bureaucracy.',
    ],
    cta: {
      label: 'Schedule Physician Onboarding Call',
      href: 'mailto:partnerships@medikah.health',
    },
  },
  {
    headline: 'Coordination Infrastructure That Works',
    label: 'For Institutions',
    body: [
      'Insurers, hospitals, and employers face the same challenge: patients and care move across borders, but systems don\u2019t. Medikah provides the coordination layer that allows your institution to operate across the Americas while remaining compliant, trusted, and economically sound.',
      'We don\u2019t replace your systems. We connect them. We don\u2019t bypass regulations. We navigate them. We don\u2019t create new bureaucracy. We reduce it.',
      'Partnership built on institutional standards, not marketplace economics.',
    ],
    cta: {
      label: 'Schedule Institutional Consultation',
      href: 'mailto:partnerships@medikah.health',
    },
  },
];

export default function Audiences() {
  return (
    <section className="bg-clinical-surface px-6 py-28 sm:py-36">
      <div className="max-w-5xl mx-auto">
        <h2 className="font-dm-serif text-4xl md:text-[52px] lg:text-[64px] text-inst-blue text-center mb-20 leading-[0.98] tracking-[-0.02em]">
          Who Medikah Serves
        </h2>

        <div className="space-y-12">
          {AUDIENCES.map((audience) => (
            <div
              key={audience.label}
              className="bg-white shadow-[0_1px_3px_rgba(27,42,65,0.04),0_8px_24px_rgba(27,42,65,0.06)] rounded-lg p-8 sm:p-12"
            >
              <p className="font-dm-sans text-[13px] font-semibold uppercase tracking-[0.12em] text-archival-grey mb-3">
                {audience.label}
              </p>
              <h3 className="font-dm-serif text-2xl md:text-3xl text-clinical-teal mb-6 leading-[1.1]">
                {audience.headline}
              </h3>
              <div className="max-w-[700px] space-y-5">
                {audience.body.map((paragraph, i) => (
                  <p key={i} className="font-dm-sans text-base md:text-lg text-body-slate leading-[1.7]">
                    {paragraph}
                  </p>
                ))}
              </div>
              {audience.cta && (
                <div className="mt-8">
                  <a
                    href={audience.cta.href}
                    className="inline-block px-7 py-3.5 bg-inst-blue text-white font-dm-sans font-semibold tracking-wide text-sm hover:bg-clinical-teal transition-colors duration-200"
                  >
                    {audience.cta.label}
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
