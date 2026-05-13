/**
 * /auth/recovery — Phase 16 placeholder (D-13).
 *
 * Static bilingual landing page reached from the locked Mailcow auth error
 * banner on `/chat`. Phase 18 (FLOW-01, FLOW-05) swaps the page body for the
 * real recovery flow without renaming the route — see `16-CONTEXT.md` D-13.
 *
 * Anonymous users land here; no auth state, no form, no fetch. The only
 * interactive element is a `mailto:support@medikah.health` anchor.
 */

import Head from 'next/head';
import { useRouter } from 'next/router';
import type { Lang } from '../../lib/auth/mailcowErrorCopy';

const t = {
  title: {
    en: 'Account recovery',
    es: 'Recuperación de cuenta',
  },
  body: {
    en: 'Account recovery is rolling out shortly — contact support@medikah.health',
    es: 'La recuperación de cuenta estará disponible pronto — contacta a support@medikah.health',
  },
  mailto: {
    en: 'Email support',
    es: 'Escribir a soporte',
  },
} as const;

export default function RecoveryPage() {
  const router = useRouter();
  const lang: Lang = router.locale?.startsWith('es') ? 'es' : 'en';

  return (
    <>
      <Head>
        <title>{`${t.title[lang]} — Medikah`}</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <main
        className="relative min-h-screen flex flex-col justify-center px-6 py-16"
        style={{
          background: 'linear-gradient(180deg, #1B2A41 0%, #0D1520 100%)',
        }}
      >
        <div className="mx-auto flex w-full max-w-md flex-col items-center gap-8 text-center">
          <div className="w-full bg-white/5 border border-white/10 rounded-md px-8 py-10 backdrop-blur-sm">
            <h1 className="font-heading uppercase tracking-tight text-2xl text-white leading-tight mb-5">
              {t.title[lang]}
            </h1>
            <p className="font-body text-base text-white/80 leading-relaxed mb-8">
              {t.body[lang]}
            </p>
            <a
              href="mailto:support@medikah.health"
              className="font-body inline-block bg-clinical-teal text-white px-6 py-3 rounded-sm text-sm font-semibold hover:bg-clinical-teal/90 transition-colors"
            >
              {t.mailto[lang]}
            </a>
          </div>
        </div>
      </main>
    </>
  );
}
