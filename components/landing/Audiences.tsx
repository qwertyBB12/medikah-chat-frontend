const AUDIENCES = [
  {
    headline: 'Care That Follows You',
    label: 'For Patients',
    body: [
      'Whether you live between countries, seek second opinions across borders, or need specialized care beyond your local system\u2014Medikah coordinates your care with institutional rigor and human attention.',
      'Your medical history travels with you. Your coverage is transparent. Your physicians collaborate across jurisdictions. And when you need care, you receive it\u2014compliantly, affordably, continuously.',
      'Bilingual at every step. Coordinated across systems. Designed for real lives, not insurance categories.',
    ],
  },
  {
    headline: 'Practice Across Borders, Compliantly',
    label: 'For Physicians',
    body: [
      'Your expertise doesn\u2019t stop at national borders\u2014your practice shouldn\u2019t either. Medikah enables cross-border care delivery within clear regulatory and credentialing frameworks.',
      'See patients throughout the Americas. Maintain longitudinal relationships. Coordinate with institutions transparently. Practice medicine as it should be\u2014focused on patient outcomes, not jurisdictional bureaucracy.',
      'Credentialed networks. Licensing clarity. Institutional support.',
    ],
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
      href: 'mailto:partnerships@medikah.com',
    },
  },
];

export default function Audiences() {
  return (
    <section className="bg-clinical-surface px-6 py-24 sm:py-32">
      <div className="max-w-5xl mx-auto">
        <h2 className="font-bold text-4xl md:text-5xl text-inst-blue text-center mb-20">
          Who Medikah Serves
        </h2>

        <div className="space-y-16">
          {AUDIENCES.map((audience) => (
            <div
              key={audience.label}
              className="bg-white rounded-sm p-8 sm:p-12 border border-border-line"
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-archival-grey mb-3">
                {audience.label}
              </p>
              <h3 className="font-bold text-3xl text-clinical-teal mb-6">
                {audience.headline}
              </h3>
              <div className="max-w-[700px] space-y-5">
                {audience.body.map((paragraph, i) => (
                  <p key={i} className="text-lg text-body-slate leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
              {audience.cta && (
                <div className="mt-8">
                  <a
                    href={audience.cta.href}
                    className="inline-block px-7 py-3.5 bg-inst-blue text-white font-bold tracking-wide text-sm hover:bg-clinical-teal transition rounded-sm"
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
