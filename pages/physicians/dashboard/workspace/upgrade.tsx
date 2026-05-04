/**
 * /physicians/dashboard/workspace/upgrade — Phase 13-05
 *
 * Pro upgrade wizard page. Server-side gates:
 *   1. getServerSession → redirect to /chat if no session
 *   2. physicians.verification_status === 'verified' → redirect to dashboard otherwise
 *
 * The actual SAT compliance + launch-scope gate runs client-side (and is
 * re-enforced server-side inside FastAPI's /upgrade/checkout). On Stripe
 * Checkout return, the URL carries ?session_id=cs_test_... — the wizard
 * detects this on mount and jumps straight to the provisioning state which
 * Plan 13-07 will replace with the SSE-driven stepped checklist.
 */

import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../api/auth/[...nextauth]';
import { supabaseAdmin } from '../../../../lib/supabaseServer';
import UpgradeWizard, {
  type PhysicianSeed,
} from '../../../../components/physician/workspace/upgrade/UpgradeWizard';
import type { SupportedLang } from '../../../../lib/i18n';

interface UpgradePageProps {
  physician: PhysicianSeed;
  lang: SupportedLang;
}

export default function UpgradePage({ physician, lang }: UpgradePageProps) {
  return (
    <>
      <Head>
        <title>
          {lang === 'es'
            ? 'Pasa a Práctikah Pro — Medikah'
            : 'Upgrade to Práctikah Pro — Medikah'}
        </title>
      </Head>
      <div className="bg-clinical-surface min-h-screen py-10 px-4">
        <UpgradeWizard physician={physician} lang={lang} />
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<UpgradePageProps> = async (
  context,
) => {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session?.user?.email) {
    return {
      redirect: {
        destination: '/chat?role=physician&next=/physicians/dashboard/workspace/upgrade',
        permanent: false,
      },
    };
  }

  if (!supabaseAdmin) {
    return {
      redirect: {
        destination: '/physicians/dashboard?error=db_unavailable',
        permanent: false,
      },
    };
  }

  const userId = (session.user as { id?: string }).id || session.user.email;

  const { data: physician, error: physError } = await supabaseAdmin
    .from('physicians')
    .select(
      'id, first_name, last_name, maternal_last_name, country, email, verification_status',
    )
    .or(`user_id.eq.${userId},auth_user_id.eq.${userId},email.eq.${session.user.email}`)
    .single();

  if (physError || !physician) {
    return {
      redirect: {
        destination: '/physicians/onboard',
        permanent: false,
      },
    };
  }

  if (physician.verification_status !== 'verified') {
    return {
      redirect: {
        destination: '/physicians/dashboard?error=not_verified',
        permanent: false,
      },
    };
  }

  // Default to US when the physician's country is missing (D-23 launch scope
  // is enforced server-side via FastAPI's assert_eligible — the wizard simply
  // renders a sensible default until the SAT-status round-trip resolves).
  const rawCountry = (physician.country || '').toUpperCase().trim();
  const country: 'MX' | 'US' = rawCountry === 'MX' ? 'MX' : 'US';

  const lang: SupportedLang = context.locale === 'es' ? 'es' : 'en';

  return {
    props: {
      physician: {
        firstName: physician.first_name || '',
        lastName: physician.last_name || '',
        secondLastName: physician.maternal_last_name || undefined,
        country,
        email: physician.email || session.user.email,
      },
      lang,
    },
  };
};
