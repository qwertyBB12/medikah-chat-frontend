import Link from 'next/link';
import { useRouter } from 'next/router';

type Locale = 'en' | 'es';

interface AudienceData {
  headline: Record<Locale, string>;
  label: Record<Locale, string>;
  body: Record<Locale, string[]>;
  cta: {
    label: Record<Locale, string>;
    href: string;
    isInternal: boolean;
  };
}

const AUDIENCES: AudienceData[] = [
  {
    headline: {
      en: 'Coordination That Follows You',
      es: 'Coordinación Que Lo Acompaña',
    },
    label: {
      en: 'For Patients',
      es: 'Para Pacientes',
    },
    body: {
      en: [
        'Whether you live between countries, seek specialized care across borders, or need access to physicians in other jurisdictions\u2014Medikah coordinates your journey with institutional rigor and human attention.',
        'Our platform connects you with licensed physicians across the Americas for informational consultations about your health needs. Medical care happens in-person, in the provider\u2019s licensed jurisdiction, with full regulatory compliance and complete documentation.',
        'Your physicians collaborate across jurisdictions. Your care happens compliantly, continuously. Bilingual support at every step. Designed for real lives, not insurance categories.',
      ],
      es: [
        'Ya sea que viva entre países, busque atención especializada transfronteriza, o necesite acceso a médicos en otras jurisdicciones\u2014Medikah coordina su trayectoria con rigor institucional y atención humana.',
        'Nuestra plataforma lo conecta con médicos licenciados en las Américas para consultas informativas sobre sus necesidades de salud. La atención médica ocurre en persona, en la jurisdicción donde el proveedor está licenciado, con cumplimiento regulatorio completo y documentación completa.',
        'Sus médicos colaboran entre jurisdicciones. Su atención ocurre de manera conforme y continua. Soporte bilingüe en cada paso. Diseñado para vidas reales, no categorías de seguros.',
      ],
    },
    cta: {
      label: { en: 'Get Started', es: 'Comenzar' },
      href: '/chat?role=patient',
      isInternal: true,
    },
  },
  {
    headline: {
      en: 'Consult Across Borders. Deliver Care In-Person.',
      es: 'Consulte Transfronterizamente. Brinde Atención en Persona.',
    },
    label: {
      en: 'For Physicians',
      es: 'Para Médicos',
    },
    body: {
      en: [
        'Your expertise doesn\u2019t end at national borders. Neither should your patient relationships. Medikah enables cross-border patient consultation within clear regulatory and credentialing frameworks.',
        'Consult with patients across borders within compliant frameworks. Maintain longitudinal relationships regardless of where patients live. Coordinate seamlessly with referring physicians and specialists. Video consultations are informational and planning-focused. Medical diagnosis and treatment happen in-person, in your licensed jurisdiction.',
        'No regulatory gray zones. No jurisdictional ambiguity. Practice medicine as it should be\u2014focused on patient outcomes, not jurisdictional bureaucracy.',
      ],
      es: [
        'Su experiencia no termina en las fronteras nacionales. Tampoco deberían hacerlo sus relaciones con pacientes. Medikah permite la consulta transfronteriza de pacientes dentro de marcos regulatorios y de credenciales claros.',
        'Consulte con pacientes transfronterizamente dentro de marcos conformes. Mantenga relaciones longitudinales sin importar dónde vivan los pacientes. Coordine perfectamente con médicos y especialistas remitentes. Las videoconsultas son informativas y enfocadas en planificación. El diagnóstico y tratamiento médico ocurren en persona, en su jurisdicción licenciada.',
        'Sin zonas grises regulatorias. Sin ambigüedad jurisdiccional. Practique la medicina como debe ser\u2014enfocada en los resultados del paciente, no en la burocracia jurisdiccional.',
      ],
    },
    cta: {
      label: { en: 'Join as Physician', es: 'Unirse como Médico' },
      href: '/chat?role=physician',
      isInternal: true,
    },
  },
  {
    headline: {
      en: 'Coordination Infrastructure That Works',
      es: 'Infraestructura de Coordinación Que Funciona',
    },
    label: {
      en: 'For Institutions',
      es: 'Para Instituciones',
    },
    body: {
      en: [
        'Insurers, hospitals, and employers face the same challenge: patients and care move across borders, but systems don\u2019t. Medikah provides the coordination layer that allows your institution to operate across the Americas while remaining compliant, trusted, and economically sound.',
        'We don\u2019t replace your systems. We connect them. We don\u2019t bypass regulations. We navigate them. We don\u2019t create new bureaucracy. We reduce it.',
        'Partnership built on institutional standards, not marketplace economics.',
      ],
      es: [
        'Aseguradoras, hospitales y empleadores enfrentan el mismo desafío: los pacientes y la atención cruzan fronteras, pero los sistemas no. Medikah proporciona la capa de coordinación que permite a su institución operar en las Américas manteniéndose conforme, confiable y económicamente sólida.',
        'No reemplazamos sus sistemas. Los conectamos. No evadimos regulaciones. Las navegamos. No creamos nueva burocracia. La reducimos.',
        'Asociación construida sobre estándares institucionales, no economía de mercado.',
      ],
    },
    cta: {
      label: { en: 'Coming Soon', es: 'Próximamente' },
      href: 'mailto:partnerships@medikah.health',
      isInternal: false,
    },
  },
];

export default function Audiences() {
  const router = useRouter();
  const locale = (router.locale || 'en') as Locale;

  const sectionTitle = locale === 'es' ? 'A Quién Sirve Medikah' : 'Who Medikah Serves';

  return (
    <section className="bg-clinical-surface px-6 py-28 sm:py-36">
      <div className="max-w-5xl mx-auto">
        <h2 className="font-dm-serif text-4xl md:text-[52px] lg:text-[64px] text-inst-blue text-center mb-20 leading-[0.98] tracking-[-0.02em]">
          {sectionTitle}
        </h2>

        <div className="space-y-12">
          {AUDIENCES.map((audience) => (
            <div
              key={audience.label.en}
              className="bg-white shadow-[0_1px_3px_rgba(27,42,65,0.04),0_8px_24px_rgba(27,42,65,0.06)] rounded-lg p-8 sm:p-12"
            >
              <p className="font-dm-sans text-[13px] font-semibold uppercase tracking-[0.12em] text-archival-grey mb-3">
                {audience.label[locale]}
              </p>
              <h3 className="font-dm-serif text-2xl md:text-3xl text-clinical-teal mb-6 leading-[1.1]">
                {audience.headline[locale]}
              </h3>
              <div className="max-w-[700px] space-y-5">
                {audience.body[locale].map((paragraph, i) => (
                  <p key={i} className="font-dm-sans text-base md:text-lg text-body-slate leading-[1.7]">
                    {paragraph}
                  </p>
                ))}
              </div>
              <div className="mt-8">
                {audience.cta.isInternal ? (
                  <Link
                    href={audience.cta.href}
                    className="inline-block px-7 py-3.5 bg-clinical-teal text-white font-dm-sans font-semibold tracking-wide text-sm hover:bg-clinical-teal/90 transition-all duration-200 rounded-lg"
                  >
                    {audience.cta.label[locale]}
                  </Link>
                ) : (
                  <a
                    href={audience.cta.href}
                    className="inline-block px-7 py-3.5 bg-inst-blue text-white font-dm-sans font-semibold tracking-wide text-sm hover:bg-clinical-teal transition-colors duration-200"
                  >
                    {audience.cta.label[locale]}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
