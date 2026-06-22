import { FormEvent, Fragment, useRef, useState } from 'react';
import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Nav from '../components/landing/Nav';
import CurveDivider from '../components/landing/CurveDivider';
import CdmxDoctorChat from '../components/CdmxDoctorChat';
import LandingFooter from '../components/landing/LandingFooter';
import { CDMX_SESSION_DAYS, CDMX_MAX_PREFERENCES, cdmxSessionLabel } from '../lib/cdmxSessions';

type Lang = 'es' | 'en';

const COPY = {
  eyebrowA:  { es: 'Médicos especialistas', en: 'Specialist physicians' },
  eyebrowB:  { es: 'Ciudad de México · Mundial 2026', en: 'Mexico City · 2026 World Cup' },
  h1a:       { es: 'medikah.health', en: 'medikah.health' },
  h1pull1:   { es: 'La medicina ya cambió.', en: 'Medicine already changed.' },
  h1pull2:   { es: '¿Y su consulta?', en: 'Has your practice?' },
  h1b:       { es: 'Llega a México', en: 'Arrives in Mexico' },
  lead:      {
    es: 'Salud sin distancia llega a México. Medikah Health, compañía estadounidense fundada por médicos latinoamericanos y estadounidenses, llega para transformar la práctica médica. Algo grande comienza, y comienza con los médicos. Estamos aquí para acompañarle en cada paso.',
    en: 'Care without distance arrives in Mexico. Medikah Health, an American company founded by Latin American and American physicians, is arriving to transform medical practice. Something big is beginning, and it begins with physicians. We are here to support you at every step.',
  },
  cinematicLine1: {
    es: 'El mundo llega a México este verano.',
    en: 'The world arrives in Mexico this summer.',
  },
  cinematicLine2: {
    es: 'Y mientras la ciudad recibe al Mundial, la inteligencia artificial entra al consultorio del especialista.',
    en: "And as the city welcomes the World Cup, artificial intelligence enters the specialist's office.",
  },
  thresholdClose1: {
    es: 'Si la inteligencia artificial ya forma parte de sus preguntas sobre el futuro de su práctica,',
    en: 'If artificial intelligence is already part of your questions about the future of your practice,',
  },
  thresholdClose2: {
    es: 'esta sesión es para usted.',
    en: 'this session is for you.',
  },
  whenLabel: { es: 'Cuándo', en: 'When' },
  whenVal:   { es: '22 – 30 de junio de 2026\nTres sesiones al día: 9:00, 13:00 y 17:00\nCiudad de México', en: 'June 22 – 30, 2026\nThree sessions daily: 9:00, 13:00 & 17:00\nMexico City' },
  whereLabel:{ es: 'Dónde', en: 'Where' },
  whereVal:  { es: 'Chez Vous #TimeCafé (Parque Hundido) · Av. Insurgentes Sur 1188, Del Valle, CDMX', en: 'Chez Vous #TimeCafé (Parque Hundido) · Insurgentes Sur 1188, Del Valle, Mexico City' },
  formTitle: { es: 'Confirme su interés', en: 'Register your interest' },
  formSub:   { es: 'Déjenos sus datos y le enviaremos los detalles del lugar y el horario.', en: 'Leave your details and we will send you the venue and schedule.' },
  whatsappLabel: { es: 'WhatsApp (con código de país)', en: 'WhatsApp (with country code)' },
  whatsappPh:    { es: '+52 55 1234 5678', en: '+52 55 1234 5678' },
  passNote:      { es: 'Le enviaremos su pase por WhatsApp.', en: "We'll send your pass via WhatsApp." },
  pickerLabel:   { es: 'Elija hasta tres sesiones en orden de preferencia', en: 'Choose up to three sessions in order of preference' },
  pickerHint:    {
    es: 'Según la disponibilidad, le asignaremos su lugar siguiendo su orden de selección y se lo confirmaremos por WhatsApp y correo.',
    en: 'Based on availability, you will be placed in your order of preference and we will confirm your seat by WhatsApp and email.',
  },
  cohortNote:    { es: 'Cada sesión reúne a un grupo selecto de médicos.', en: 'Each session brings together a select group of physicians.' },
  freeNote:      { es: 'La participación no tiene costo.', en: 'Participation is free of charge.' },
  cafeNote:      { es: 'Nos reunimos en un café, y cada colega atiende su propio consumo, como en toda buena reunión entre colegas.', en: 'We gather at a café, and each colleague looks after their own order, as at any good meeting among colleagues.' },
  professionOpt: { es: 'Profesión (opcional)', en: 'Profession (optional)' },
  pointsNote:    { es: 'Entre más participa, más puntos acumula hacia su certificación en IA.', en: 'The more you take part, the more points toward your AI certification.' },
  name:      { es: 'Nombre', en: 'Name' },
  email:     { es: 'Correo', en: 'Email' },
  profession:{ es: 'Profesión (opcional)', en: 'Profession (optional)' },
  professionPh: { es: 'p. ej. Médico, Enfermería, Inversionista…', en: 'e.g. Physician, Nurse, Investor…' },
  submit:    { es: 'Quiero asistir', en: "I'd like to attend" },
  sending:   { es: 'Enviando…', en: 'Sending…' },
  thankTitle:{ es: '¡Le esperamos!', en: 'See you there!' },
  thankBody: { es: 'Gracias por registrarse. Revise su correo: le enviamos una confirmación con los detalles.', en: 'Thank you for registering. Check your inbox: we sent a confirmation with the details.' },
  duplicate: { es: 'Este correo ya está registrado. ¡Nos vemos en CDMX!', en: 'This email is already registered. See you in Mexico City!' },
  error:     { es: 'Algo salió mal. Inténtalo de nuevo.', en: 'Something went wrong. Please try again.' },

  // what you join — the belonging payoff
  receiveEyebrow: { es: 'Para el médico', en: 'For the physician' },
  receiveTitle:   { es: 'Lo que ponemos en sus manos', en: 'What we place in your hands' },

  // event substance
  expectEyebrow: { es: 'Más que una charla', en: 'More than a talk' },
  certBadge:  { es: 'Primera de su tipo', en: 'First of its kind' },
  certTitle:  { es: 'Certificación internacional en IA para la medicina', en: 'International certification in AI for medicine' },
  certBody:   {
    es: 'La primera de su tipo: una certificación internacional en inteligencia artificial aplicada a la medicina, impartida por médicos y expertos en el campo, y certificada por New eXponential Thought Organization de Estados Unidos. Son certificaciones acumulables que construyen hacia una certificación profesional.',
    en: 'The first of its kind: an international certification in artificial intelligence for medicine, taught by physicians and experts in the field, and certified by New eXponential Thought Organization of the United States. These are stackable certifications that build toward a professional credential.',
  },
  p1t: { es: 'Qué puede hacer la IA hoy', en: 'What AI can do today' },
  p1b: { es: 'Agenda, citas, correo y comunicación con pacientes. Con demostraciones en vivo.', en: 'Scheduling, appointments, email, and patient communication. With live demonstrations.' },
  p2t: { es: 'Cómo evaluar una herramienta', en: 'How to evaluate a tool' },
  p2b: { es: 'Criterio clínico y de privacidad para decidir qué adoptar en su consulta.', en: 'Clinical and privacy judgment to decide what to adopt in your practice.' },
  p3t: { es: 'Una conversación entre colegas', en: 'A conversation among colleagues' },
  p3b: { es: 'Médicos de México y del extranjero que ya usan estas herramientas en su práctica.', en: 'Physicians from Mexico and abroad already using these tools in their practice.' },

  speakersEyebrow: { es: 'Ponentes', en: 'Speakers' },
  speakersMore:    { es: 'Más ponentes por anunciar', en: 'More speakers to be announced' },

  toolsEyebrow: { es: 'Para médicos', en: 'For physicians' },
  toolsTitle:   { es: 'Inteligencia artificial para su práctica y su vida como médico', en: 'Artificial intelligence for your practice and your life as a physician' },
  toolsBody:    {
    es: 'Medikah llega a México con herramientas de inteligencia artificial para médicos: todo lo que necesita para su práctica, y le capacitamos en su uso.',
    en: 'Medikah comes to Mexico with AI tools for physicians: everything you need for your practice, and we train you to use it.',
  },
  toolsFree:    { es: 'Y lo mejor: sin costo para usted.', en: 'And the best part: at no cost to you.' },
  toolsCaption: { es: 'Un vistazo a su asistente clínico', en: 'A look at your clinical assistant' },

  videoEyebrow: { es: 'En sus palabras', en: 'In his words' },
  videoTitle:   { es: 'Dr. José Luis Aguirre, MD', en: 'Dr. José Luis Aguirre, MD' },
  videoCred:    { es: 'Geriatric Medicine Fellow, Baylor College of Medicine · Director Médico, Medikah Health', en: 'Geriatric Medicine Fellow, Baylor College of Medicine · Chief Medical Officer, Medikah Health' },
  videoTopic:   { es: 'Sobre la IA en la medicina', en: 'On AI in medicine' },
  videoSoon:    { es: 'Video disponible muy pronto', en: 'Video available very soon' },
} as const;

