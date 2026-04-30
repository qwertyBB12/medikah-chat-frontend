/**
 * UpgradeCTABanner — Phase 12-07 (D-20 / FREE-08 / WSPC-07)
 *
 * Non-intrusive inline upgrade banner for the "Make this real at your own domain"
 * upgrade narrative. Shown ONLY after the doctor has invested time theming their
 * Try Pro preview (engagement gating via shouldShowUpgradeCTA).
 *
 * NEVER interstitial. NEVER modal. Always inline, always dismissable.
 *
 * Placement:
 *  - SiteTab: above the live preview iframe (placement="site-tab")
 *  - SettingsTab: at the bottom of the tab (placement="settings-tab")
 *
 * Dismiss behavior:
 *  - Fires engagement/track event: 'cta_dismissed'
 *  - Calls onDismiss callback (parent can clear from UI immediately)
 *  - Server-side: cta_dismissed_at is set, hiding the banner for 7 days
 *
 * CTA: routes to /physicians/dashboard/upgrade (Phase 13 placeholder in Phase 12)
 *
 * Per T-12-07-06: CTA href is relative path — cannot be hijacked to external URL.
 */

import Link from 'next/link';
import type { SupportedLang } from '../../../lib/i18n';
import { content as workspaceContent } from '../../../lib/practikahWorkspaceContent';
import {
  shouldShowUpgradeCTA,
  trackEngagementEvent,
  type EngagementCounters,
} from '../../../lib/practikahEngagementHeuristic';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface UpgradeCTABannerProps {
  lang: SupportedLang;
  counters: EngagementCounters | null | undefined;
  onDismiss?: () => void;
  placement: 'site-tab' | 'settings-tab';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function UpgradeCTABanner({
  lang,
  counters,
  onDismiss,
  placement,
}: UpgradeCTABannerProps) {
  const t = workspaceContent[lang];

  // Engagement gate — do not render if heuristic returns false
  if (!shouldShowUpgradeCTA(counters)) {
    return null;
  }

  const handleDismiss = () => {
    // Fire-and-forget engagement event — tracks dismissal for 7-day cooldown
    trackEngagementEvent('cta_dismissed');
    onDismiss?.();
  };

  return (
    <div
      className="bg-gradient-to-r from-inst-blue to-clinical-teal text-white rounded-md p-6 my-4 relative"
      data-placement={placement}
      data-testid="upgrade-cta-banner"
    >
      {/* Dismiss button — top right corner */}
      <button
        type="button"
        onClick={handleDismiss}
        aria-label={t.upgrade.banner.dismiss}
        className="absolute top-2 right-2 text-white/60 hover:text-white transition-colors text-xl leading-none px-1"
      >
        ×
      </button>

      {/* Headline — D-20 LOCKED copy */}
      <h3 className="font-heading uppercase text-2xl tracking-wider mb-2 pr-8">
        {t.upgrade.banner.headline}
      </h3>

      {/* Body copy */}
      <p className="font-body text-sm text-white/90 mb-4 max-w-xl leading-relaxed">
        {t.upgrade.banner.body}
      </p>

      {/* Actions row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Primary CTA — relative path, T-12-07-06 */}
        <Link
          href="/physicians/dashboard/upgrade"
          className="inline-block bg-white text-inst-blue font-dm-sans font-medium px-6 py-2 rounded-md hover:bg-linen transition-colors text-sm"
        >
          {t.upgrade.banner.cta}
        </Link>

        {/* Secondary dismiss text link */}
        <button
          type="button"
          onClick={handleDismiss}
          className="text-white/70 hover:text-white text-sm font-dm-sans underline transition-colors"
        >
          {t.upgrade.banner.dismiss}
        </button>
      </div>
    </div>
  );
}
