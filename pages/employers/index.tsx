/**
 * Employer Portal Placeholder
 *
 * Coming soon page for employers.
 */

import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { LOGO_SRC } from '../../lib/assets';
import { SupportedLang } from '../../lib/i18n';

export default function EmployerPortal() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const lang: SupportedLang = router.locale?.toLowerCase().startsWith('es') ? 'es' : 'en';

  // Auth guard
  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.replace('/chat');
    }
  }, [session, status, router]);

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFB]">
        <div className="flex items-center gap-2 text-body-slate">
          <span className="w-2 h-2 bg-inst-blue/30 rounded-full animate-typingBounce" />
          <span className="w-2 h-2 bg-inst-blue/30 rounded-full animate-typingBounce [animation-delay:0.2s]" />
          <span className="w-2 h-2 bg-inst-blue/30 rounded-full animate-typingBounce [animation-delay:0.4s]" />
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>
          {lang === 'en' ? 'Employer Portal — Medikah' : 'Portal de Empleadores — Medikah'}
        </title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-inst-blue to-[#243447] px-6 py-16">
        <div className="max-w-md text-center">
          <div className="flex flex-col items-center gap-3 mb-8">
            <Image
              src={LOGO_SRC}
              alt=""
              width={320}
              height={320}
              priority
              className="w-14 h-auto opacity-80"
            />
            <span className="font-body text-[1.5rem] font-medium tracking-[0.04em] lowercase text-white">
              medikah
            </span>
          </div>

          <h1 className="font-dm-serif text-3xl text-white mb-4">
            {lang === 'en' ? 'Employer Portal' : 'Portal de Empleadores'}
          </h1>

          <p className="font-dm-sans text-white/70 text-lg mb-2">
            {lang === 'en' ? 'Coming Soon' : 'Próximamente'}
          </p>

          <p className="font-dm-sans text-white/50 text-sm leading-relaxed mb-8">
            {lang === 'en'
              ? 'We are building tools for employers to support employee health internationally. Stay tuned for updates.'
              : 'Estamos construyendo herramientas para que los empleadores apoyen la salud de sus empleados internacionalmente. Manténgase atento a las actualizaciones.'}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/chat"
              className="font-dm-sans px-6 py-3 bg-white/10 text-white font-medium rounded-lg border border-white/20 hover:bg-white/20 transition"
            >
              {lang === 'en' ? 'Back to Home' : 'Volver al Inicio'}
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: '/chat' })}
              className="font-dm-sans px-6 py-3 text-white/60 font-medium hover:text-white transition"
            >
              {lang === 'en' ? 'Sign out' : 'Cerrar sesión'}
            </button>
          </div>
        </div>

        <p className="font-dm-sans text-white/30 text-xs mt-16">
          {lang === 'en'
            ? 'Contact partners@medikah.com for early access'
            : 'Contacte partners@medikah.com para acceso anticipado'}
        </p>
      </div>
    </>
  );
}
