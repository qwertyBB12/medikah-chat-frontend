import { FormEvent, useRef, useState } from 'react';
import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Nav from '../components/landing/Nav';
import CurveDivider from '../components/landing/CurveDivider';
import CdmxDoctorChat from '../components/CdmxDoctorChat';
import LandingFooter from '../components/landing/LandingFooter';

type Lang = 'es' | 'en';

const COPY = {
  eyebrow:   { es: 'Capacitación y networking · Médicos internacionales', en: 'Training & networking · International physicians' },
  h1a:       { es: 'medikah.health', en: 'medikah.health' },
  h1b:       { es: 'LLEGA A MÉXICO', en: 'ARRIVES IN MEXICO' },
  lead:      {
    es: 'Salud sin distancia llega a México. Una compañía estadounidense —fundada por médicos latinoamericanos y estadounidenses— llega para transformar la práctica médica. Algo grande comienza.',
    en: 'Care without distance arrives in Mexico. An American company —founded by Latin American and American physicians— is arriving to transform medical practice. Something big is beginning.',
  },
  whenLabel: { es: 'Cuándo', en: 'When' },
  whenVal:   { es: '23 – 25 de junio de 2026\n27 de junio – 1 de julio de 2026\nCiudad de México', en: 'June 23 – 25, 2026\nJune 27 – July 1, 2026\nMexico City' },
  whereLabel:{ es: 'Dónde', en: 'Where' },
  whereVal:  { es: 'Ciudad de México · sede por confirmar', en: 'Mexico City · venue to be confirmed' },
  formTitle: { es: 'Confirma tu interés', en: 'Register your interest' },
  formSub:   { es: 'Déjanos tus datos y te enviaremos los detalles del lugar y el horario.', en: 'Leave your details and we will send you the venue and schedule.' },
  whatsappLabel: { es: 'WhatsApp (con código de país)', en: 'WhatsApp (with country code)' },
  whatsappPh:    { es: '+52 55 1234 5678', en: '+52 55 1234 5678' },
  passNote:      { es: 'Te enviaremos tu pase por WhatsApp.', en: "We'll send your pass via WhatsApp." },
  datesLabel:    { es: '¿Qué fechas te interesan?', en: 'Which dates work for you?' },
  dateOpt1:      { es: '23 – 25 de junio', en: 'June 23 – 25' },
  dateOpt2:      { es: '27 de junio – 1 de julio', en: 'June 27 – July 1' },
  professionOpt: { es: 'Profesión (opcional)', en: 'Profession (optional)' },
  pointsNote:    { es: 'Entre más participas, más puntos acumulas hacia tu certificación en IA.', en: 'The more you take part, the more points toward your AI certification.' },
  name:      { es: 'Nombre', en: 'Name' },
  email:     { es: 'Correo', en: 'Email' },
  profession:{ es: 'Profesión (opcional)', en: 'Profession (optional)' },
  professionPh: { es: 'p. ej. Médico, Enfermería, Inversionista…', en: 'e.g. Physician, Nurse, Investor…' },
  submit:    { es: 'Quiero asistir', en: "I'd like to attend" },
  sending:   { es: 'Enviando…', en: 'Sending…' },
  thankTitle:{ es: '¡Te esperamos!', en: 'See you there!' },
  thankBody: { es: 'Gracias por registrarte. Revisa tu correo — te enviamos una confirmación con los detalles.', en: 'Thank you for registering. Check your inbox — we sent a confirmation with the details.' },
  duplicate: { es: 'Este correo ya está registrado. ¡Nos vemos en CDMX!', en: 'This email is already registered. See you in Mexico City!' },
  error:     { es: 'Algo salió mal. Inténtalo de nuevo.', en: 'Something went wrong. Please try again.' },

  // event substance
  expectEyebrow: { es: 'Más que un encuentro', en: 'More than a gathering' },
  certBadge:  { es: 'Primera de su tipo', en: 'First of its kind' },
  certTitle:  { es: 'Certificación internacional en IA para la medicina', en: 'International certification in AI for medicine' },
  certBody:   {
    es: 'La primera de su tipo: una certificación internacional en inteligencia artificial aplicada a la medicina, impartida por médicos y expertos en el campo, y certificada por New eXponential Thought Organization de Estados Unidos. Son certificaciones acumulables que construyen hacia una certificación profesional.',
    en: 'The first of its kind: an international certification in artificial intelligence for medicine, taught by physicians and experts in the field, and certified by New eXponential Thought Organization of the United States. These are stackable certifications that build toward a professional credential.',
  },
  p1t: { es: 'Networking', en: 'Networking' },
  p1b: { es: 'Conecta con médicos, líderes y aliados de toda la región.', en: 'Connect with physicians, leaders, and partners from across the region.' },
  p2t: { es: 'Aprendizaje', en: 'Learning' },
  p2b: { es: 'Conversaciones reales sobre la IA en la práctica clínica.', en: 'Real conversations about AI in clinical practice.' },
  p3t: { es: 'Comunidad', en: 'Community' },
  p3b: { es: 'Buena compañía, conversación y los partidos de fondo.', en: 'Great company, conversation, and the matches in the background.' },

  speakersEyebrow: { es: 'Ponentes', en: 'Speakers' },
  speakersMore:    { es: 'Más ponentes por anunciar', en: 'More speakers to be announced' },

  toolsEyebrow: { es: 'Para médicos', en: 'For physicians' },
  toolsTitle:   { es: 'Inteligencia artificial para tu práctica y tu vida como médico', en: 'Artificial intelligence for your practice and your life as a physician' },
  toolsBody:    {
    es: 'Medikah llega a México con herramientas de inteligencia artificial para médicos: todo lo que necesitas para tu práctica, y te capacitamos en su uso.',
    en: 'Medikah comes to Mexico with AI tools for physicians: everything you need for your practice, and we train you to use it.',
  },
  toolsFree:    { es: 'Y lo mejor: sin costo para ti.', en: 'And the best part: at no cost to you.' },
  toolsCaption: { es: 'Un vistazo a tu asistente clínico', en: 'A look at your clinical assistant' },

  videoEyebrow: { es: 'En sus palabras', en: 'In his words' },
  videoTitle:   { es: 'Dr. José Luis Aguirre, MD', en: 'Dr. José Luis Aguirre, MD' },
  videoCred:    { es: 'Geriatric Medicine Fellow, Baylor College of Medicine · Director Médico, Medikah Health', en: 'Geriatric Medicine Fellow, Baylor College of Medicine · Chief Medical Officer, Medikah Health' },
  videoTopic:   { es: 'Sobre la IA en la medicina', en: 'On AI in medicine' },
  videoSoon:    { es: 'Video disponible muy pronto', en: 'Video available very soon' },
} as const;

