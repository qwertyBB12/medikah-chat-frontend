import Link from 'next/link';

export default function RegulatoryDisclosure() {
  return (
    <section className="bg-clinical-surface px-6 py-16">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white border border-clinical-teal/20 rounded-[12px] p-8 sm:p-10">
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-8 h-8 rounded-full bg-clinical-teal/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-clinical-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-lg text-inst-blue mb-4">
                Important Information About Medikah
              </h3>
              <div className="space-y-4 text-body-slate text-base leading-relaxed">
                <p>
                  Medikah is a HIPAA-compliant technology platform. We provide video
                  conferencing, scheduling, billing, and coordination services to connect
                  patients with independent, licensed healthcare providers.
                </p>
                <p>
                  <strong className="text-deep-charcoal">We are not healthcare providers.</strong> We do not employ or supervise physicians.
                  We do not provide medical care, diagnosis, or treatment.
                </p>
                <p>
                  Medical diagnosis and treatment are provided by independent, licensed physicians
                  in their jurisdictions. All providers using Medikah maintain their own medical
                  licenses, malpractice insurance, and regulatory compliance.
                </p>
                <p>
                  Cross-border video consultations are for informational and planning purposes.
                  Final diagnosis and treatment occur in-person, in the country where the provider
                  is licensed, in accordance with that country&rsquo;s medical regulations.
                </p>
                <p className="text-sm text-archival-grey">
                  Read our{' '}
                  <Link href="/terms" className="text-clinical-teal hover:underline">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-clinical-teal hover:underline">
                    Privacy Policy
                  </Link>{' '}
                  for complete details.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
