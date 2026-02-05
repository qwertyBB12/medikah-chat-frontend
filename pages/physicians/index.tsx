/**
 * Physician Portal Router
 *
 * Smart routing based on physician onboarding status:
 * - Not a physician → redirect to /chat
 * - Not onboarded → redirect to /physicians/onboard
 * - Onboarded → redirect to /physicians/dashboard
 */

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { getPhysicianOnboardingStatus } from '../../lib/portalAuth';

export default function PhysicianPortalRouter() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;

    // Not authenticated
    if (!session) {
      router.replace('/chat');
      return;
    }

    // Check onboarding status - don't check role here since new physicians
    // won't be in the physicians table yet (they need to complete onboarding first)
    const email = session.user?.email;
    if (!email) {
      router.replace('/chat');
      return;
    }

    getPhysicianOnboardingStatus(email).then((onboardingStatus) => {
      if (onboardingStatus.isOnboarded && onboardingStatus.hasConsent) {
        router.replace('/physicians/dashboard');
      } else {
        router.replace('/physicians/onboard');
      }
    }).catch(() => {
      // On error, default to onboarding
      router.replace('/physicians/onboard');
    });
  }, [session, status, router]);

  // Show loading while checking
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
