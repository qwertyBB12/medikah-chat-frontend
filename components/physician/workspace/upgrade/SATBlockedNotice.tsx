/**
 * SATBlockedNotice — Phase 13-03 (D-22 / D-23 / WSPC-04 / WSPC-09)
 *
 * Bilingual inline notice rendered in place of the Pro upgrade wizard when:
 *   - variant="sat_blocked": physician.country === 'MX' AND
 *     MEDIKAH_MX_SAT_REGISTERED is OFF (D-22 — pending Mexican SAT registration).
 *   - variant="unsupported": physician.country is outside the Phase 13 launch
 *     scope (D-23 — Phase 13 launches MX + US only).
 *
 * Renders inline in the upgrade flow — NEVER as a modal/interstitial. Mirrors
 * the UpgradeCTABanner shape but uses caution-amber to signal "blocked".
 *
 * Per T-13-03-01: this component is a UX hint only. The security control is
 * server-side assert_eligible() in FastAPI's /upgrade/checkout (Plan 13-05) —
 * even if a hostile client bypasses this notice, Stripe Checkout creation
 * refuses with HTTP 403.
 *
 * The "Notify me" CTA fires a no-op endpoint stub. Plan 13-04 wires it into
 * the existing engagement_events table (Phase 12-07 infra).
 */

import { useRouter } from 'next/router';
import type { SupportedLang } from '../../../../lib/i18n';
import { content as workspaceContent } from '../../../../lib/practikahWorkspaceContent';

interface SATBlockedNoticeProps {
  variant: 'sat_blocked' | 'unsupported';
}

export default function SATBlockedNotice({ variant }: SATBlockedNoticeProps) {
  const router = useRouter();
  const lang: SupportedLang = router.locale === 'es' ? 'es' : 'en';
  const t = workspaceContent[lang];

  const block = variant === 'sat_blocked' ? t.sat.blocked : t.sat.unsupported;
  const headline = lang === 'en' ? block.headline_en : block.headline_es;
  const body = lang === 'en' ? block.body_en : block.body_es;

  const handleNotifyMe = async () => {
    try {
      // TODO(13-04): wire notify-me to engagement_events table
      await fetch('/api/practikah/upgrade/notify-me', { method: 'POST' });
    } catch {
      // Fire-and-forget — silent failure is acceptable for a UX hint
    }
  };

  return (
    <div
      className="bg-caution-amber text-deep-charcoal rounded-md p-6 my-4"
      data-testid="sat-blocked-notice"
      data-variant={variant}
    >
      <h3 className="font-heading uppercase text-2xl tracking-wider mb-2">
        {headline}
      </h3>
      <p className="font-body text-sm leading-relaxed mb-4 max-w-xl">
        {body}
      </p>
      {variant === 'sat_blocked' && (
        <button
          type="button"
          onClick={handleNotifyMe}
          className="inline-block bg-inst-blue text-white font-dm-sans font-medium px-6 py-2 rounded-md hover:bg-inst-blue/90 transition-colors text-sm"
        >
          {lang === 'en'
            ? t.sat.blocked.cta_notify_en
            : t.sat.blocked.cta_notify_es}
        </button>
      )}
    </div>
  );
}
