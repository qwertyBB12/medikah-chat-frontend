/**
 * Phase 13 Plan 13-04: DefensiveSuggestions
 *
 * Inline secondary list of defensive-registration upsells per PRO-14 / D-21.
 * Renders below the primary DomainSearch list — never as a modal, never as an
 * interstitial. The doctor can one-click "Reserve" any of these to add it to
 * their plan at standard Pro pricing per added domain (PRO-14).
 *
 * All copy from practikahWorkspaceContent.ts (CLAUDE.md: bilingual EN/ES).
 * Brand-token colors only — no hardcoded hex codes.
 */

import { useRouter } from 'next/router';
import type { SupportedLang } from '../../../../lib/i18n';
import { content as workspaceContent } from '../../../../lib/practikahWorkspaceContent';
import type { Suggestion } from '../../../../lib/domainSuggestions';

interface AvailabilityResult {
  available: boolean;
  tld: string;
  wholesale_price_usd: number | null;
  source: 'cf' | 'rdap';
  error?: string;
}

type AvailabilityState = 'checking' | AvailabilityResult | null | undefined;

interface PricingMatrix {
  standard: { annual: number; monthly: number; monthly_setup: number; currency: string };
  premium: { annual: number; monthly: number; monthly_setup: number; currency: string };
}

export interface DefensiveSuggestionsProps {
  /** Optional lang override — falls back to `router.locale` when omitted */
  lang?: SupportedLang;
  suggestions: Suggestion[];
  availability: Record<string, AvailabilityState>;
  pricing: PricingMatrix;
  onReserve: (suggestion: Suggestion) => void;
}

export default function DefensiveSuggestions({
  lang,
  suggestions,
  availability,
  pricing,
  onReserve,
}: DefensiveSuggestionsProps) {
  const router = useRouter();
  const resolvedLang: SupportedLang =
    lang ?? (router.locale === 'es' ? 'es' : 'en');
  const t = workspaceContent[resolvedLang].upgrade.search;

  if (suggestions.length === 0) return null;

  const renderBadge = (s: AvailabilityState) => {
    if (s === 'checking' || s === undefined) {
      return (
        <span className="font-dm-sans text-xs text-archival-grey animate-pulse">
          {t.checking}
        </span>
      );
    }
    if (!s) return null;
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

  return (
    <section
      className="mt-6 bg-linen rounded-md p-4"
      data-testid="defensive-suggestions"
    >
      <h3 className="font-heading uppercase tracking-wider text-base text-inst-blue mb-1">
        {t.defensiveHeading}
      </h3>
      <p className="font-body text-xs text-body-slate mb-3">
        {t.defensiveSubheading}
      </p>

      <ul className="space-y-2">
        {suggestions.map((s) => {
          const avail = availability[s.domain];
          const isAvailable =
            avail && avail !== 'checking' && (avail as AvailabilityResult).available === true;
          const ruleKey = s.reason as keyof typeof t.rules;
          const tier = pricing[s.tldClass];
          return (
            <li
              key={s.domain}
              className="flex items-center justify-between gap-3 bg-white rounded-sm px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="font-dm-sans text-sm text-deep-charcoal break-all">
                  {s.domain}
                </p>
                <p className="font-body text-xs text-archival-grey mt-0.5">
                  {t.rules[ruleKey] ?? s.reason}
                  {tier ? ` · ${tier.currency} ${(tier.annual / 100).toLocaleString()}/yr` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {renderBadge(avail)}
                <button
                  type="button"
                  onClick={() => onReserve(s)}
                  disabled={!isAvailable}
                  className="bg-clinical-teal text-white font-dm-sans font-medium text-xs px-3 py-1.5 rounded-sm hover:bg-clinical-teal/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {t.reserveCta}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
