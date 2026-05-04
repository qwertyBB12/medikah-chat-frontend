/**
 * Phase 13 Plan 13-04: DomainSearch
 *
 * Step 1 of the Pro-upgrade wizard. Doctor types optional clinic / freeform
 * input; we generate country-weighted deterministic suggestions per D-19
 * (NO LLM at search time) and live-check availability per suggestion through
 * the Plan 13-02 endpoint at /api/practikah/upgrade/availability (debounced
 * 300ms per D-20).
 *
 * Per PRO-02 / D-01: pricing is shown transparently as wholesale TLD price
 * (sourced live from Cloudflare Registrar Availability API) + Práctikah Pro
 * service fee, with the total displayed per year.
 *
 * Defensive-registration suggestions render inline below the primary list per
 * PRO-14 / D-21 — never as a modal.
 *
 * All copy from practikahWorkspaceContent.ts (CLAUDE.md: bilingual EN/ES
 * non-negotiable). Brand-token colors only — no hardcoded hex codes.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import type { SupportedLang } from '../../../../lib/i18n';
import { content as workspaceContent } from '../../../../lib/practikahWorkspaceContent';
import {
  generateSuggestions,
  generateDefensiveSuggestions,
  type Suggestion,
  type SuggestionCountry,
  type SuggestionInput,
} from '../../../../lib/domainSuggestions';
import DefensiveSuggestions from './DefensiveSuggestions';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AvailabilityResult {
  available: boolean;
  tld: string;
  /** USD wholesale price returned by CF Registrar Availability API (D-20). */
  wholesale_price_usd: number | null;
  source: 'cf' | 'rdap';
  error?: string;
}

type AvailabilityState = 'checking' | AvailabilityResult | null;

interface PricingMatrix {
  standard: { annual: number; monthly: number; monthly_setup: number; currency: string };
  premium: { annual: number; monthly: number; monthly_setup: number; currency: string };
}

interface DomainSearchProfile {
  firstName: string;
  lastName: string;
  secondLastName?: string;
  country: SuggestionCountry;
}