// Served direct from B2 public bucket for launch; front with Bunny CDN later.
const VIDEO_SRC = 'https://f004.backblazeb2.com/file/medikah-public/jla-md.mp4';

// What a physician joins (not what they attend) — the asset-aggregation model as desire.
const RECEIVE: { title: { es: string; en: string }; body: { es: string; en: string } }[] = [
  { title: { es: 'Su dominio y correo profesional', en: 'Your own professional domain and email' },
    body:  { es: 'Una identidad propia: suapellido.medikah.health, suya desde el primer día.', en: 'An identity of your own: yourname.medikah.health, yours from day one.' } },
  { title: { es: 'Herramientas de IA para su práctica', en: 'AI tools for your practice' },
    body:  { es: 'Agenda, pacientes y expediente asistidos por inteligencia artificial. Sin costo.', en: 'Scheduling, patients, and records assisted by AI. At no cost.' } },
  { title: { es: 'El camino a la certificación', en: 'The path to certification' },
    body:  { es: 'Certificaciones acumulables hacia una credencial internacional en IA médica.', en: 'Stackable certifications toward an international credential in medical AI.' } },
  { title: { es: 'Una red de especialistas', en: 'A network of specialists' },
    body:  { es: 'Colegas de México y del mundo, reunidos bajo una misma plataforma.', en: 'Colleagues from Mexico and the world, under one platform.' } },
];

