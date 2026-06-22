/**
 * Phase 12 Plan 12-01: LocalPartPicker
 *
 * Wizard Step 2 — Doctor picks their mailbox local-part (left side of @).
 * Shows up to 4 computed candidates derived from their name + a 5th custom-input.
 * Debounced availability check via /api/practikah/wizard/local-part-suggestions.
 *
 * Per FREE-04: 5 ranked candidates, real-time Mailcow availability check,
 * custom-input option with pattern [a-z0-9.\-_]+, max 64 chars.
 *
 * All copy from practikahWorkspaceContent.ts. Brand-only colors and radii.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SupportedLang } from '../../../../lib/i18n';
import { content as workspaceContent } from '../../../../lib/practikahWorkspaceContent';

interface LocalPartPickerProps {
  lang: SupportedLang;
  title: 'Dr' | 'Dra';
  firstName: string;
  middleName?: string;
  lastName: string;
  maternalLastName?: string;
  accessToken: string | null;
  onSubmit: (localPart: string) => void;
}

interface SuggestionStatus {
  local_part: string;
  available: boolean;
  source: 'mailcow_check' | 'reserved' | 'invalid';
}

type AvailabilityMap = Record<string, SuggestionStatus | 'checking' | null>;

function slugify(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const LOCAL_PART_PATTERN = /^[a-z0-9._-]+$/;

export default function LocalPartPicker({
  lang,
  title,
  firstName,
  middleName,
  lastName,
  maternalLastName,
  accessToken,
  onSubmit,
}: LocalPartPickerProps) {
  const t = workspaceContent[lang];

  // Compute up to 4 name-derived candidates
  const candidates = useMemo<string[]>(() => {
    const titleSlug = title.toLowerCase();
    const firstSlug = slugify(firstName);
    const lastSlug = slugify(lastName);
    const midSlug = middleName ? slugify(middleName) : null;
    const maternalSlug = maternalLastName ? slugify(maternalLastName) : null;

    const raw: Array<string | null> = [
      `${titleSlug}-${lastSlug}`,
      `${firstSlug[0] || 'x'}-${lastSlug}`,
      midSlug ? `${firstSlug[0] || 'x'}-${midSlug[0] || 'x'}-${lastSlug}` : null,
      maternalSlug ? `${lastSlug}-${maternalSlug}` : null,
    ];

    // De-duplicate and filter nulls/empty
    const seen = new Set<string>();
    const result: string[] = [];
    for (const c of raw) {
      if (c && !seen.has(c)) {
        seen.add(c);
        result.push(c);
      }
    }
    return result;
  }, [title, firstName, middleName, lastName, maternalLastName]);

  const [selected, setSelected] = useState<string | null>(candidates[0] || null);
  const [customValue, setCustomValue] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [availability, setAvailability] = useState<AvailabilityMap>({});
  const [pickError, setPickError] = useState(false);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fire availability check — debounced 300ms
  const checkAvailability = useCallback(
    (toCheck: string[]) => {
      if (toCheck.length === 0) return;

      // Mark all as checking
      setAvailability((prev) => {
        const next: AvailabilityMap = { ...prev };
        for (const c of toCheck) {
          next[c] = 'checking';
        }
        return next;
      });

      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(async () => {
        try {
          const res = await fetch('/api/practikah/wizard/local-part-suggestions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            },
            body: JSON.stringify({ title, candidates: toCheck }),
          });
          if (res.ok) {
            const data = (await res.json()) as { suggestions: SuggestionStatus[] };
            setAvailability((prev) => {
              const next: AvailabilityMap = { ...prev };
              for (const s of data.suggestions) {
                next[s.local_part] = s;
              }
              return next;
            });
          } else {
            // Clear checking state on error
            setAvailability((prev) => {
              const next: AvailabilityMap = { ...prev };
              for (const c of toCheck) {
                if (next[c] === 'checking') next[c] = null;
              }
              return next;
            });
          }
        } catch {
          setAvailability((prev) => {
            const next: AvailabilityMap = { ...prev };
            for (const c of toCheck) {
              if (next[c] === 'checking') next[c] = null;
            }
            return next;
          });
        }
      }, 300);
    },
    [title, accessToken],
  );

  // Check candidates on mount
  useEffect(() => {
    if (candidates.length > 0) {
      checkAvailability(candidates);
    }
  }, [candidates, checkAvailability]);

  // Check custom value as user types
  useEffect(() => {
    if (useCustom && customValue && LOCAL_PART_PATTERN.test(customValue)) {
      checkAvailability([customValue]);
    }
  }, [customValue, useCustom, checkAvailability]);

  const effectiveSelected = useCustom ? customValue : selected;

  const getAvailabilityStatus = (lp: string): SuggestionStatus | 'checking' | null => {
    return availability[lp] ?? null;
  };

  const isAvailable = (lp: string): boolean => {
    const s = getAvailabilityStatus(lp);
    if (!s || s === 'checking') return false;
    return s.available;
  };

  const handleContinue = () => {
    if (!effectiveSelected) {
      setPickError(true);
      return;
    }
    if (!LOCAL_PART_PATTERN.test(effectiveSelected)) {
      setPickError(true);
      return;
    }
    if (!isAvailable(effectiveSelected)) {
      setPickError(true);
      return;
    }
    setPickError(false);
    onSubmit(effectiveSelected);
  };

  const renderStatusBadge = (lp: string) => {
    const s = getAvailabilityStatus(lp);
    if (!s) return null;
    if (s === 'checking') {
      return (
        <span className="font-dm-sans text-xs text-archival-grey animate-pulse">
          {t.wizard.localPart.availabilityChecking}
        </span>
      );
    }
    if (s.available) {
      return (
        <span className="font-dm-sans text-xs text-confirm-green">
          {t.wizard.localPart.availableLabel}
        </span>
      );
    }
    if (s.source === 'invalid') {
      return (
        <span className="font-dm-sans text-xs text-alert-garnet">
          {t.wizard.localPart.invalidLabel}
        </span>
      );
    }
    return (
      <span className="font-dm-sans text-xs text-alert-garnet">
        {t.wizard.localPart.takenLabel}
      </span>
    );
  };

  return (
    <div className="bg-white border-l-4 border-clinical-teal rounded-md shadow-[0_1px_3px_rgba(27,42,65,0.06),0_8px_24px_rgba(27,42,65,0.04)] p-6 my-4">
      <h3 className="font-body font-bold text-lg text-deep-charcoal mb-1">
        {t.wizard.localPart.title}
      </h3>
      <p className="font-body text-sm text-body-slate mb-4">
        {t.wizard.localPart.subtitle}
      </p>

      {/* Big preview */}
      <div className="mb-6 p-4 bg-linen rounded-md">
        <p className="font-dm-sans text-xs uppercase tracking-wide text-archival-grey mb-1">
          {t.wizard.localPart.previewLabel}
        </p>
        <p className="font-dm-serif text-2xl text-deep-charcoal break-all">
          {effectiveSelected || candidates[0] || 'you'}@medikah.health
        </p>
      </div>

      {/* Candidate cards */}
      <div className="space-y-2 mb-4">
        {candidates.map((c) => {
          const isChosen = !useCustom && selected === c;
          const s = getAvailabilityStatus(c);
          const taken = s && s !== 'checking' && !s.available;
          return (
            <button
              key={c}
              type="button"
              disabled={taken as boolean}
              onClick={() => {
                setUseCustom(false);
                setSelected(c);
                setPickError(false);
              }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-md border-2 text-left transition-all ${
                isChosen
                  ? 'bg-clinical-teal/10 border-clinical-teal text-deep-charcoal'
                  : taken
                  ? 'bg-linen border-transparent text-archival-grey opacity-50 cursor-not-allowed'
                  : 'bg-linen border-transparent text-deep-charcoal hover:bg-linen-white hover:border-clinical-teal/30'
              }`}
            >
              <span className="font-dm-sans text-sm">{c}@medikah.health</span>
              <span className="ml-2 shrink-0">{renderStatusBadge(c)}</span>
            </button>
          );
        })}

        {/* Custom input card */}
        <div
          className={`flex flex-col gap-2 px-4 py-3 rounded-md border-2 transition-all ${
            useCustom
              ? 'bg-clinical-teal/10 border-clinical-teal'
              : 'bg-linen border-transparent hover:border-clinical-teal/30'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              setUseCustom(true);
              setPickError(false);
            }}
            className="font-dm-sans text-sm text-body-slate text-left"
          >
            {t.wizard.localPart.customLabel}
          </button>
          {useCustom && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value.toLowerCase())}
                placeholder={t.wizard.localPart.customPlaceholder}
                pattern="[a-z0-9.\-_]+"
                maxLength={64}
                autoFocus
                className="flex-1 font-dm-sans text-sm border border-warm-gray-800/[0.12] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-clinical-teal/40"
              />
              <span className="font-dm-sans text-sm text-archival-grey whitespace-nowrap">
                @medikah.health
              </span>
              {renderStatusBadge(customValue)}
            </div>
          )}
        </div>
      </div>

      {pickError && (
        <p className="font-body text-sm text-alert-garnet mb-3">
          {t.wizard.localPart.pickFirst}
        </p>
      )}

      <button
        type="button"
        onClick={handleContinue}
        className="w-full bg-inst-blue text-white py-3 rounded-md font-dm-sans font-medium text-sm hover:bg-inst-blue/90 disabled:opacity-40 transition-colors"
      >
        {t.wizard.localPart.continue}
      </button>
    </div>
  );
}
