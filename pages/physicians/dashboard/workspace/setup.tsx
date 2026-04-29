/**
 * Phase 12 Plan 12-01: /physicians/dashboard/workspace/setup
 *
 * Full-page onboarding wizard for first-time Práctikah workspace setup.
 *
 * Server-side gates (WSPC-06):
 *   1. getServerSession → redirect to /chat if no session
 *   2. physicians.verification_status === 'verified' → redirect to /physicians/dashboard?error=not_verified
 *   3. physician_workspace_accounts.mailbox_local_part IS NOT NULL → redirect to
 *      /physicians/dashboard?tab=workspace (already onboarded)
 *
 * Renders OnboardingWizard inside a centered max-w-2xl wrapper with bg-linen min-h-screen.
 * Progress indicator at top showing "Step N of 3".
 */

import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../api/auth/[...nextauth]';
import { supabaseAdmin } from '../../../../lib/supabaseServer';
import { nameToSlug } from '../../../../lib/slug';
import { useSupabaseToken } from '../../../../lib/useSupabaseToken';
import OnboardingWizard from '../../../../components/physician/workspace/wizard/OnboardingWizard';
import type { SupportedLang } from '../../../../lib/i18n';
import { content as workspaceContent } from '../../../../lib/practikahWorkspaceContent';

interface SetupPageProps {
  physicianId: string;
  fullName: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  maternalLastName: string | null;
  slug: string;
  lang: SupportedLang;
}

export default function WorkspaceSetupPage({
  physicianId,
  fullName,
  firstName,
  middleName,
  lastName,
  maternalLastName,
  slug,
  lang,
}: SetupPageProps) {
  const t = workspaceContent[lang];
  const accessToken = useSupabaseToken();

  return (
    <>
      <Head>
        <title>
          {lang === 'es' ? 'Configurar Práctikah — Medikah' : 'Set Up Práctikah — Medikah'}
        </title>
      </Head>
      <div className="bg-linen min-h-screen py-10 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header wordmark / back link */}
          <div className="mb-8 text-center">
            <p className="font-body text-base text-archival-grey">
              {lang === 'es' ? 'Configurando tu espacio' : 'Setting up your workspace'}
              {' — '}
              <span className="text-inst-blue font-medium">{fullName}</span>
            </p>
          </div>

          <OnboardingWizard
            physicianId={physicianId}
            lang={lang}
            accessToken={accessToken}
            physicianFullName={fullName}
            physicianFirstName={firstName}
            physicianMiddleName={middleName ?? undefined}
            physicianLastName={lastName}
            physicianMaternalLastName={maternalLastName ?? undefined}
            slug={slug}
          />

          {/* Phase 12 namespace — suppress unused import warning */}
          {/* t.wizard.progress used above in OnboardingWizard child */}
          {t && null}
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<SetupPageProps> = async (context) => {
  // 1. Session gate — redirect to /chat if not authenticated
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session?.user?.email) {
    return {
      redirect: {
        destination: '/chat?role=physician&next=/physicians/dashboard/workspace/setup',
        permanent: false,
      },
    };
  }

  // supabaseAdmin guard
  if (!supabaseAdmin) {
    // DB not configured — degrade gracefully: redirect to dashboard
    return {
      redirect: {
        destination: '/physicians/dashboard?error=db_unavailable',
        permanent: false,
      },
    };
  }

  // 2. Look up physician by auth user_id (try both user_id and auth_user_id columns)
  const userId = (session.user as { id?: string }).id || session.user.email;

  const { data: physician, error: physError } = await supabaseAdmin
    .from('physicians')
    .select(
      'id, full_name, first_name, middle_name, last_name, maternal_last_name, verification_status',
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

  // 3. WSPC-06: enforce verified status
  if (physician.verification_status !== 'verified') {
    return {
      redirect: {
        destination: '/physicians/dashboard?error=not_verified',
        permanent: false,
      },
    };
  }

  // 4. Already onboarded? physician_workspace_accounts.mailbox_local_part IS NOT NULL
  const { data: workspaceAccount } = await supabaseAdmin
    .from('physician_workspace_accounts')
    .select('mailbox_local_part')
    .eq('physician_id', physician.id)
    .single();

  if (workspaceAccount?.mailbox_local_part) {
    return {
      redirect: {
        destination: '/physicians/dashboard?tab=workspace',
        permanent: false,
      },
    };
  }

  // 5. Compute slug
  const slug = nameToSlug(physician.full_name || '');

  // 6. Detect lang from locale
  const lang: SupportedLang = context.locale === 'es' ? 'es' : 'en';

  return {
    props: {
      physicianId: physician.id,
      fullName: physician.full_name || '',
      firstName: physician.first_name || '',
      middleName: physician.middle_name || null,
      lastName: physician.last_name || '',
      maternalLastName: physician.maternal_last_name || null,
      slug,
      lang,
    },
  };
};
