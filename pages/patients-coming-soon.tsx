/**
 * Patient access — coming soon.
 *
 * Terminal landing for the physicians-only phase. /patients redirects here
 * server-side (getServerSideProps) while featureFlags.PATIENT_PORTAL_OPEN is
 * false. No auth, no redirects out (avoids any /chat ⇄ /patients loop).
 */

import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { LOGO_SRC } from '../lib/assets';

const COPY = {
  en: {
    title: 'Patient access — coming soon · Medikah',
    heading: 'Patient access is coming soon',
    body: 'Medikah is currently onboarding physicians. Patient care opens in a later phase — thank you for your patience.',
    home: 'Back to medikah.health',
  },
  es: {
    title: 'Acceso para pacientes — próximamente · Medikah',
    heading: 'El acceso para pacientes llegará pronto',
    body: 'Medikah está incorporando médicos en esta etapa. El acceso para pacientes se habilitará en una fase posterior — gracias por su paciencia.',
    home: 'Volver a medikah.health',
  },
} as const;

export default function PatientsComingSoon() {
  const router = useRouter();
  const { locale } = router;
  const t = COPY[locale === 'es' ? 'es' : 'en'];
  const { data: session } = useSession();

  // Recovery: a physician stranded on the wall (e.g. a stale 'patient' JWT that
  // has since self-healed to 'physician') is bounced to their portal. Patients
  // stay put — physician-only, so no /chat <-> /patients loop.
  useEffect(() => {
    if (session?.user?.role === 'physician') {
      router.replace('/physicians');
    }
  }, [session, router]);

  return (
    <>
      <Head>
        <title>{t.title}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div
        className="relative min-h-screen flex flex-col justify-center px-6 py-16"
        style={{ background: 'linear-gradient(180deg, #1B2A41 0%, #0D1520 100%)' }}
      >
        <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-8 text-center">
          <Image src={LOGO_SRC} alt="" width={320} height={320} priority className="w-14 h-auto sm:w-16 opacity-80" />
          <span className="font-body text-[1.5rem] sm:text-[1.75rem] font-medium tracking-[0.04em] lowercase text-white">
            medikah
          </span>
          <h1 className="font-heading text-2xl sm:text-3xl font-medium uppercase tracking-tight text-white leading-tight">
            {t.heading}
          </h1>
          <p className="font-body text-sm text-cream-400/70 leading-relaxed max-w-xs">{t.body}</p>
          <Link
            href="/"
            className="font-body text-xs text-white/50 underline hover:text-white/80 transition-colors"
          >
            {t.home}
          </Link>
        </div>
      </div>
    </>
  );
}
