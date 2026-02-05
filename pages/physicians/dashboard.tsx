/**
 * Physician Dashboard Page
 *
 * Main portal for verified physicians with profile summary,
 * verification status, and quick actions.
 */

import Head from 'next/head';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import PortalLayout from '../../components/PortalLayout';
import DashboardContent from '../../components/physician/DashboardContent';
import { getPhysicianOnboardingStatus } from '../../lib/portalAuth';
import { SupportedLang } from '../../lib/i18n';

interface PhysicianStatus {
  isOnboarded: boolean;
  physicianId: string | null;
  verificationStatus: string | null;
  hasConsent: boolean;
}

export default function PhysicianDashboard() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const lang: SupportedLang = router.locale?.toLowerCase().startsWith('es') ? 'es' : 'en';

  const [physicianStatus, setPhysicianStatus] = useState<PhysicianStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Auth guard
  useEffect(() => {
    if (authStatus === 'loading') return;

    if (!session) {
      router.replace('/chat');
      return;
    }

    // Fetch physician status - don't check role since it's based on DB lookup
    const email = session.user?.email;
    if (email) {
      getPhysicianOnboardingStatus(email).then((status) => {
        setPhysicianStatus(status);
        setLoading(false);

        // If not onboarded, redirect to onboarding
        if (!status.isOnboarded || !status.hasConsent) {
          router.replace('/physicians/onboard');
        }
      }).catch(() => {
        setLoading(false);
        router.replace('/physicians/onboard');
      });
    } else {
      router.replace('/chat');
    }
  }, [session, authStatus, router]);

  // Show loading state
  if (authStatus === 'loading' || loading || !session || !physicianStatus) {
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

  const physicianName = session.user?.name || session.user?.email || '';

  return (
    <>
      <Head>
        <title>
          {lang === 'en' ? 'Physician Dashboard — Medikah' : 'Panel de Médico — Medikah'}
        </title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <PortalLayout
        portal="physician"
        onSignOut={() => signOut({ callbackUrl: '/chat' })}
        headerTitle={lang === 'en' ? 'Dashboard' : 'Panel'}
      >
        <div className="h-full overflow-y-auto">
          <DashboardContent
            physicianId={physicianStatus.physicianId}
            physicianName={physicianName}
            verificationStatus={physicianStatus.verificationStatus}
            lang={lang}
          />
        </div>
      </PortalLayout>
    </>
  );
}
