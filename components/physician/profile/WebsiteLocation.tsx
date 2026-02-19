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
    <section className="bg-linen py-24 md:py-36">
      <div className="max-w-5xl mx-auto px-6 md:px-8">
        <FadeInSection>
          <p className="text-[13px] uppercase tracking-[0.15em] text-clinical-teal font-semibold mb-4">
            {isEs ? 'Ubicación y Contacto' : 'Location & Contact'}
          </p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-[-0.025em] text-inst-blue mb-16 max-w-3xl">
            {isEs ? 'Cómo contactarme' : 'How to reach me'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Address card */}
            {hasAddress && (
              <article className="bg-white rounded-[12px] border border-border-line p-8 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-clinical-teal/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-clinical-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
              <article className="bg-white rounded-[12px] border border-border-line p-8 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-clinical-teal/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-clinical-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
                          className="text-clinical-teal hover:underline"
                        >
                          {officePhone}
                        </a>
                      </p>
                    )}
                    {officeEmail && (
                      <p className="font-dm-sans text-sm text-body-slate">
                        <a
                          href={`mailto:${officeEmail}`}
                          className="text-clinical-teal hover:underline"
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
                className="inline-flex items-center justify-center font-dm-sans font-bold text-sm tracking-wide transition-all duration-300 rounded-lg px-8 py-3 bg-clinical-teal text-white hover:bg-clinical-teal/90"
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