// Served direct from B2 public bucket for launch; front with Bunny CDN later.
const VIDEO_SRC = 'https://f004.backblazeb2.com/file/medikah-public/jla-md.mp4';

// img: drop a file in /public/speakers/ and set the path; until then, initials show.
// focus/zoom fine-tune face framing inside the circle so all faces match.
const SPEAKERS: {
  name: string; img?: string; bgSize?: string; bgPos?: string; flags?: string;
  role: { es: string[]; en: string[] };
}[] = [
  { name: 'Dr. José Luis Aguirre, MD', img: '/speakers/aguirre.jpg', bgPos: 'center 18%', flags: 'EE.UU. · México',
    role: { es: ['Presidente del Consejo', 'y Director Médico', 'Medikah Health'],
            en: ['Board President', '& Chief Medical Officer', 'Medikah Health'] } },
  { name: 'Dra. Erika Torres Valdez, MD', img: '/speakers/erika.jpg', bgPos: 'center 20%', flags: 'México',
    role: { es: ['Uroginecóloga', 'Experta en IA en medicina', 'Consejos COMEGO y FEMECOG'],
            en: ['Urogynecologist', 'AI-in-medicine expert', 'COMEGO & FEMECOG boards'] } },
  { name: 'Hector H. Lopez, MA, MPL', img: '/speakers/hector-lopez.png', bgPos: 'center 22%', flags: 'EE.UU.',
    role: { es: ['CEO', 'Medikah Health'],
            en: ['CEO', 'Medikah Health'] } },
  { name: 'Lic. Luis Ignacio López García, Esq.', img: '/speakers/luis-ignacio.jpg', bgSize: '130%', bgPos: 'center 28%', flags: 'España · México',
    role: { es: ['Abogado', 'Jones Day', 'Derecho corporativo y M&A'],
            en: ['Attorney', 'Jones Day', 'Corporate Law & M&A'] } },
  { name: 'Lic. Maricarmen Flores Soberón, Esq.', img: '/speakers/maricarmen.png', bgSize: 'cover', bgPos: 'center', flags: 'México',
    role: { es: ['Abogada', 'Compliance y derecho sanitario', 'ex-COFEPRIS'],
            en: ['Attorney', 'Compliance & health law', 'ex-COFEPRIS'] } },
  { name: 'Ing. Luis Gerardo Cárdenas, MPL', img: '/speakers/cardenas.webp', bgSize: '200%', bgPos: 'center 18%', flags: 'México · Francia',
    role: { es: ['Director Ejecutivo', 'Arkah', 'Tecnología, robótica e IA'],
            en: ['Executive Director', 'Arkah', 'Technology, robotics & AI'] } },
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
  const [dates, setDates] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'duplicate' | 'error'>('idle');
  const t = (k: keyof typeof COPY) => COPY[k][lang];
  const toggleDate = (d: string) => setDates((cur) => cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]);

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
        body: JSON.stringify({ name: name.trim(), email: email.trim(), whatsapp: whatsapp.trim(), profession: profession.trim(), dates, locale: lang }),
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
        <title>medikah health llega a CDMX — 23–25 Junio 2026</title>
        <meta name="description" content="Medikah Health llega a la Ciudad de México. Encuentro de networking y aprendizaje, 23–25 de junio de 2026. Primer certificado en IA médica. Confirma tu interés." />
        <link rel="canonical" href="https://medikah.health/cdmx" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://medikah.health/cdmx" />
        <meta property="og:title" content="medikah health llega a CDMX" />
        <meta property="og:description" content="Encuentro de networking y aprendizaje · 23–25 de junio de 2026 · Ciudad de México. Primer certificado en IA médica." />
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
              <p className="font-body text-[0.8rem] font-semibold uppercase tracking-[0.32em] text-teal-300">
                {t('eyebrow')}
              </p>
              <h1 className="mt-5">
                <span className="block font-body text-3xl font-medium lowercase tracking-[0.02em] text-white sm:text-4xl">
                  medikah<span className="text-teal-300">.health</span>
                </span>
                <span className="mt-1 block font-heading text-5xl font-semibold uppercase leading-[0.95] tracking-[0.01em] text-white sm:text-6xl">
                  {t('h1b')}
                </span>
              </h1>
              <p className="mt-7 max-w-md font-body text-lg leading-relaxed text-white/80">
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
                  <h2 className="font-heading text-2xl font-semibold uppercase tracking-wide text-deep-charcoal">{t('thankTitle')}</h2>
                  <p className="mx-auto mt-3 max-w-xs font-body text-base leading-relaxed text-body-slate">
                    {status === 'duplicate' ? t('duplicate') : t('thankBody')}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} onFocusCapture={onFormStart} className="space-y-5">
                  <div>
                    <h2 className="font-heading text-2xl font-semibold uppercase tracking-wide text-deep-charcoal">{t('formTitle')}</h2>
                    <p className="mt-2 font-body text-sm leading-relaxed text-body-slate">{t('formSub')}</p>
                  </div>
                  <div>
                    <label className="mb-1.5 block font-body text-xs font-semibold uppercase tracking-wider text-archival-grey">{t('name')}</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
                      className="w-full rounded-sm border border-clinical-surface bg-clinical-surface px-4 py-3 font-body text-base text-deep-charcoal outline-none transition-colors focus:border-clinical-teal focus:bg-white" />
                  </div>
                  <div>
                    <label className="mb-1.5 block font-body text-xs font-semibold uppercase tracking-wider text-archival-grey">{t('email')}</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                      className="w-full rounded-sm border border-clinical-surface bg-clinical-surface px-4 py-3 font-body text-base text-deep-charcoal outline-none transition-colors focus:border-clinical-teal focus:bg-white" />
                  </div>
                  <div>
                    <label className="mb-1.5 block font-body text-xs font-semibold uppercase tracking-wider text-archival-grey">{t('whatsappLabel')}</label>
                    <input type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} required placeholder={t('whatsappPh')}
                      className="w-full rounded-sm border border-clinical-surface bg-clinical-surface px-4 py-3 font-body text-base text-deep-charcoal outline-none transition-colors placeholder:text-archival-grey/70 focus:border-clinical-teal focus:bg-white" />
                    <p className="mt-1.5 font-body text-xs text-archival-grey">{t('passNote')}</p>
                  </div>
                  <div>
                    <label className="mb-1.5 block font-body text-xs font-semibold uppercase tracking-wider text-archival-grey">{t('profession')}</label>
                    <input type="text" value={profession} onChange={(e) => setProfession(e.target.value)} placeholder={t('professionPh')}
                      className="w-full rounded-sm border border-clinical-surface bg-clinical-surface px-4 py-3 font-body text-base text-deep-charcoal outline-none transition-colors placeholder:text-archival-grey/70 focus:border-clinical-teal focus:bg-white" />
                  </div>
                  <div>
                    <label className="mb-2 block font-body text-xs font-semibold uppercase tracking-wider text-archival-grey">{t('datesLabel')}</label>
                    <div className="space-y-2">
                      {([['jun23-25', t('dateOpt1')], ['jun27-jul1', t('dateOpt2')]] as const).map(([val, label]) => (
                        <label key={val} className="flex cursor-pointer items-center gap-3 rounded-sm border border-clinical-surface bg-clinical-surface px-4 py-3 font-body text-base text-deep-charcoal transition-colors hover:border-clinical-teal/50">
                          <input type="checkbox" checked={dates.includes(val)} onChange={() => toggleDate(val)} className="h-4 w-4 accent-clinical-teal" />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <p className="font-body text-xs leading-relaxed text-clinical-teal">{t('pointsNote')}</p>
                  {status === 'error' && <p className="font-body text-sm text-alert-garnet">{t('error')}</p>}
                  <button type="submit" disabled={status === 'sending'}
                    className="w-full rounded-sm bg-teal-500 px-7 py-3.5 font-body text-sm font-semibold uppercase tracking-wider text-white transition-all duration-200 hover:bg-teal-600 disabled:opacity-60">
                    {status === 'sending' ? t('sending') : t('submit')}
                  </button>
                </form>
              )}
            </div>
          </div>
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

          {/* speakers */}
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
                  <h3 className="mt-5 font-body text-[1.05rem] font-semibold leading-snug text-deep-charcoal">{s.name}</h3>
                  {s.flags && <div className="mt-1.5 font-body text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-archival-grey">{s.flags}</div>}
                  <div className="mt-1.5 space-y-0.5">
                    {s.role[lang].map((line, i) => (
                      <p key={i} className={`font-body leading-snug ${i === 0 ? 'text-sm font-semibold text-clinical-teal' : 'text-[0.82rem] text-body-slate'}`}>
                        {line}
                      </p>
                    ))}
                  </div>
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
                <h3 className="font-heading text-xl font-semibold uppercase tracking-wide text-deep-charcoal">{t(tt)}</h3>
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
          <h2 className="mt-5 font-heading text-3xl font-semibold uppercase leading-tight tracking-wide text-deep-charcoal sm:text-4xl">
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
          <h2 className="mx-auto mt-4 font-heading text-2xl font-semibold uppercase leading-tight tracking-wide text-deep-charcoal sm:text-3xl">
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
