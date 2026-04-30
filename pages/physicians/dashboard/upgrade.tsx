/**
 * Phase 12-07: /physicians/dashboard/upgrade — Práctikah Pro placeholder page
 *
 * Phase 13 replaces this with the real Stripe + domain-search Pro upgrade flow.
 * Phase 12 ships a bilingual "coming soon" page that captures upgrade interest.
 *
 * Auth gate: requires authenticated physician (via getServerSideProps).
 * Sends upgrade_interest engagement event on "Notify me" click.
 */

import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../api/auth/[...nextauth]';
import { content as workspaceContent } from '../../../lib/practikahWorkspaceContent';
import type { SupportedLang } from '../../../lib/i18n';

interface UpgradePageProps {
  lang: SupportedLang;
}

export default function UpgradePage({ lang }: UpgradePageProps) {
  const t = workspaceContent[lang];
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleNotify = async () => {
    if (submitting || submitted) return;
    setSubmitting(true);
    try {
      // Record upgrade_interest engagement event (fire-and-forget)
      await fetch('/api/practikah/engagement/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'upgrade_interest' }),
      });
    } catch {
      // Non-fatal — best-effort engagement tracking
    }
    setSubmitting(false);
    setSubmitted(true);
  };

  return (
    <>
      <Head>
        <title>
          {lang === 'es' ? 'Práctikah Pro — Próximamente' : 'Práctikah Pro — Coming Soon'}
        </title>
        {/* No index for placeholder page — Phase 13 replaces with real content */}
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <div className="min-h-screen bg-linen flex items-center justify-center p-8">
        <div className="max-w-2xl w-full bg-white rounded-lg p-10 md:p-12 shadow-md text-center">

          {/* Wordmark */}
          <p className="font-body font-extrabold text-3xl text-inst-blue mb-1">medikah</p>
          <p className="font-dm-sans text-xs tracking-widest uppercase text-clinical-teal font-bold mb-8">
            Práctikah Pro
          </p>

          {/* Headline */}
          <h1 className="font-heading uppercase text-3xl md:text-4xl text-inst-blue tracking-wider mb-6 leading-tight">
            {t.upgrade.page.headline}
          </h1>

          {/* Body */}
          <p className="font-body text-base md:text-lg text-body-slate mb-8 leading-relaxed max-w-xl mx-auto">
            {t.upgrade.page.body}
          </p>

          {/* CTA or confirmation */}
          {!submitted ? (
            <button
              type="button"
              onClick={handleNotify}
              disabled={submitting}
              className="bg-clinical-teal text-white px-8 py-3 rounded-md font-dm-sans font-medium text-base hover:bg-clinical-teal/90 disabled:opacity-60 transition-colors"
            >
              {submitting
                ? (lang === 'es' ? 'Enviando...' : 'Sending...')
                : t.upgrade.page.notify}
            </button>
          ) : (
            <p className="font-body text-base text-confirm-green font-semibold">
              {t.upgrade.page.done}
            </p>
          )}

          {/* Back link */}
          <div className="mt-8">
            <Link
              href="/physicians/dashboard?tab=workspace"
              className="font-dm-sans text-sm text-clinical-teal hover:text-clinical-teal/80 transition-colors"
            >
              ← {lang === 'es' ? 'Volver al espacio de trabajo' : 'Back to workspace'}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<UpgradePageProps> = async (context) => {
  // Auth gate: require authenticated physician
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session?.user?.email) {
    return {
      redirect: {
        destination: '/chat?role=physician&next=/physicians/dashboard/upgrade',
        permanent: false,
      },
    };
  }

  const lang: SupportedLang = context.locale === 'es' ? 'es' : 'en';
  return { props: { lang } };
};
