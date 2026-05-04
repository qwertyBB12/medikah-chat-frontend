/**
 * CheckoutHandoff — Phase 13-05
 *
 * Final wizard step before Stripe-hosted Checkout. POSTs the chosen
 * tld_class + cadence + domain to /api/practikah/upgrade/checkout, which
 * forwards to FastAPI, which creates a Stripe Checkout Session and returns
 * { checkout_url, session_id }. We then redirect the doctor to Stripe.
 *
 * 403 envelope contract (Plan 13-05 Task 1):
 *   detail.code === 'SAT_BLOCKED' | 'COUNTRY_NOT_SUPPORTED'
 *   detail.message_en + detail.message_es bilingual strings.
 *
 * Per CLAUDE.md: bilingual EN/ES via router.locale, brand tokens only,
 * custom radii (rounded-md = 16px) per tailwind.config.js.
 */

import { useState } from 'react';
import { useRouter } from 'next/router';
import type { SupportedLang } from '../../../../lib/i18n';
import { content as workspaceContent } from '../../../../lib/practikahWorkspaceContent';

export interface CheckoutHandoffProps {
  tldClass: 'standard' | 'premium';
  cadence: 'annual' | 'monthly';
  domain: string;
  /** Optional override — defaults to router.locale */
  lang?: SupportedLang;
}

interface CheckoutErrorDetail {
  code?: string;
  message_en?: string;
  message_es?: string;
}

export default function CheckoutHandoff({
  tldClass,
  cadence,
  domain,
  lang,
}: CheckoutHandoffProps) {
  const router = useRouter();
  const resolvedLang: SupportedLang =
    lang ?? (router.locale === 'es' ? 'es' : 'en');
  const t = workspaceContent[resolvedLang].upgrade.wizard;

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function startCheckout(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/practikah/upgrade/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tld_class: tldClass,
          cadence,
          domain,
        }),
      });

      // Parse body whether ok or not — error shape may include bilingual envelope.
      const data = (await r.json().catch(() => ({}))) as {
        checkout_url?: string;
        session_id?: string;
        detail?: CheckoutErrorDetail | string;
      };

      if (!r.ok) {
        // Bilingual envelope per Plan 13-05 Task 1 (SAT_BLOCKED, COUNTRY_NOT_SUPPORTED).
        const detail = data.detail;
        let msg = t.errors.generic;
        if (detail && typeof detail === 'object') {
          const localized =
            resolvedLang === 'es' ? detail.message_es : detail.message_en;
          if (localized) msg = localized;
        }
        setError(msg);
        setLoading(false);
        return;
      }

      if (data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }
      // Fallthrough — server returned 200 without checkout_url.
      setError(t.errors.generic);
      setLoading(false);
    } catch {
      setError(t.errors.network);
      setLoading(false);
    }
  }

  return (
    <div
      className="bg-linen rounded-md p-6"
      data-testid="checkout-handoff"
    >
      <h2 className="font-heading uppercase text-xl tracking-wider text-inst-blue mb-4">
        {t.checkout.handoffHeadline}
      </h2>
      <p className="font-body text-body-slate mb-6 max-w-2xl leading-relaxed">
        {t.checkout.handoffText}
      </p>

      {error ? (
        <p
          className="text-alert-garnet font-body text-sm mb-4"
          data-testid="checkout-error"
        >
          {error}
        </p>
      ) : null}

      <button
        type="button"
        disabled={loading}
        onClick={startCheckout}
        className="bg-clinical-teal text-white font-dm-sans font-medium px-6 py-3 rounded-md hover:bg-clinical-teal/90 disabled:opacity-50"
        data-testid="checkout-handoff-cta"
      >
        {loading ? t.checkout.loading : t.checkout.cta}
      </button>
    </div>
  );
}
