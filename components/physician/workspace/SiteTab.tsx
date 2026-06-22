/**
 * SiteTab — Phase 12 Plan 12-05 (full implementation)
 *
 * Workspace sub-tab for the doctor's Try Pro preview at <slug>.medikah.health.
 *
 * Two branches:
 *  - themeClaimed === false: "Claim Try Pro Preview" hero card (D-19)
 *  - themeClaimed === true:  Live preview iframe + action buttons + ThemingEditor drawer
 *
 * Claim flow:
 *  - POST to /api/practikah/theme/claim
 *  - On 200 → themeClaimed = true, show success toast, fetch updated theme
 *
 * Edit Theme:
 *  - Opens ThemingEditor in a full-screen overlay drawer (bg-white)
 *  - Each sub-picker change auto-saves with 800ms debounce; preview iframe refreshes
 *
 * On-off toggle:
 *  - PUT to /api/physicians/{id}/website { enabled: true|false }
 *  - Audits workspace.site_published / workspace.site_disabled via existing BFF
 *
 * URL deep link:
 *  - ?editor=open auto-opens ThemingEditor on mount (D-11 completion screen CTA)
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import type { SupportedLang } from '../../../lib/i18n';
import { content as workspaceContent } from '../../../lib/practikahWorkspaceContent';
import { nameToSlug } from '../../../lib/slug';
import ThemingEditor from './theming/ThemingEditor';
import UpgradeCTABanner from './UpgradeCTABanner';
import { trackEngagementEvent, type EngagementCounters } from '../../../lib/practikahEngagementHeuristic';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SiteTabProps {
  physicianId: string;
  lang: SupportedLang;
  accessToken: string | null;
  physicianFullName?: string;
}

interface ThemeData {
  physician_id?: string | null;
  layout_variant?: string;
  accent_color?: string;
  font_weight?: string;
  favicon_url?: string | null;
  office_photo_urls?: string[];
  updated_at?: string | null;
  _default?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SiteTab({ physicianId, lang, accessToken, physicianFullName }: SiteTabProps) {
  const t = workspaceContent[lang];
  const router = useRouter();

  // Three-state: null = loading, false = not claimed, true = claimed
  const [themeClaimed, setThemeClaimed] = useState<boolean | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [claimState, setClaimState] = useState<'idle' | 'claiming' | 'claimed' | 'error'>('idle');
  const [claimError, setClaimError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [enabled, setEnabled] = useState<boolean>(false);
  const [cachebust, setCachebust] = useState<number>(() => Date.now());

  // Engagement counters for upgrade CTA gating (D-20 / FREE-08)
  const [engagementCounters, setEngagementCounters] = useState<EngagementCounters | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Track the full name for slug — prefer fetched data
  const [fetchedFullName, setFetchedFullName] = useState<string | null>(null);

  const isFirstMount = useRef(true);

  // ---------------------------------------------------------------------------
  // Load theme state on mount
  // ---------------------------------------------------------------------------

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/practikah/theme/get');
        if (res.ok) {
          const data = (await res.json()) as ThemeData;
          // _default: true means FastAPI returned 404 → no theme row yet
          setThemeClaimed(!data._default && !!data.physician_id);
        } else if (res.status === 404) {
          setThemeClaimed(false);
        } else {
          // Unknown error — show claim card as safe default
          setThemeClaimed(false);
        }
      } catch {
        setThemeClaimed(false);
      }
    })();

    // Also load physician full_name, website_enabled, and engagement_counters
    (async () => {
      try {
        const res = await fetch('/api/practikah/workspace-status');
        if (res.ok) {
          const data = (await res.json()) as {
            full_name?: string;
            website_enabled?: boolean;
            engagement_counters?: EngagementCounters;
          };
          if (data.full_name) setFetchedFullName(data.full_name);
          setEnabled(Boolean(data.website_enabled));
          if (data.engagement_counters) {
            setEngagementCounters(data.engagement_counters);
          }
        }
      } catch {
        // Non-fatal
      }
    })();
  }, [physicianId, physicianFullName]);

  // ---------------------------------------------------------------------------
  // URL deep link: ?editor=open auto-opens ThemingEditor (D-11)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!isFirstMount.current) return;
    isFirstMount.current = false;

    if (router.query.editor === 'open' && themeClaimed === true) {
      setEditorOpen(true);
    }
  }, [router.query.editor, themeClaimed]);

  // Also handle when theme loads after query param available
  useEffect(() => {
    if (router.query.editor === 'open' && themeClaimed === true && !editorOpen) {
      setEditorOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeClaimed]);

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const fullName = fetchedFullName || physicianFullName || '';
  const slug = fullName ? nameToSlug(fullName) : 'you';
  const siteUrl = `https://${slug}.medikah.health`;
  const previewUrl = `${siteUrl}?cachebust=${cachebust}`;

  // ---------------------------------------------------------------------------
  // Claim Try Pro Preview (D-19)
  // ---------------------------------------------------------------------------

  const handleClaim = async () => {
    setClaimState('claiming');
    setClaimError(null);
    try {
      const res = await fetch('/api/practikah/theme/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        setClaimState('claimed');
        setThemeClaimed(true);
        setCachebust(Date.now());
        setTimeout(() => setClaimState('idle'), 3000);
      } else {
        const data = (await res.json()) as { error?: string; detail?: string };
        setClaimError(data.error || data.detail || 'Unknown error');
        setClaimState('error');
      }
    } catch {
      setClaimError(lang === 'es' ? 'Error de red. Inténtalo de nuevo.' : 'Network error. Please try again.');
      setClaimState('error');
    }
  };

  // ---------------------------------------------------------------------------
  // Preview visit tracking (once per session — debounced with sessionStorage)
  // ---------------------------------------------------------------------------

  const trackPreviewVisit = () => {
    const key = `practikah_preview_visit_tracked_${physicianId}`;
    if (typeof sessionStorage !== 'undefined' && !sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, '1');
      trackEngagementEvent('preview_visit');
    }
  };

  // ---------------------------------------------------------------------------
  // Copy share link
  // ---------------------------------------------------------------------------

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(siteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      // Track share link copy engagement event (D-20 heuristic threshold: >= 1 copy)
      trackEngagementEvent('share_link_copied');
    } catch {
      // ignore
    }
  };

  // ---------------------------------------------------------------------------
  // Toggle physician_website.enabled
  // ---------------------------------------------------------------------------

  const toggleEnabled = async () => {
    const next = !enabled;
    setEnabled(next);
    try {
      await fetch(`/api/physicians/${physicianId}/website`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      });
      setCachebust(Date.now());
    } catch {
      // Revert on network error
      setEnabled(!next);
    }
  };

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (themeClaimed === null) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-clinical-teal border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // ThemingEditor full-screen overlay
  // ---------------------------------------------------------------------------

  if (editorOpen) {
    return (
      <div className="fixed inset-0 z-50 bg-white overflow-auto">
        <ThemingEditor
          physicianId={physicianId}
          lang={lang}
          accessToken={accessToken}
          slug={slug}
          onClose={() => {
            setEditorOpen(false);
            setCachebust(Date.now());
          }}
        />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Branch A: Theme not yet claimed → Claim CTA
  // ---------------------------------------------------------------------------

  if (!themeClaimed) {
    return (
      <div className="space-y-6">
        <div className="bg-linen rounded-md border border-warm-gray-800/[0.06] p-8 shadow-sm text-center">
          {/* Hero illustration placeholder */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-clinical-teal/10 flex items-center justify-center">
            <svg viewBox="0 0 40 40" fill="none" className="w-10 h-10">
              <rect x="4" y="8" width="32" height="22" rx="3" stroke="#2C7A8C" strokeWidth="2"/>
              <path d="M13 30l7 5 7-5" stroke="#2C7A8C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M20 13v10M15 18h10" stroke="#2C7A8C" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>

          <h2 className="font-heading uppercase text-xl text-inst-blue tracking-wide mb-2">
            {t.site.notClaimedTitle}
          </h2>
          <p className="font-body text-sm text-body-slate mb-2 max-w-sm mx-auto">
            {t.site.notClaimedBody}
          </p>
          <p className="font-dm-sans text-xs text-archival-grey mb-6 max-w-sm mx-auto">
            {t.site.claimDescription}
          </p>

          {claimState === 'claimed' && (
            <p className="font-dm-sans text-sm text-confirm-green mb-4 font-semibold">
              {t.site.claimSuccess}
            </p>
          )}

          {claimError && (
            <p className="font-dm-sans text-xs text-alert-garnet mb-4">{claimError}</p>
          )}

          <button
            type="button"
            disabled={claimState === 'claiming'}
            onClick={handleClaim}
            className="bg-clinical-teal text-white px-8 py-3 rounded-md font-dm-sans font-semibold text-sm hover:bg-clinical-teal/90 disabled:opacity-50 transition-colors"
          >
            {claimState === 'claiming'
              ? (lang === 'es' ? 'Activando...' : 'Activating...')
              : t.site.claimButton}
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Branch B: Theme claimed → Populated SiteTab with live preview
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Engagement-gated upgrade CTA banner (D-20 / FREE-08 / WSPC-07) — ABOVE preview */}
      {!bannerDismissed && (
        <UpgradeCTABanner
          lang={lang}
          counters={engagementCounters}
          placement="site-tab"
          onDismiss={() => setBannerDismissed(true)}
        />
      )}

      {/* Card: Site preview + actions */}
      <div className="bg-linen rounded-md border border-warm-gray-800/[0.06] p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
          <div>
            <h2 className="font-body font-semibold text-lg text-deep-charcoal mb-1">
              {t.site.cardTitle}
            </h2>
            <p className="font-body text-sm text-body-slate">{t.site.cardSubtitle}</p>
          </div>
          <span
            className={`font-dm-sans text-xs px-3 py-1 rounded-full ${
              enabled
                ? 'bg-confirm-green/10 text-confirm-green'
                : 'bg-archival-grey/10 text-archival-grey'
            }`}
          >
            {enabled ? t.site.toggleEnabled : t.site.toggleDisabled}
          </span>
        </div>

        <p className="font-dm-sans text-xs uppercase tracking-wide text-archival-grey mb-2">
          {t.site.previewLabel}
        </p>
        <iframe
          src={previewUrl}
          className="w-full h-[600px] rounded-md border border-warm-gray-800/[0.08]"
          title={t.site.previewLabel}
          onLoad={trackPreviewVisit}
        />

        <div className="flex flex-wrap gap-2 mt-4">
          {/* Edit Theme → opens ThemingEditor full-screen overlay */}
          <button
            type="button"
            onClick={() => setEditorOpen(true)}
            className="bg-clinical-teal text-white px-4 py-2 rounded-md font-dm-sans text-sm hover:bg-clinical-teal/90 transition-colors"
          >
            {t.site.editTheme}
          </button>

          <a
            href={siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-inst-blue text-white px-4 py-2 rounded-md font-dm-sans text-sm hover:bg-inst-blue/90 transition-colors"
            onClick={trackPreviewVisit}
          >
            {t.site.openInNewTab}
          </a>

          <button
            type="button"
            onClick={copyShareLink}
            className="bg-linen text-body-slate px-4 py-2 rounded-md font-dm-sans text-sm hover:bg-linen/80 border border-deep-charcoal/10 transition-colors"
          >
            {copied ? t.calendar.copied : t.site.copyShareLink}
          </button>

          {/* physician_website.enabled toggle */}
          <button
            type="button"
            onClick={toggleEnabled}
            className="bg-linen text-body-slate px-4 py-2 rounded-md font-dm-sans text-sm hover:bg-linen/80 border border-deep-charcoal/10 transition-colors"
          >
            {enabled ? t.site.toggleDisabled : t.site.toggleEnabled}
          </button>
        </div>
      </div>
    </div>
  );
}
