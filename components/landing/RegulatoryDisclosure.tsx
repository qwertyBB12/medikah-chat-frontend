import Link from 'next/link';
import { useRouter } from 'next/router';

export default function RegulatoryDisclosure() {
  const router = useRouter();
  const isEs = router.locale === 'es';

  return (
    <section className="bg-linen-light px-6 py-16">
      <div className="max-w-4xl mx-auto">
        <div className="bg-linen-white border border-teal-500/20 rounded-lg p-8 sm:p-10">
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-8 h-8 rounded-full bg-teal-500/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
              </svg>
            </div>
            <div>
              <h3 className="font-heading text-xl uppercase text-deep-charcoal mb-4">
                {isEs ? 'Informaci\u00f3n Importante Sobre Medikah' : 'Important Information About Medikah'}
              </h3>
              <div className="space-y-4 font-body text-text-secondary text-base leading-[1.7]">
                <p>
                  {isEs
                    ? 'Medikah es una plataforma tecnol\u00f3gica compatible con HIPAA.'
                    : 'Medikah is a HIPAA-compliant technology platform.'}
                </p>
                <p>
                  <strong className="text-deep-charcoal">
                    {isEs
                      ? 'No somos proveedores de salud.'
                      : 'We are not healthcare providers.'}
                  </strong>{' '}
                  {isEs
                    ? 'No empleamos ni supervisamos m\u00e9dicos. No proporcionamos atenci\u00f3n m\u00e9dica, diagn\u00f3stico ni tratamiento.'
                    : 'We do not employ or supervise physicians. We do not provide medical care, diagnosis, or treatment.'}
                </p>
                <p>
                  {isEs
                    ? 'El diagn\u00f3stico y tratamiento m\u00e9dico son proporcionados por m\u00e9dicos independientes y licenciados en sus jurisdicciones.'
                    : 'Medical diagnosis and treatment are provided by independent, licensed physicians in their jurisdictions. All providers using Medikah maintain their own medical licenses, malpractice insurance, and regulatory compliance.'}
                </p>
                <p>
                  {isEs
                    ? 'Las videoconsultas transfronterizas son con fines informativos y de planificaci\u00f3n. El diagn\u00f3stico y tratamiento final ocurren en persona.'
                    : 'Cross-border video consultations are for informational and planning purposes. Final diagnosis and treatment occur in-person, in the country where the provider is licensed, in accordance with that country\u2019s medical regulations.'}
                </p>
                <p className="text-sm text-text-muted">
                  {isEs ? 'Lea nuestros ' : 'Read our '}
                  <Link href="/terms" className="text-teal-500 hover:underline">
                    {isEs ? 'T\u00e9rminos de Servicio' : 'Terms of Service'}
                  </Link>{' '}
                  {isEs ? 'y ' : 'and '}
                  <Link href="/privacy" className="text-teal-500 hover:underline">
                    {isEs ? 'Pol\u00edtica de Privacidad' : 'Privacy Policy'}
                  </Link>{' '}
                  {isEs ? 'para detalles completos.' : 'for complete details.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
