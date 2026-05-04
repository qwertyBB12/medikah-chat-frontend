/**
 * DunningBanner — Phase 13-09 (D-27 / OPS-12)
 *
 * Inline bilingual banner shown at the top of the workspace when the
 * physician's subscription is past_due (Stripe Smart Retries in flight) or
 * in the 7-day grace period before auto-downgrade.
 *
 * Two variants:
 *   - 'retry'  → caution-amber (warm/non-judgmental — "we're retrying")
 *   - 'grace'  → alert-garnet (escalated — "{days} days until downgrade")
 *
 * Per PATTERNS.md and CLAUDE.md:
 *   - Inline only. Never modal, never interstitial.
 *   - Brand tokens only — zero hardcoded hex codes.
 *   - Bilingual EN/ES via router.locale.
 *   - CTA opens the Stripe Customer Portal via the BFF
 *     /api/practikah/billing/portal-link (T-12-07-06 — relative path, not a
 *     hardcoded external URL).
 *
 * Also extends UpgradeCTABanner's inline-banner shape so the dashboard has a
 * consistent visual language for tier-state messaging.
 */

import { useState } from 'react';
import { useRouter } from 'next/router';
import { content as workspaceContent, format } from '../../../../lib/practikahWorkspaceContent';

interface DunningBannerProps {
  variant: 'retry' | 'grace';
  /** Days remaining in the grace window. Only used by the 'grace' variant. */
  daysRemaining?: number;
}

export default function DunningBanner({
  variant,
  daysRemaining = 0,
}: DunningBannerProps) {
  const router = useRouter();
  const lang: 'en' | 'es' = router.locale === 'es' ? 'es' : 'en';
  const t = workspaceContent[lang].billing.dunning;
  const [opening, setOpening] = useState(false);

  const isGrace = variant === 'grace';
  const headline = isGrace
    ? format(t.graceHeadline, { days: daysRemaining })
    : t.retryHeadline;
  const body = isGrace ? t.graceBody : t.retryBody;
  const containerClass = isGrace
    ? 'bg-alert-garnet text-white'
    : 'bg-caution-amber text-deep-charcoal';
  const ctaClass = isGrace
    ? 'bg-white text-alert-garnet hover:bg-linen'
    : 'bg-inst-blue text-white hover:bg-inst-blue/90';

  async function openPortal(): Promise<void> {
    if (opening) return;
    setOpening(true);
    try {
      const r = await fetch('/api/practikah/billing/portal-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await r.json();
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      console.error('[DunningBanner] portal-link returned no url', data);
    } catch (err) {
      console.error('[DunningBanner] portal-link fetch failed', err);
    } finally {
      setOpening(false);
    }
  }

  return (
    <div
      className={`${containerClass} rounded-md p-6 my-4`}
      data-testid="dunning-banner"
      data-variant={variant}
    >
      <h3 className="font-heading uppercase text-xl tracking-wider mb-2">
        {headline}
      </h3>
      <p className="font-body text-sm leading-relaxed mb-4 max-w-xl">
        {body}
      </p>
      <button
        type="button"
        onClick={openPortal}
        disabled={opening}
        className={`${ctaClass} font-dm-sans font-medium px-6 py-2 rounded-md text-sm disabled:opacity-60 disabled:cursor-not-allowed transition-colors`}
      >
        {t.ctaUpdatePayment}
      </button>
    </div>
  );
}
