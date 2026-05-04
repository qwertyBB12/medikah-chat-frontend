/**
 * SubscriptionStatus — Phase 13-09 (PRO-08)
 *
 * Status pill + expiration date + auto-renewal indicator for the BillingCard.
 * Color-coded by subscription_status using brand semantic tokens:
 *
 *   active     → confirm-green
 *   past_due   → caution-amber
 *   grace      → caution-amber
 *   canceled   → archival-grey
 *
 * Bilingual EN/ES via the workspace content map. Brand tokens only — zero
 * hardcoded hex codes.
 */

import { useRouter } from 'next/router';
import { content as workspaceContent, format } from '../../../../lib/practikahWorkspaceContent';

export interface SubscriptionStatusProps {
  /** Stripe-mirrored status. 'grace' is a Práctikah-internal value derived
   *  from past_due + grace_until in the future. */
  subscriptionStatus: 'active' | 'past_due' | 'canceled' | 'grace' | string;
  /** ISO 8601 timestamp when the current billing period ends (PRO-08). */
  currentPeriodEnd?: string | null;
  /** Whether Stripe auto-renews at period end. */
  autoRenew?: boolean | null;
}

function pillStyles(status: string): string {
  if (status === 'active') {
    return 'bg-confirm-green text-white';
  }
  if (status === 'past_due' || status === 'grace') {
    return 'bg-caution-amber text-deep-charcoal';
  }
  if (status === 'canceled') {
    return 'bg-archival-grey text-white';
  }
  return 'bg-archival-grey text-white';
}

function formatDate(iso: string | null | undefined, lang: 'en' | 'es'): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function SubscriptionStatus({
  subscriptionStatus,
  currentPeriodEnd,
  autoRenew,
}: SubscriptionStatusProps) {
  const router = useRouter();
  const lang: 'en' | 'es' = router.locale === 'es' ? 'es' : 'en';
  const t = workspaceContent[lang].billing;

  const label =
    subscriptionStatus === 'active'
      ? t.statusActive
      : subscriptionStatus === 'past_due'
      ? t.statusPastDue
      : subscriptionStatus === 'grace'
      ? t.statusGrace
      : subscriptionStatus === 'canceled'
      ? t.statusCanceled
      : t.statusUnknown;

  return (
    <div className="flex flex-wrap items-center gap-3" data-testid="subscription-status">
      <span
        className={`${pillStyles(subscriptionStatus)} font-dm-sans text-xs font-medium px-3 py-1 rounded-md uppercase tracking-wider`}
      >
        {label}
      </span>
      {currentPeriodEnd ? (
        <span className="font-body text-sm text-body-slate">
          {format(t.expirationLabel, { date: formatDate(currentPeriodEnd, lang) })}
        </span>
      ) : null}
      {autoRenew === true || autoRenew === false ? (
        <span className="font-body text-xs text-archival-grey">
          {autoRenew ? t.autoRenewOn : t.autoRenewOff}
        </span>
      ) : null}
    </div>
  );
}
