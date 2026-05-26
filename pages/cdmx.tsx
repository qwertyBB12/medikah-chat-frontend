import { FormEvent, useState } from 'react';
import Head from 'next/head';
import Nav from '../components/landing/Nav';
import CurveDivider from '../components/landing/CurveDivider';
import LandingFooter from '../components/landing/LandingFooter';

type Lang = 'es' | 'en';

const COPY = {
  eyebrow:   { es: 'Encuentro de presentación · 23–25 Junio 2026', en: 'Launch gathering · June 23–25, 2026' },
  h1a:       { es: 'medikah health', en: 'medikah health' },
  h1b:       { es: 'LLEGA A CDMX', en: 'ARRIVES IN MEXICO CITY' },
  lead:      {
    es: 'Salud sin distancia llega a la Ciudad de México. Te invitamos a un encuentro para conocer lo que estamos construyendo y a la comunidad de médicos que lo hace posible.',
    en: 'Care without distance comes to Mexico City. Join us for a gathering to see what we are building — and the community of physicians making it possible.',
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
} as const;

export default function CdmxLanding() {
  const [lang, setLang] = useState<Lang>('es');
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
        <meta name="description" content="Medikah Health llega a la Ciudad de México. Encuentro de presentación del 23 al 25 de junio de 2026. Confirma tu interés." />
        <link rel="canonical" href="https://medikah.health/cdmx" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://medikah.health/cdmx" />
        <meta property="og:title" content="medikah health llega a CDMX" />
        <meta property="og:description" content="Encuentro de presentación · 23–25 de junio de 2026 · Ciudad de México. Confirma tu interés." />
        <meta name="robots" content="index,follow" />
      </Head>

      <Nav />

      <main className="bg-inst-blue text-white">
        {/* hero */}
        <section className="relative overflow-hidden px-6 pt-28 pb-20 sm:pt-36 sm:pb-28">
          {/* soft teal glow, right side */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{ background: 'radial-gradient(60% 80% at 85% 20%, rgba(58,157,179,0.28), transparent 60%)' }}
          />
          <div className="relative mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-2">
            {/* left: invitation */}
            <div>
              {/* language toggle */}
              <div className="mb-8 inline-flex overflow-hidden rounded-sm border border-white/20 text-[0.7rem] font-body font-semibold tracking-wide">
                {(['es', 'en'] as Lang[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`px-3 py-1.5 transition-colors ${lang === l ? 'bg-clinical-teal text-white' : 'text-white/60 hover:text-white'}`}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>

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

              {/* detail chips */}
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
                    <input
                      type="text" value={name} onChange={(e) => setName(e.target.value)} required
                      className="w-full rounded-sm border border-clinical-surface bg-clinical-surface px-4 py-3 font-body text-base text-deep-charcoal outline-none transition-colors focus:border-clinical-teal focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block font-body text-xs font-semibold uppercase tracking-wider text-archival-grey">{t('email')}</label>
                    <input
                      type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                      className="w-full rounded-sm border border-clinical-surface bg-clinical-surface px-4 py-3 font-body text-base text-deep-charcoal outline-none transition-colors focus:border-clinical-teal focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block font-body text-xs font-semibold uppercase tracking-wider text-archival-grey">{t('profession')}</label>
                    <input
                      type="text" value={profession} onChange={(e) => setProfession(e.target.value)} placeholder={t('professionPh')}
                      className="w-full rounded-sm border border-clinical-surface bg-clinical-surface px-4 py-3 font-body text-base text-deep-charcoal outline-none transition-colors placeholder:text-archival-grey/70 focus:border-clinical-teal focus:bg-white"
                    />
                  </div>

                  {status === 'error' && (
                    <p className="font-body text-sm text-alert-garnet">{t('error')}</p>
                  )}

                  <button
                    type="submit" disabled={status === 'sending'}
                    className="w-full rounded-sm bg-teal-500 px-7 py-3.5 font-body text-sm font-semibold uppercase tracking-wider text-white transition-all duration-200 hover:bg-teal-600 disabled:opacity-60"
                  >
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

      {/* linen band so the dark rounded footer lifts against light, like the homepage */}
      <div className="bg-linen">
        <div className="mx-auto max-w-6xl px-6 py-16 text-center">
          <div className="mx-auto mb-5 h-px w-12 bg-clinical-teal/50" />
          <p className="font-body text-sm font-medium uppercase tracking-[0.28em] text-body-slate">
            {lang === 'es' ? 'Salud sin distancia' : 'Care without distance'}
          </p>
        </div>
        <LandingFooter />
      </div>
    </>
  );
}