export interface DomainSearchProps {
  /** Optional override — when omitted we read `router.locale` per CLAUDE.md i18n rule */
  lang?: SupportedLang;
  profile: DomainSearchProfile;
  /** Resolved by the parent UpgradeWizard via /api/practikah/upgrade/domain-search */
  pricing: PricingMatrix;
  /** Invoked when the doctor selects an available primary suggestion */
  onSelect: (suggestion: Suggestion, availability: AvailabilityResult) => void;
  /** Invoked when the doctor reserves a defensive-registration suggestion */
  onReserveDefensive?: (suggestion: Suggestion, availability: AvailabilityResult | null) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEBOUNCE_MS = 300; // D-20

function formatMoney(cents: number, currency: string): string {
  const value = cents / 100;
  // ``Intl.NumberFormat`` produces locale-correct currency formatting for
  // both MXN and USD without needing custom symbol logic.
  try {
    return new Intl.NumberFormat(currency === 'MXN' ? 'es-MX' : 'en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'MXN' ? 0 : 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function wholesaleUsdToCents(amount: number | null | undefined): number {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return 0;
  return Math.round(amount * 100);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DomainSearch({
  lang,
  profile,
  pricing,
  onSelect,
  onReserveDefensive,
}: DomainSearchProps) {
  // CLAUDE.md i18n rule: every visible string is bilingual EN/ES via
  // ``router.locale`` (or an explicit `lang` prop override).
  const router = useRouter();
  const resolvedLang: SupportedLang =
    lang ?? (router.locale === 'es' ? 'es' : 'en');
  const t = workspaceContent[resolvedLang].upgrade.search;

  const [clinicName, setClinicName] = useState('');
  const [freeform, setFreeform] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [availability, setAvailability] = useState<Record<string, AvailabilityState>>({});
  const [hovered, setHovered] = useState<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const seed: SuggestionInput = useMemo(
    () => ({
      firstName: profile.firstName,
      lastName: profile.lastName,
      secondLastName: profile.secondLastName,
      country: profile.country,
      clinicName: clinicName.trim() || undefined,
      freeform: freeform.trim() || undefined,
    }),
    [profile, clinicName, freeform],
  );

  const primary = useMemo(() => generateSuggestions(seed), [seed]);
  const defensive = useMemo(
    () => generateDefensiveSuggestions(seed, primary),
    [seed, primary],
  );

  // Fire availability checks — debounced 300ms per D-20.
  const runAvailability = useCallback((domains: string[]) => {
    if (domains.length === 0) return;

    setAvailability((prev) => {
      const next = { ...prev };
      for (const d of domains) {
        // Reset previously-resolved entries to checking only if we don't
        // already have a result; otherwise leave it (UI shows old + spinner).
        if (next[d] === undefined) next[d] = 'checking';
      }
      return next;
    });

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      // Mark all as checking right before fetch fires.
      setAvailability((prev) => {
        const next = { ...prev };
        for (const d of domains) next[d] = 'checking';
        return next;
      });

      const settled = await Promise.allSettled(
        domains.map((d) =>
          fetch(`/api/practikah/upgrade/availability?domain=${encodeURIComponent(d)}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          }).then(async (r) => {
            if (!r.ok) throw new Error(`status ${r.status}`);
            return (await r.json()) as AvailabilityResult;
          }),
        ),
      );

      setAvailability((prev) => {
        const next = { ...prev };
        domains.forEach((d, i) => {
          const s = settled[i];
          if (s.status === 'fulfilled') {
            next[d] = s.value;
          } else {
            next[d] = null;
          }
        });
        return next;
      });
    }, DEBOUNCE_MS);
  }, []);

  // Re-check primary + defensive whenever the seed changes.
  useEffect(() => {
    const all = [...primary.map((p) => p.domain), ...defensive.map((d) => d.domain)];
    if (all.length === 0) return;
    runAvailability(all);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [primary, defensive, runAvailability]);

  const visiblePrimary = showAll ? primary : primary.slice(0, 6);

  const renderBadge = (s: AvailabilityState) => {
    if (s === 'checking' || s === undefined) {
      return (
        <span className="font-dm-sans text-xs text-archival-grey animate-pulse">
          {t.checking}
        </span>
      );
    }
    if (!s) {
      return null;
    }
    if (s.available) {
      return (
        <span className="font-dm-sans text-xs text-confirm-green font-semibold">
          ✓ {t.available}
        </span>
      );
    }
    return (
      <span className="font-dm-sans text-xs text-archival-grey">
        ✗ {t.taken}
      </span>
    );
  };

  const renderPriceBreakdown = (suggestion: Suggestion, avail: AvailabilityState) => {
    const tier = pricing[suggestion.tldClass];
    if (!tier) return null;
    const wholesaleCents =
      avail && avail !== 'checking' && avail.wholesale_price_usd != null
        ? wholesaleUsdToCents(avail.wholesale_price_usd)
        : null;
    // Service fee = total - wholesale, but only when the wholesale value
    // exists in the same currency (USD). For MXN, we surface the total and
    // wholesale labelled "approximate" since CF reports in USD only.
    const totalCents = tier.annual;
    let serviceCents = totalCents;
    let wholesaleDisplay = '—';
    if (wholesaleCents !== null) {
      if (tier.currency === 'USD') {
        serviceCents = Math.max(0, totalCents - wholesaleCents);
        wholesaleDisplay = formatMoney(wholesaleCents, 'USD');
      } else {
        // MXN — show wholesale in USD verbatim; doctor sees both currencies.
        wholesaleDisplay = formatMoney(wholesaleCents, 'USD');
        serviceCents = totalCents;
      }
    }

    return (
      <div className="mt-3 p-3 bg-linen rounded-sm">
        <div className="flex justify-between font-dm-sans text-xs text-body-slate mb-1">
          <span>{t.pricingWholesale}</span>
          <span>{wholesaleDisplay}</span>
        </div>
        <div className="flex justify-between font-dm-sans text-xs text-body-slate mb-1">
          <span>{t.pricingService}</span>
          <span>{formatMoney(serviceCents, tier.currency)}</span>
        </div>
        <div className="flex justify-between font-dm-sans text-sm text-deep-charcoal font-semibold pt-1 border-t border-archival-grey/30">
          <span>{t.pricingTotal}</span>
          <span>{formatMoney(totalCents, tier.currency)}</span>
        </div>
        <p className="font-body text-xs text-archival-grey mt-2 leading-snug">
          {t.pricingNote}
        </p>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-md p-6 my-4 shadow-[0_1px_3px_rgba(27,42,65,0.06),0_8px_24px_rgba(27,42,65,0.04)]">
      {/* Headline */}
      <h2 className="font-heading uppercase tracking-wider text-2xl text-deep-charcoal mb-2">
        {t.headline}
      </h2>
      <p className="font-body text-sm text-body-slate mb-6">{t.subheadline}</p>

      {/* Seed inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <label className="block">
          <span className="font-dm-sans text-xs uppercase tracking-wide text-archival-grey mb-1 block">
            {t.seedClinicLabel}
          </span>
          <input
            type="text"
            value={clinicName}
            onChange={(e) => setClinicName(e.target.value)}
            placeholder={t.seedClinicPlaceholder}
            maxLength={120}
            className="w-full font-dm-sans text-sm border border-archival-grey/30 rounded-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-clinical-teal/40"
          />
        </label>
        <label className="block">
          <span className="font-dm-sans text-xs uppercase tracking-wide text-archival-grey mb-1 block">
            {t.freeformLabel}
          </span>
          <input
            type="text"
            value={freeform}
            onChange={(e) => setFreeform(e.target.value.toLowerCase())}
            placeholder={t.freeformPlaceholder}
            maxLength={64}
            className="w-full font-dm-sans text-sm border border-archival-grey/30 rounded-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-clinical-teal/40"
          />
        </label>
      </div>

      {/* Primary suggestion list */}
      <h3 className="font-heading uppercase tracking-wider text-base text-inst-blue mb-3">
        {t.primaryHeading}
      </h3>
      {primary.length === 0 ? (
        <p className="font-body text-sm text-archival-grey italic mb-4">{t.empty}</p>
      ) : (
        <div className="space-y-2 mb-4">
          {visiblePrimary.map((s) => {
            const avail = availability[s.domain];
            const resolvedAvail: AvailabilityResult | null =
              avail && avail !== 'checking' ? avail : null;
            const isAvailable = resolvedAvail?.available === true;
            const ruleKey = s.reason as keyof typeof t.rules;
            return (
              <div
                key={s.domain}
                onMouseEnter={() => setHovered(s.domain)}
                onMouseLeave={() => setHovered((h) => (h === s.domain ? null : h))}
                onFocus={() => setHovered(s.domain)}
                onBlur={() => setHovered((h) => (h === s.domain ? null : h))}
                className={`px-4 py-3 rounded-md border-2 transition-all ${
                  isAvailable
                    ? 'bg-linen border-transparent hover:border-clinical-teal'
                    : 'bg-clinical-surface border-transparent opacity-70'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-dm-sans text-sm text-deep-charcoal break-all">
                      {s.domain}
                    </p>
                    <p className="font-body text-xs text-archival-grey mt-1">
                      {t.rules[ruleKey] ?? s.reason}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {renderBadge(avail)}
                    <button
                      type="button"
                      onClick={() => {
                        if (isAvailable && resolvedAvail) {
                          onSelect(s, resolvedAvail);
                        }
                      }}
                      disabled={!isAvailable}
                      className="bg-inst-blue text-white font-dm-sans font-medium text-xs px-4 py-2 rounded-sm hover:bg-inst-blue/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {t.selectCta}
                    </button>
                  </div>
                </div>
                {hovered === s.domain &&
                  isAvailable &&
                  resolvedAvail &&
                  renderPriceBreakdown(s, resolvedAvail)}
              </div>
            );
          })}

          {primary.length > 6 && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="font-dm-sans text-xs text-clinical-teal hover:underline mt-2"
            >
              {showAll ? t.showLess : t.showMore}
            </button>
          )}
        </div>
      )}

      {/* Defensive list — inline (PRO-14 / D-21) */}
      {defensive.length > 0 && (
        <DefensiveSuggestions
          lang={resolvedLang}
          suggestions={defensive}
          availability={availability}
          pricing={pricing}
          onReserve={(s) => {
            const avail = availability[s.domain];
            const resolved =
              avail && avail !== 'checking' ? (avail as AvailabilityResult) : null;
            onReserveDefensive?.(s, resolved);
          }}
        />
      )}
    </div>
  );
}
