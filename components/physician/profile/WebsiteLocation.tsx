import FadeInSection from './FadeInSection';

interface Props {
  officeAddress?: string;
  officeCity?: string;
  officeCountry?: string;
  officePhone?: string;
  officeEmail?: string;
  appointmentUrl?: string;
  isEs: boolean;
}

export default function WebsiteLocation({
  officeAddress,
  officeCity,
  officeCountry,
  officePhone,
  officeEmail,
  appointmentUrl,
  isEs,
}: Props) {
  const hasAddress = officeAddress || officeCity || officeCountry;
  const hasContact = officePhone || officeEmail || appointmentUrl;

  if (!hasAddress && !hasContact) {
    return null;
  }

  const addressParts = [officeAddress, officeCity, officeCountry].filter(Boolean);

  return (
    <section className="py-24 md:py-36">
      <div className="max-w-5xl mx-auto px-6 md:px-8">
        <FadeInSection>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-px bg-teal-500" />
            <p className="font-body text-[0.6875rem] font-medium uppercase tracking-[0.25em] text-teal-500">
              {isEs ? 'Ubicación y Contacto' : 'Location & Contact'}
            </p>
          </div>
          <h2 className="font-heading text-[clamp(2rem,4vw,3.5rem)] font-medium uppercase leading-[0.95] tracking-[-0.02em] text-deep-charcoal mb-16 max-w-3xl">
            {isEs ? 'Cómo contactarme' : 'How to reach me'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Address card */}
            {hasAddress && (
              <article className="bg-linen-white border border-warm-gray-800/[0.06] rounded-lg p-8">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-teal-500/[0.08] flex items-center justify-center">
                    <svg className="w-5 h-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-dm-sans font-bold text-deep-charcoal mb-2">
                      {isEs ? 'Dirección' : 'Address'}
                    </h3>
                    <p className="font-dm-sans text-sm text-body-slate leading-relaxed">
                      {addressParts.join(', ')}
                    </p>
                  </div>
                </div>
              </article>
            )}

            {/* Contact card */}
            {hasContact && (
              <article className="bg-linen-white border border-warm-gray-800/[0.06] rounded-lg p-8">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-teal-500/[0.08] flex items-center justify-center">
                    <svg className="w-5 h-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-dm-sans font-bold text-deep-charcoal mb-2">
                      {isEs ? 'Contacto' : 'Contact'}
                    </h3>
                    {officePhone && (
                      <p className="font-dm-sans text-sm text-body-slate">
                        <a
                          href={`tel:${officePhone}`}
                          className="text-teal-500 hover:underline"
                        >
                          {officePhone}
                        </a>
                      </p>
                    )}
                    {officeEmail && (
                      <p className="font-dm-sans text-sm text-body-slate">
                        <a
                          href={`mailto:${officeEmail}`}
                          className="text-teal-500 hover:underline"
                        >
                          {officeEmail}
                        </a>
                      </p>
                    )}
                  </div>
                </div>
              </article>
            )}
          </div>

          {appointmentUrl && (
            <div className="mt-8">
              <a
                href={appointmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center font-body text-[0.8125rem] font-medium uppercase tracking-[0.04em] px-9 py-3.5 bg-teal-500 text-white border-2 border-teal-500 rounded-lg hover:bg-teal-600 hover:border-teal-600 hover:-translate-y-[3px] hover:shadow-[0_12px_32px_rgba(44,122,140,0.3)] transition-all duration-300"
              >
                {isEs ? 'Agendar Cita' : 'Schedule Appointment'}
              </a>
            </div>
          )}
        </FadeInSection>
      </div>
    </section>
  );
}
