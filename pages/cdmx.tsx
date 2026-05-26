import { FormEvent, useState } from 'react';
import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Nav from '../components/landing/Nav';
import CurveDivider from '../components/landing/CurveDivider';
import LandingFooter from '../components/landing/LandingFooter';

type Lang = 'es' | 'en';

const COPY = {
  eyebrow:   { es: 'Encuentro de presentación · 23–25 Junio 2026', en: 'Launch gathering · June 23–25, 2026' },
  h1a:       { es: 'medikah health', en: 'medikah health' },
  h1b:       { es: 'LLEGA A CDMX', en: 'ARRIVES IN MEXICO CITY' },
  lead:      {
    es: 'Salud sin distancia llega a la Ciudad de México. Un encuentro de networking y aprendizaje para conocer lo que estamos construyendo — junto a la comunidad de médicos que lo hace posible.',
    en: 'Care without distance comes to Mexico City. A networking and learning gathering to see what we are building — alongside the community of physicians making it possible.',
  },
  whenLabel: { es: 'Cuándo', en: 'When' },
  whenVal:   { es: '23 – 25 de junio de 2026 · evento principal la noche del 23', en: 'June 23 – 25, 2026 · main evening event on the 23rd' },
  whereLabel:{ es: 'Dónde', en: 'Where' },
  whereVal:  { es: 'Ciudad de México · sede por confirmar', en: 'Mexico City · venue to be confirmed' },
  formTitle: { es: 'Confirma tu interés', en: 'Register your interest' },
  formSub:   { es: 'Déjanos tus datos y te enviaremos los detalles del lugar y el horario.', en: 'Leave your details and we will send you the venue and schedule.' },
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
  certBadge:  { es: 'Primicia', en: 'First of its kind' },
  certTitle:  { es: 'La primera certificación en IA médica', en: 'The first AI-in-medicine certification' },
  certBody:   {
    es: 'Entregaremos el primer certificado del camino hacia la Certificación en Inteligencia Artificial en Medicina, emitida por New eXponential Thought Organization. Son certificaciones acumulables que construyen hacia una certificación profesional.',
    en: 'We will award the first certificate on the path to Certification in Artificial Intelligence in Medicine, issued by New eXponential Thought Organization. These are stackable certifications that build toward a professional credential.',
  },
  p1t: { es: 'Networking', en: 'Networking' },
  p1b: { es: 'Conecta con médicos, líderes y aliados de toda la región.', en: 'Connect with physicians, leaders, and partners from across the region.' },
  p2t: { es: 'Aprendizaje', en: 'Learning' },
  p2b: { es: 'Conversaciones reales sobre la IA en la práctica clínica.', en: 'Real conversations about AI in clinical practice.' },
  p3t: { es: 'Comunidad', en: 'Community' },
  p3b: { es: 'Buena compañía, conversación y los partidos de fondo.', en: 'Great company, conversation, and the matches in the background.' },

  speakersEyebrow: { es: 'Ponentes', en: 'Speakers' },
  speakersMore:    { es: 'Más ponentes por anunciar', en: 'More speakers to be announced' },
} as const;

// img: drop a file in /public/speakers/ and set the path; until then, initials show.
// focus/zoom fine-tune face framing inside the circle so all faces match.
const SPEAKERS: {
  name: string; img?: string; bgSize?: string; bgPos?: string;
  role: { es: string[]; en: string[] };
}[] = [
  { name: 'Dr. José Luis Aguirre, MD', img: '/speakers/aguirre.jpg', bgPos: 'center 18%',
    role: { es: ['Cofundador', 'Presidente del Consejo y Director Médico', 'Medikah Health'],
            en: ['Co-founder', 'Board President & Chief Medical Officer', 'Medikah Health'] } },
  { name: 'Dra. Erika Torres Valdez', img: '/speakers/erika.jpg', bgPos: 'center 20%',
    role: { es: ['Uroginecóloga', 'Experta en IA en medicina', 'Consejos COMEGO y FEMECOG'],
            en: ['Urogynecologist', 'AI-in-medicine expert', 'COMEGO & FEMECOG boards'] } },
  { name: 'Hector H. Lopez', img: '/speakers/hector-lopez.png', bgPos: 'center 22%',
    role: { es: ['Cofundador', 'CEO', 'Medikah Health'],
            en: ['Co-founder', 'CEO', 'Medikah Health'] } },
  { name: 'Luis Ignacio López García', img: '/speakers/luis-ignacio.jpg', bgSize: '130%', bgPos: 'center 28%',
    role: { es: ['Abogado', 'Jones Day', 'Derecho corporativo y M&A'],
            en: ['Attorney', 'Jones Day', 'Corporate Law & M&A'] } },
  { name: 'Maricarmen Flores Soberón', img: '/speakers/maricarmen.png', bgSize: 'cover', bgPos: 'center',
    role: { es: ['Abogada', 'Compliance y derecho sanitario', 'ex-COFEPRIS'],
            en: ['Attorney', 'Compliance & health law', 'ex-COFEPRIS'] } },
  { name: 'Luis Gerardo Cárdenas', img: '/speakers/cardenas.webp', bgSize: '200%', bgPos: 'center 18%',
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
  const [profession, setProfession] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'duplicate' | 'error'>('idle');
  const t = (k: keyof typeof COPY) => COPY[k][lang];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setStatus('sending');
    try {
      const res = await fetch('/api/cdmx-rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), profession: profession.trim(), locale: lang }),
      });
      if (res.status === 409) setStatus('duplicate');
      else if (res.ok) setStatus('success');
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
                <span className="block font-body text-3xl font-medium lowercase tracking-[0.02em] text-white/90 sm:text-4xl">
                  {t('h1a')}
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
                  <dd className="font-body text-base text-white/85">{t('whenVal')}</dd>
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
                <form onSubmit={handleSubmit} className="space-y-5">
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
                    <label className="mb-1.5 block font-body text-xs font-semibold uppercase tracking-wider text-archival-grey">{t('profession')}</label>
                    <input type="text" value={profession} onChange={(e) => setProfession(e.target.value)} placeholder={t('professionPh')}
                      className="w-full rounded-sm border border-clinical-surface bg-clinical-surface px-4 py-3 font-body text-base text-deep-charcoal outline-none transition-colors placeholder:text-archival-grey/70 focus:border-clinical-teal focus:bg-white" />
                  </div>
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
            <div className="mx-auto mt-10 flex max-w-4xl flex-wrap justify-center gap-x-10 gap-y-12">
              {SPEAKERS.map((s) => (
                <div key={s.name} className="flex w-56 flex-col items-center text-center">
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
                  <h3 className="mt-5 font-body text-lg font-semibold text-deep-charcoal">{s.name}</h3>
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
