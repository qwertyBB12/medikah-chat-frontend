/**
 * UpgradeWizard — Phase 13-05
 *
 * Wizard shell coordinating the Pro upgrade flow. Steps:
 *   sat-check → plan → domain → review → checkout → provisioning → completed
 *
 * On mount the wizard hits /api/practikah/upgrade/sat-status and either
 * blocks with SATBlockedNotice (sat_blocked or unsupported) or advances to
 * the plan step.
 *
 * On Stripe-Checkout return (router.query.session_id present), the wizard
 * jumps straight to the provisioning state — Plan 13-07 will replace the
 * placeholder with the SSE-driven Vercel-style stepped checklist.
 *
 * Per CLAUDE.md: every visible string keyed in
 * `practikahWorkspaceContent.upgrade.wizard.*`. Brand tokens only — no
 * hardcoded hex codes, no `gray-*` / `red-*` / `blue-*` Tailwind utilities.
 */

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import type { SupportedLang } from '../../../../lib/i18n';
import { content as workspaceContent } from '../../../../lib/practikahWorkspaceContent';
import type { Suggestion } from '../../../../lib/domainSuggestions';
import DomainSearch from './DomainSearch';
import SATBlockedNotice from './SATBlockedNotice';
import CheckoutHandoff from './CheckoutHandoff';
import ProvisioningProgress from './ProvisioningProgress';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type WizardStep =
  | 'sat-check'
  | 'plan'
  | 'domain'
  | 'review'
  | 'checkout'
  | 'provisioning'
  | 'completed';

export interface PhysicianSeed {
  firstName: string;
  lastName: string;
  secondLastName?: string;
  /** Phase 13 launches MX + US only (D-23). */
  country: 'MX' | 'US';
  email: string;
}

export interface UpgradeWizardProps {
  physician: PhysicianSeed;
  /** Optional override — defaults to router.locale */
  lang?: SupportedLang;
}

interface SatStatus {
  country: string;
  supported: boolean;
  sat_blocked: boolean;
}

interface PricingEntry {
  annual: number;
  monthly: number;
  monthly_setup: number;
  currency: string;
}

interface PricingMatrix {
  standard: PricingEntry;
  premium: PricingEntry;
}