// img: drop a file in /public/speakers/ and set the path; until then, initials show.
// focus/zoom fine-tune face framing inside the circle so all faces match.
// `inst` = the one marquee institution that lands as borrowed authority, attached
// directly to the person (Hector's call: Georgetown under him, Baylor under José,
// Perinatología under Erika, etc.). Honest provenance, never implied sponsorship.
const SPEAKERS: {
  name: string; img?: string; bgSize?: string; bgPos?: string; flags?: { es: string; en: string };
  role: { es: string[]; en: string[] }; inst?: string;
}[] = [
  { name: 'Dr. José Luis Aguirre, MD', img: '/speakers/aguirre.jpg', bgPos: 'center 18%', flags: { es: 'EE.UU. · México', en: 'U.S. · Mexico' },
    inst: 'Baylor College of Medicine',
    role: { es: ['Presidente del Consejo', 'y Director Médico', 'Medikah Health'],
            en: ['Board President', '& Chief Medical Officer', 'Medikah Health'] } },
  { name: 'Dra. Erika Torres Valdez, MD', img: '/speakers/erika.jpg', bgPos: 'center 20%', flags: { es: 'México', en: 'Mexico' },
    inst: 'Instituto Nacional de Perinatología',
    role: { es: ['Uroginecóloga', 'Experta en IA en medicina', 'Consejos COMEGO y FEMECOG'],
            en: ['Urogynecologist', 'AI-in-medicine expert', 'COMEGO & FEMECOG boards'] } },
  { name: 'Hector H. Lopez, MA, MPL', img: '/speakers/hector-lopez.png', bgPos: 'center 22%', flags: { es: 'EE.UU.', en: 'U.S.' },
    inst: 'Georgetown University',
    role: { es: ['CEO', 'Medikah Health'],
            en: ['CEO', 'Medikah Health'] } },
  { name: 'Lic. Luis Ignacio López García, Esq.', img: '/speakers/luis-ignacio.jpg', bgSize: '130%', bgPos: 'center 28%', flags: { es: 'España · México', en: 'Spain · Mexico' },
    inst: 'Jones Day',
    role: { es: ['Abogado', 'Derecho corporativo y M&A'],
            en: ['Attorney', 'Corporate Law & M&A'] } },
  { name: 'Lic. Maricarmen Flores Soberón, Esq.', img: '/speakers/maricarmen.png', bgSize: 'cover', bgPos: 'center', flags: { es: 'México', en: 'Mexico' },
    inst: 'ex-COFEPRIS',
    role: { es: ['Abogada', 'Compliance y derecho sanitario'],
            en: ['Attorney', 'Compliance & health law'] } },
  { name: 'Ing. Luis Gerardo Cárdenas, MPL', img: '/speakers/cardenas.webp', bgSize: '200%', bgPos: 'center 18%', flags: { es: 'México · Francia', en: 'Mexico · France' },
    inst: 'Arkah',
    role: { es: ['Director Ejecutivo', 'Tecnología, robótica e IA'],
            en: ['Executive Director', 'Technology, robotics & AI'] } },
];