interface DomainSearchResponse {
  country: 'MX' | 'US';
  pricing: PricingMatrix;
  tld_weights: { standard: string[]; premium: string[] };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMoney(cents: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'MXN' ? 0 : 2,
    }).format(cents / 100);
  } catch {
    return `${currency} ${(cents / 100).toFixed(2)}`;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function UpgradeWizard({
  physician,
  lang,
}: UpgradeWizardProps) {
  const router = useRouter();
  const resolvedLang: SupportedLang =
    lang ?? (router.locale === 'es' ? 'es' : 'en');
  const t = workspaceContent[resolvedLang];
  const moneyLocale = resolvedLang === 'es' ? 'es-MX' : 'en-US';

  const [step, setStep] = useState<WizardStep>('sat-check');
  const [satStatus, setSatStatus] = useState<SatStatus | null>(null);
  const [tldClass, setTldClass] = useState<'standard' | 'premium'>('standard');
  const [cadence, setCadence] = useState<'annual' | 'monthly'>('annual');
  const [chosen, setChosen] = useState<Suggestion | null>(null);
  const [pricing, setPricing] = useState<PricingMatrix | null>(null);
  const [pricingError, setPricingError] = useState<string | null>(null);
  // Phase 13-07: resolve Stripe session_id → saga run_id for SSE consumer.
  const [resolvedRunId, setResolvedRunId] = useState<string | null>(null);
  const [runResolveError, setRunResolveError] = useState<string | null>(null);
  // Retry counter for the run-id lookup: bumping it re-arms the resolve effect
  // (audit P1 2026-07-02 — a charged doctor was stranded on a dead error state).
  const [resolveAttempt, setResolveAttempt] = useState(0);

  // Stripe success_url returns to this page with ?session_id=cs_test_...
  const sessionIdQuery = useMemo(() => {
    const v = router.query.session_id;
    return Array.isArray(v) ? v[0] : v;
  }, [router.query.session_id]);

  const cancelledQuery = useMemo(() => {
    const v = router.query.cancelled;
    return Array.isArray(v) ? v[0] : v;
  }, [router.query.cancelled]);

  // SAT status check (skipped when returning from Stripe — provisioning takes over).
  useEffect(() => {
    if (sessionIdQuery) {
      setStep('provisioning');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/practikah/upgrade/sat-status');
        if (!r.ok) {
          // SAT status fetch failure shouldn't block the doctor — server-side
          // assert_eligible() in /upgrade/checkout is the real security gate.
          if (!cancelled) setStep('plan');
          return;
        }
        const data = (await r.json()) as SatStatus;
        if (cancelled) return;
        setSatStatus(data);
        if (data.sat_blocked || !data.supported) {
          setStep('sat-check');
        } else {
          setStep('plan');
        }
      } catch {
        if (!cancelled) setStep('plan');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionIdQuery]);

  // Phase 13-07: when the wizard lands in provisioning with a session_id from
  // the Stripe success_url, resolve the saga run_id via the BFF helper. Owner
  // check is enforced server-side (T-13-07-04).
  useEffect(() => {
    if (step !== 'provisioning') return;
    if (!sessionIdQuery) return;
    if (resolvedRunId) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(
          `/api/practikah/upgrade/run-by-session?session_id=${encodeURIComponent(sessionIdQuery)}`,
        );
        if (!r.ok) {
          if (!cancelled) setRunResolveError(t.upgrade.wizard.errors.generic);
          return;
        }
        const data = (await r.json()) as { run_id?: string };
        if (cancelled) return;
        if (data.run_id) setResolvedRunId(data.run_id);
        else setRunResolveError(t.upgrade.wizard.errors.generic);
      } catch {
        if (!cancelled) setRunResolveError(t.upgrade.wizard.errors.network);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    step,
    sessionIdQuery,
    resolvedRunId,
    resolveAttempt,
    t.upgrade.wizard.errors.generic,
    t.upgrade.wizard.errors.network,
  ]);

  // Fetch pricing matrix once we land on plan / domain step.
  useEffect(() => {
    if (step !== 'plan' && step !== 'domain') return;
    if (pricing) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/practikah/upgrade/domain-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ country: physician.country }),
        });
        if (!r.ok) throw new Error(`status ${r.status}`);
        const data = (await r.json()) as DomainSearchResponse;
        if (!cancelled) setPricing(data.pricing);
      } catch {
        if (!cancelled) setPricingError(t.upgrade.wizard.errors.generic);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step, pricing, physician.country, t.upgrade.wizard.errors.generic]);

  // -------------------------------------------------------------------------
  // SAT-blocked / unsupported short-circuit
  // -------------------------------------------------------------------------

  if (
    step === 'sat-check' &&
    satStatus &&
    (satStatus.sat_blocked || !satStatus.supported)
  ) {
    return (
      <SATBlockedNotice
        variant={satStatus.sat_blocked ? 'sat_blocked' : 'unsupported'}
      />
    );
  }

  // -------------------------------------------------------------------------
  // Provisioning — Plan 13-07 will replace the placeholder
  // -------------------------------------------------------------------------

  if (step === 'provisioning') {
    const provisioningCopy = t.upgrade.wizard.provisioning;
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="font-heading uppercase text-3xl tracking-wider text-inst-blue mb-6">
          {t.upgrade.wizard.headline}
        </h1>

        {!sessionIdQuery ? (
          <div
            className="bg-alert-garnet/10 rounded-md p-6"
            data-testid="provisioning-missing-session"
          >
            <p className="font-body text-body-slate">
              {provisioningCopy.missingSession}
            </p>
          </div>
        ) : runResolveError ? (
          <div
            className="bg-alert-garnet/10 rounded-md p-6"
            data-testid="provisioning-resolve-error"
          >
            <p className="font-body text-alert-garnet">{runResolveError}</p>
            <p className="font-body text-body-slate text-sm mt-2">
              {provisioningCopy.resolveFailedBody}
            </p>
            <button
              type="button"
              data-testid="provisioning-resolve-retry"
              className="mt-4 font-body text-sm font-semibold px-5 py-2.5 rounded-md bg-clinical-teal text-white hover:bg-clinical-teal/90 transition"
              onClick={() => {
                setRunResolveError(null);
                setResolveAttempt((n) => n + 1);
              }}
            >
              {provisioningCopy.resolveRetry}
            </button>
          </div>
        ) : !resolvedRunId ? (
          <div
            className="bg-linen rounded-md p-6"
            data-testid="provisioning-resolving"
          >
            <p className="font-body text-body-slate">
              {provisioningCopy.resolving}
            </p>
          </div>
        ) : (
          <ProvisioningProgress runId={resolvedRunId} />
        )}
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Wizard body (plan / domain / review / checkout)
  // -------------------------------------------------------------------------

  const planEntry = pricing?.[tldClass];
  const totalCents = planEntry
    ? cadence === 'annual'
      ? planEntry.annual
      : planEntry.monthly + planEntry.monthly_setup
    : 0;
  const currency = planEntry?.currency ?? (physician.country === 'MX' ? 'MXN' : 'USD');

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="font-heading uppercase text-3xl tracking-wider text-inst-blue mb-6">
        {t.upgrade.wizard.headline}
      </h1>

      {cancelledQuery ? (
        <p
          className="bg-caution-amber text-deep-charcoal rounded-md p-4 mb-6 font-body text-sm"
          data-testid="checkout-cancelled-notice"
        >
          {t.upgrade.wizard.checkout.cancelledNotice}
        </p>
      ) : null}

      {pricingError ? (
        <p className="text-alert-garnet font-body text-sm mb-4">
          {pricingError}
        </p>
      ) : null}

      {step === 'plan' && (
        <PlanStep
          tldClass={tldClass}
          setTldClass={setTldClass}
          cadence={cadence}
          setCadence={setCadence}
          pricing={pricing}
          locale={moneyLocale}
          t={t.upgrade.wizard}
          onContinue={() => setStep('domain')}
        />
      )}

      {step === 'domain' && pricing && (
        <DomainSearch
          lang={resolvedLang}
          profile={{
            firstName: physician.firstName,
            lastName: physician.lastName,
            secondLastName: physician.secondLastName,
            country: physician.country,
          }}
          pricing={pricing}
          onSelect={(s: Suggestion) => {
            setChosen(s);
            setStep('review');
          }}
        />
      )}

      {step === 'review' && chosen && planEntry && (
        <ReviewStep
          chosen={chosen}
          tldClass={tldClass}
          cadence={cadence}
          totalCents={totalCents}
          currency={currency}
          locale={moneyLocale}
          t={t.upgrade.wizard}
          onBack={() => setStep('domain')}
          onConfirm={() => setStep('checkout')}
        />
      )}

      {step === 'checkout' && chosen && (
        <CheckoutHandoff
          tldClass={tldClass}
          cadence={cadence}
          domain={chosen.domain}
          lang={resolvedLang}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline subcomponents
// ---------------------------------------------------------------------------

type WizardCopy = (typeof workspaceContent)['en']['upgrade']['wizard'];

interface PlanStepProps {
  tldClass: 'standard' | 'premium';
  setTldClass: (v: 'standard' | 'premium') => void;
  cadence: 'annual' | 'monthly';
  setCadence: (v: 'annual' | 'monthly') => void;
  pricing: PricingMatrix | null;
  locale: string;
  t: WizardCopy;
  onContinue: () => void;
}

function PlanStep(props: PlanStepProps) {
  const { tldClass, setTldClass, cadence, setCadence, pricing, locale, t, onContinue } = props;

  const renderPriceLabel = (entry: PricingEntry | undefined): string => {
    if (!entry) return '—';
    if (cadence === 'annual') {
      return formatMoney(entry.annual, entry.currency, locale);
    }
    return formatMoney(entry.monthly, entry.currency, locale);
  };

  const tiers: Array<{ key: 'standard' | 'premium'; title: string }> = [
    { key: 'standard', title: t.plan.standardTitle },
    { key: 'premium', title: t.plan.premiumTitle },
  ];

  return (
    <section data-testid="upgrade-plan-step">
      <h2 className="font-heading uppercase text-xl tracking-wider text-inst-blue mb-2">
        {t.plan.sectionTitle}
      </h2>
      <p className="font-body text-body-slate mb-6 max-w-2xl">
        {t.plan.sectionSubtitle}
      </p>

      {/* Cadence toggle */}
      <div className="mb-6">
        <p className="font-dm-sans text-sm text-archival-grey mb-2">
          {t.plan.cadenceLabel}
        </p>
        <div className="inline-flex rounded-md bg-clinical-surface p-1" role="tablist">
          {(['annual', 'monthly'] as const).map((c) => (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={cadence === c}
              onClick={() => setCadence(c)}
              className={
                cadence === c
                  ? 'px-4 py-2 rounded-sm bg-inst-blue text-white font-dm-sans text-sm'
                  : 'px-4 py-2 rounded-sm text-inst-blue font-dm-sans text-sm hover:bg-white/60'
              }
              data-testid={`cadence-toggle-${c}`}
            >
              {c === 'annual' ? t.plan.cadenceAnnual : t.plan.cadenceMonthly}
            </button>
          ))}
        </div>
      </div>

      {/* Tier cards */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        {tiers.map(({ key, title }) => {
          const entry = pricing?.[key];
          const selected = tldClass === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTldClass(key)}
              className={
                selected
                  ? 'text-left rounded-md border-2 border-clinical-teal bg-white p-5 shadow-sm'
                  : 'text-left rounded-md border-2 border-transparent bg-white p-5 hover:border-clinical-teal/40'
              }
              data-testid={`plan-card-${key}`}
              aria-pressed={selected}
            >
              <h3 className="font-heading uppercase text-lg tracking-wider text-inst-blue mb-2">
                {title}
              </h3>
              <p className="font-dm-serif text-2xl text-deep-charcoal mb-1">
                {renderPriceLabel(entry)}
              </p>
              <p className="font-body text-xs text-archival-grey">
                {cadence === 'annual'
                  ? t.plan.cadenceAnnual
                  : t.plan.cadenceMonthly}
              </p>
            </button>
          );
        })}
      </div>

      {/* Value bullets + guarantee */}
      <ul className="mb-6 space-y-2">
        {t.plan.valueBullets.map((bullet, i) => (
          <li
            key={i}
            className="font-body text-sm text-body-slate flex gap-2 items-start"
          >
            <span className="text-clinical-teal mt-0.5">•</span>
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
      <p className="font-body text-sm text-archival-grey italic mb-6">
        {t.plan.guarantee}
      </p>

      <button
        type="button"
        onClick={onContinue}
        disabled={!pricing}
        className="bg-clinical-teal text-white font-dm-sans font-medium px-6 py-3 rounded-md hover:bg-clinical-teal/90 disabled:opacity-50"
        data-testid="plan-continue-cta"
      >
        {t.plan.continueCta}
      </button>
    </section>
  );
}

interface ReviewStepProps {
  chosen: Suggestion;
  tldClass: 'standard' | 'premium';
  cadence: 'annual' | 'monthly';
  totalCents: number;
  currency: string;
  locale: string;
  t: WizardCopy;
  onBack: () => void;
  onConfirm: () => void;
}

function ReviewStep(props: ReviewStepProps) {
  const { chosen, tldClass, cadence, totalCents, currency, locale, t, onBack, onConfirm } = props;

  const planLabel = tldClass === 'standard' ? t.plan.standardTitle : t.plan.premiumTitle;
  const cadenceLabel = cadence === 'annual' ? t.plan.cadenceAnnual : t.plan.cadenceMonthly;

  return (
    <section data-testid="upgrade-review-step">
      <h2 className="font-heading uppercase text-xl tracking-wider text-inst-blue mb-2">
        {t.review.sectionTitle}
      </h2>
      <p className="font-body text-body-slate mb-6 max-w-2xl">
        {t.review.sectionSubtitle}
      </p>

      <dl className="bg-white rounded-md p-5 mb-6 grid grid-cols-2 gap-y-3 gap-x-4">
        <dt className="font-dm-sans text-sm text-archival-grey">
          {t.review.domainLabel}
        </dt>
        <dd className="font-body text-sm text-deep-charcoal text-right">
          {chosen.domain}
        </dd>
        <dt className="font-dm-sans text-sm text-archival-grey">
          {t.review.planLabel}
        </dt>
        <dd className="font-body text-sm text-deep-charcoal text-right">
          {planLabel}
        </dd>
        <dt className="font-dm-sans text-sm text-archival-grey">
          {t.review.cadenceLabel}
        </dt>
        <dd className="font-body text-sm text-deep-charcoal text-right">
          {cadenceLabel}
        </dd>
        <dt className="font-dm-sans text-sm text-deep-charcoal font-semibold">
          {t.review.totalLabel}
        </dt>
        <dd className="font-dm-serif text-lg text-inst-blue text-right">
          {formatMoney(totalCents, currency, locale)}
        </dd>
      </dl>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="bg-clinical-surface text-inst-blue font-dm-sans font-medium px-6 py-3 rounded-md hover:bg-linen"
          data-testid="review-back-cta"
        >
          {t.review.backCta}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="bg-clinical-teal text-white font-dm-sans font-medium px-6 py-3 rounded-md hover:bg-clinical-teal/90"
          data-testid="review-confirm-cta"
        >
          {t.review.confirmCta}
        </button>
      </div>
    </section>
  );
}