const initials = (n: string) =>
  n.replace(/^Dr[a]?\.\s*/, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

export default function CdmxLanding() {
  const router = useRouter();
  const lang: Lang = router.locale === 'es' ? 'es' : 'en';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [profession, setProfession] = useState('');
  const [sessions, setSessions] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'duplicate' | 'error'>('idle');
  const t = (k: keyof typeof COPY) => COPY[k][lang];
  // Ordered selection: click order = preference order, capped at 3
  const toggleSession = (id: string) => setSessions((cur) => {
    if (cur.includes(id)) return cur.filter((x) => x !== id);
    if (cur.length >= CDMX_MAX_PREFERENCES) return cur;
    return [...cur, id];
  });

  // funnel tracking: fire once when a visitor starts the form, and on completion
  const startedRef = useRef(false);
  const track = (event: string) => { try { (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag?.('event', event, { page: 'cdmx' }); } catch {} };
  const onFormStart = () => { if (!startedRef.current) { startedRef.current = true; track('cdmx_rsvp_started'); } };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !whatsapp.trim()) return;
    setStatus('sending');
    try {
      const res = await fetch('/api/cdmx-rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), whatsapp: whatsapp.trim(), profession: profession.trim(), sessions, locale: lang }),
      });
      if (res.status === 409) { setStatus('duplicate'); track('cdmx_rsvp_completed'); }
      else if (res.ok) { setStatus('success'); track('cdmx_rsvp_completed'); }
      else setStatus('error');
    } catch {
      setStatus('error');
    }
  };

  return (
    <>
      <Head>
        <title>medikah health llega a CDMX · 22–30 junio 2026</title>
        <meta name="description" content="Medikah Health llega a la Ciudad de México. Sesiones para médicos especialistas, del 22 al 30 de junio de 2026, tres por día. Primera certificación internacional en IA médica. Registro sin costo en medikah.health/cdmx." />
        <link rel="canonical" href="https://medikah.health/cdmx" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://medikah.health/cdmx" />
        <meta property="og:title" content="medikah health llega a CDMX" />
        <meta property="og:description" content="Médicos especialistas · 22–30 de junio de 2026 · Ciudad de México. Primera certificación internacional en IA médica." />
        <meta property="og:image" content="https://medikah.health/cdmx-og.png" />
        <meta property="og:image:secure_url" content="https://medikah.health/cdmx-og.png" />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Medikah Health llega a la Ciudad de México. La medicina ya cambió, ¿y tu consulta?" />
        <meta property="og:site_name" content="Medikah Health" />
        <meta property="og:locale" content="es_MX" />
        <meta property="og:locale:alternate" content="en_US" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="medikah health llega a CDMX" />
        <meta name="twitter:description" content="Médicos especialistas · 22–30 de junio de 2026 · Ciudad de México. Primera certificación internacional en IA médica." />
        <meta name="twitter:image" content="https://medikah.health/cdmx-og.png" />
        <meta name="twitter:image:alt" content="Medikah Health llega a la Ciudad de México. La medicina ya cambió, ¿y tu consulta?" />
        <meta name="robots" content="index,follow" />
      </Head>

      <Nav />

      <main className="bg-inst-blue text-white">
        {/* hero */}
        <section className="relative overflow-hidden px-6 pt-28 pb-20 sm:pt-36 sm:pb-28">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{ background: 'radial-gradient(60% 80% at 85% 20%, rgba(58,157,179,0.28), transparent 60%)' }}
          />
          <div className="relative mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-2">
            {/* left: invitation */}
            <div>
              <p className="font-body text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-teal-300 sm:text-[0.8rem] sm:tracking-[0.32em]">
                {t('eyebrowA')}<span className="hidden sm:inline"> · </span><span className="block sm:inline">{t('eyebrowB')}</span>
              </p>
              <h1 className="mt-5">
                <span className="block font-heading text-4xl font-semibold uppercase leading-[0.98] tracking-[0.01em] text-white sm:text-6xl sm:leading-[0.95]">
                  {t('h1pull1')}
                </span>
                <span className="block font-heading text-4xl font-semibold uppercase leading-[0.98] tracking-[0.01em] text-teal-300 sm:text-6xl sm:leading-[0.95]">
                  {t('h1pull2')}
                </span>
                <span className="mt-6 block font-body text-xl font-medium lowercase tracking-[0.02em] text-white sm:mt-7 sm:text-3xl">
                  medikah<span className="text-teal-300">.health</span>
                </span>
                <span className="mt-1 block font-heading text-sm font-medium uppercase tracking-[0.14em] text-white/60 sm:text-lg">
                  {t('h1b')}
                </span>
              </h1>
              <p className="mt-6 max-w-md font-body text-base leading-relaxed text-white/80 sm:mt-7 sm:text-lg">
                {t('lead')}
              </p>
              <dl className="mt-9 space-y-4">
                <div className="flex items-baseline gap-4">
                  <dt className="w-16 shrink-0 font-body text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-teal-300">{t('whenLabel')}</dt>
                  <dd className="whitespace-pre-line font-body text-base leading-relaxed text-white/85">{t('whenVal')}</dd>
                </div>
                <div className="flex items-baseline gap-4">
                  <dt className="w-16 shrink-0 font-body text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-teal-300">{t('whereLabel')}</dt>
                  <dd className="font-body text-base text-white/85">{t('whereVal')}</dd>
                </div>
              </dl>
            </div>

            {/* right: RSVP card */}
            <div className="rounded-lg bg-white p-8 shadow-2xl sm:p-10">
              {status === 'success' || status === 'duplicate' ? (
                <div className="py-8 text-center">
                  <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-clinical-teal/10">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2C7A8C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </div>
                  <h2 className="font-heading text-2xl font-semibold uppercase tracking-wide text-inst-blue">{t('thankTitle')}</h2>
                  <p className="mx-auto mt-3 max-w-xs font-body text-base leading-relaxed text-body-slate">
                    {status === 'duplicate' ? t('duplicate') : t('thankBody')}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} onFocusCapture={onFormStart} className="space-y-5">
                  <div>
                    <h2 className="font-heading text-2xl font-semibold uppercase tracking-wide text-inst-blue">{t('formTitle')}</h2>
                    <p className="mt-2 font-body text-sm leading-relaxed text-body-slate">{t('formSub')}</p>
                  </div>
                  <div>
                    <label className="mb-1.5 block font-body text-xs font-semibold uppercase tracking-wider text-archival-grey">{t('name')}</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
                      className="w-full rounded-sm border border-clinical-surface bg-clinical-surface px-4 py-3 font-body text-base text-inst-blue outline-none transition-colors focus:border-clinical-teal focus:bg-white" />
                  </div>
                  <div>
                    <label className="mb-1.5 block font-body text-xs font-semibold uppercase tracking-wider text-archival-grey">{t('email')}</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                      className="w-full rounded-sm border border-clinical-surface bg-clinical-surface px-4 py-3 font-body text-base text-inst-blue outline-none transition-colors focus:border-clinical-teal focus:bg-white" />
                  </div>
                  <div>
                    <label className="mb-1.5 block font-body text-xs font-semibold uppercase tracking-wider text-archival-grey">{t('whatsappLabel')}</label>
                    <input type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} required placeholder={t('whatsappPh')}
                      className="w-full rounded-sm border border-clinical-surface bg-clinical-surface px-4 py-3 font-body text-base text-inst-blue outline-none transition-colors placeholder:text-archival-grey/70 focus:border-clinical-teal focus:bg-white" />
                    <p className="mt-1.5 font-body text-xs text-archival-grey">{t('passNote')}</p>
                  </div>
                  <div>
                    <label className="mb-1.5 block font-body text-xs font-semibold uppercase tracking-wider text-archival-grey">{t('profession')}</label>
                    <input type="text" value={profession} onChange={(e) => setProfession(e.target.value)} placeholder={t('professionPh')}
                      className="w-full rounded-sm border border-clinical-surface bg-clinical-surface px-4 py-3 font-body text-base text-inst-blue outline-none transition-colors placeholder:text-archival-grey/70 focus:border-clinical-teal focus:bg-white" />
                  </div>
                  <div>
                    <label className="mb-2 block font-body text-xs font-semibold uppercase tracking-wider text-archival-grey">{t('pickerLabel')}</label>
                    {/* schedule grid: header row of time slots, one row per day */}
                    <div className="grid grid-cols-[3.5rem_1fr_1fr_1fr] items-center gap-1.5">
                      <span aria-hidden />
                      {CDMX_SESSION_DAYS[0].slots.map((s) => (
                        <span key={s.id} className="text-center font-body text-[0.65rem] font-semibold text-archival-grey">
                          {s.label.replace(/\s/g, '')}
                        </span>
                      ))}
                      {CDMX_SESSION_DAYS.map((d) => (
                        <Fragment key={d.id}>
                          <span className="font-body text-xs font-semibold text-inst-blue">
                            {d.weekday[lang]} {d.dayNum}
                          </span>
                          {d.slots.map((s) => {
                            const idx = sessions.indexOf(s.sessionId);
                            const selected = idx !== -1;
                            return (
                              <button
                                type="button"
                                key={s.sessionId}
                                onClick={() => toggleSession(s.sessionId)}
                                aria-pressed={selected}
                                aria-label={cdmxSessionLabel(s.sessionId, lang)}
                                className={`flex h-9 items-center justify-center rounded-sm border font-body text-sm font-semibold transition-colors ${
                                  selected
                                    ? 'border-clinical-teal bg-clinical-teal text-white'
                                    : 'border-clinical-surface bg-clinical-surface text-archival-grey hover:border-clinical-teal/50'
                                }`}
                              >
                                {selected ? idx + 1 : ''}
                              </button>
                            );
                          })}
                        </Fragment>
                      ))}
                    </div>
                    <p className="mt-2.5 font-body text-xs leading-relaxed text-archival-grey">{t('pickerHint')}</p>
                    <p className="mt-1.5 font-body text-xs font-semibold text-inst-blue/75">{t('cohortNote')}</p>
                  </div>
                  <p className="font-body text-xs leading-relaxed text-clinical-teal">{t('pointsNote')}</p>
                  {status === 'error' && <p className="font-body text-sm text-alert-garnet">{t('error')}</p>}
                  <button type="submit" disabled={status === 'sending'}
                    className="w-full rounded-sm bg-teal-500 px-7 py-3.5 font-body text-sm font-semibold uppercase tracking-wider text-white transition-all duration-200 hover:bg-teal-600 disabled:opacity-60">
                    {status === 'sending' ? t('sending') : t('submit')}
                  </button>
                  <p className="text-center font-body text-sm font-semibold text-clinical-teal">{t('freeNote')}</p>
                  <p className="mx-auto max-w-sm text-balance text-center font-body text-xs leading-relaxed text-archival-grey">{t('cafeNote')}</p>
                </form>
              )}
            </div>
          </div>
        </section>

        {/* cinematic arrival band — the page's inhale; refined, light, easy to digest */}
        <section className="px-6 pb-14 pt-8 text-center sm:pb-20 sm:pt-12">
          <p className="font-body text-lg font-light leading-tight tracking-[0.04em] text-linen sm:text-xl">
            {t('cinematicLine1')}
          </p>
          <p className="mx-auto mt-1 max-w-xl text-balance font-body text-sm font-light leading-snug tracking-[0.03em] text-linen/65 sm:text-base">
            {t('cinematicLine2')}
          </p>
        </section>
      </main>

      {/* arc transition (navy hero → linen) — matches homepage rhythm */}
      <CurveDivider from="#1B2A41" bg="#F0EAE0" />

      {/* event substance, on linen so the dark footer lifts against light */}
      <div className="bg-linen">
        <section className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <p className="text-center font-body text-[0.8rem] font-semibold uppercase tracking-[0.32em] text-clinical-teal">
            {t('expectEyebrow')}
          </p>

          {/* certification highlight — the centerpiece */}
          <div className="mx-auto mt-8 max-w-3xl rounded-lg bg-inst-blue p-8 text-center text-white shadow-xl sm:p-12">
            <span className="inline-block rounded-sm bg-clinical-teal/20 px-3 py-1 font-body text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-teal-300">
              {t('certBadge')}
            </span>
            <h2 className="mt-5 font-heading text-3xl font-semibold uppercase leading-tight tracking-wide sm:text-4xl">
              {t('certTitle')}
            </h2>
            <p className="mx-auto mt-5 max-w-2xl font-body text-lg leading-relaxed text-white/80">
              {t('certBody')}
            </p>
          </div>

          {/* what you join — the belonging payoff (asset-aggregation model as desire) */}
          <div className="mx-auto mt-20 max-w-4xl">
            <p className="text-center font-body text-[0.8rem] font-semibold uppercase tracking-[0.32em] text-clinical-teal">
              {t('receiveEyebrow')}
            </p>
            <h2 className="mx-auto mt-4 max-w-2xl text-center font-heading text-3xl font-semibold uppercase leading-tight tracking-wide text-inst-blue sm:text-4xl">
              {t('receiveTitle')}
            </h2>
            <div className="mt-12 grid gap-x-10 gap-y-9 sm:grid-cols-2">
              {RECEIVE.map((r, i) => (
                <div key={i} className="flex gap-4">
                  <span className="mt-0.5 shrink-0 font-heading text-2xl font-semibold tabular-nums text-clinical-teal/55">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className="font-body text-lg font-bold leading-snug text-inst-blue">{r.title[lang]}</h3>
                    <p className="mt-1.5 font-body text-base leading-relaxed text-body-slate">{r.body[lang]}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* speakers — the bench, each face carrying its marquee institution */}
          <div className="mt-20 text-center">
            <p className="font-body text-[0.8rem] font-semibold uppercase tracking-[0.32em] text-clinical-teal">
              {t('speakersEyebrow')}
            </p>
            <div className="mx-auto mt-10 flex max-w-5xl flex-wrap justify-center gap-x-8 gap-y-12">
              {SPEAKERS.map((s) => (
                <div key={s.name} className="flex w-64 flex-col items-center text-center">
                  <div
                    className="h-28 w-28 overflow-hidden rounded-full bg-inst-blue bg-no-repeat shadow-lg ring-2 ring-clinical-teal/30"
                    style={s.img ? { backgroundImage: `url(${s.img})`, backgroundSize: s.bgSize ?? 'cover', backgroundPosition: s.bgPos ?? 'center 25%' } : undefined}
                    role="img" aria-label={s.name}
                  >
                    {!s.img && (
                      <span className="flex h-full w-full items-center justify-center font-heading text-3xl font-semibold tracking-wide text-teal-300">
                        {initials(s.name)}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-5 font-body text-[1.05rem] font-semibold leading-snug text-inst-blue">{s.name}</h3>
                  {s.flags && <div className="mt-1.5 font-body text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-archival-grey">{s.flags[lang]}</div>}
                  <div className="mt-1.5 space-y-0.5">
                    {s.role[lang].map((line, i) => (
                      <p key={i} className={`font-body leading-snug ${i === 0 ? 'text-sm font-semibold text-clinical-teal' : 'text-[0.82rem] text-body-slate'}`}>
                        {line}
                      </p>
                    ))}
                  </div>
                  {s.inst && (
                    <div className="mt-3 flex flex-col items-center">
                      <span aria-hidden className="mb-2 h-px w-8 bg-clinical-teal/40" />
                      <span className="font-body text-[0.92rem] font-bold leading-snug text-inst-blue">{s.inst}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-10 font-body text-sm italic text-archival-grey">{t('speakersMore')}</p>
          </div>

          {/* three pillars */}
          <div className="mt-20 grid gap-8 sm:grid-cols-3">
            {([['p1t', 'p1b'], ['p2t', 'p2b'], ['p3t', 'p3b']] as const).map(([tt, bb]) => (
              <div key={tt} className="text-center sm:text-left">
                <div className="mx-auto mb-4 h-px w-10 bg-clinical-teal/50 sm:mx-0" />
                <h3 className="font-heading text-xl font-semibold uppercase tracking-wide text-inst-blue">{t(tt)}</h3>
                <p className="mt-2 font-body text-base leading-relaxed text-body-slate">{t(bb)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* doctor pitch + live app simulation */}
        <section className="mx-auto max-w-3xl px-6 pb-2 text-center">
          <p className="font-body text-[0.8rem] font-semibold uppercase tracking-[0.32em] text-clinical-teal">
            {t('toolsEyebrow')}
          </p>
          <h2 className="mt-5 font-heading text-3xl font-semibold uppercase leading-tight tracking-wide text-inst-blue sm:text-4xl">
            {t('toolsTitle')}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl font-body text-lg leading-relaxed text-body-slate">
            {t('toolsBody')}
          </p>
          <p className="mt-6 inline-block rounded-sm bg-clinical-teal/12 px-5 py-2.5 font-body text-base font-semibold text-clinical-teal">
            {t('toolsFree')}
          </p>
          <p className="mt-10 font-body text-sm uppercase tracking-[0.18em] text-archival-grey">
            {t('toolsCaption')}
          </p>

          <CdmxDoctorChat lang={lang} />
        </section>

        {/* Aguirre video */}
        <section className="mx-auto max-w-3xl px-6 pb-20 pt-12 text-center">
          <p className="font-body text-[0.8rem] font-semibold uppercase tracking-[0.32em] text-clinical-teal">
            {t('videoEyebrow')}
          </p>
          <h2 className="mx-auto mt-4 font-heading text-2xl font-semibold uppercase leading-tight tracking-wide text-inst-blue sm:text-3xl">
            {t('videoTitle')}
          </h2>
          <p className="mx-auto mt-2 max-w-xl font-body text-sm leading-relaxed text-body-slate">{t('videoCred')}</p>
          <p className="mt-2 font-body text-base font-semibold text-clinical-teal">{t('videoTopic')}</p>
          <div className="mt-12 overflow-hidden rounded-lg bg-inst-blue shadow-xl">
            {VIDEO_SRC ? (
              <video controls playsInline preload="metadata" className="aspect-video w-full">
                <source src={VIDEO_SRC} type="video/mp4" />
              </video>
            ) : (
              <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 text-white/70">
                <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" /><path d="M10 9l5 3-5 3z" fill="currentColor" stroke="none" />
                </svg>
                <span className="font-body text-sm uppercase tracking-[0.18em]">{t('videoSoon')}</span>
              </div>
            )}
          </div>
        </section>

        {/* threshold close — self-recognition, the doorframe in copy (never a push) */}
        <section className="mx-auto max-w-3xl px-6 pb-24 pt-4 text-center">
          <p className="mx-auto max-w-xl text-balance font-body text-base font-light leading-snug tracking-[0.03em] text-inst-blue/75 sm:text-lg">
            {t('thresholdClose1')}
          </p>
          <p className="font-body text-xl font-light leading-tight tracking-[0.04em] text-inst-blue sm:text-2xl">
            {t('thresholdClose2')}
          </p>
        </section>

        <LandingFooter />
      </div>
    </>
  );
}

// Default this Mexico City page to Spanish. First-time visitors (no explicit
// language choice yet) land in Spanish; once they use the Nav EN/ES toggle,
// Next sets NEXT_LOCALE and we honor it — so English stays reachable.
export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const chosen = ctx.req.cookies?.NEXT_LOCALE;
  if (!chosen && ctx.locale !== 'es') {
    return { redirect: { destination: '/es/cdmx', permanent: false } };
  }
  return { props: {} };
};
