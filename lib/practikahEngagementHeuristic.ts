/**
 * Práctikah upgrade CTA engagement heuristic (Phase 12-07)
 *
 * Determines whether to surface the "Make this real at your own domain" upgrade
 * CTA banner based on the doctor's engagement history with their Try Pro workspace.
 *
 * Heuristic per D-20 / FREE-08:
 *   Show after: >= 3 theme edits  OR  >= 2 preview visits  OR  >= 1 share link copy
 *   Hide for:   7 days after dismissal (cta_dismissed_at)
 *
 * Events are tracked via POST /api/practikah/engagement/track (fire-and-forget).
 * Counters live in physician_workspace_accounts.engagement_counters JSONB (migration 020).
 *
 * Trust boundary: counters are written server-side via service role only.
 * The doctor cannot directly manipulate them (T-12-07-01).
 */

// ---------------------------------------------------------------------------
// Event types
// ---------------------------------------------------------------------------

/**
 * All tracked engagement event types.
 * - theme_edit:         Doctor saved a theme change in ThemingEditor (autosave)
 * - preview_visit:      Doctor opened the Try Pro preview (iframe load or new tab)
 * - share_link_copied:  Doctor clicked "Copy Share Link" in SiteTab
 * - cta_dismissed:      Doctor clicked dismiss (×) on the upgrade banner
 * - upgrade_interest:   Doctor clicked "Notify me" on the upgrade placeholder page
 */
export type EngagementEvent =
  | 'theme_edit'
  | 'preview_visit'
  | 'share_link_copied'
  | 'cta_dismissed'
  | 'upgrade_interest';

// ---------------------------------------------------------------------------
// Counter shape
// ---------------------------------------------------------------------------

export interface EngagementCounters {
  theme_edit?: number;
  preview_visit?: number;
  share_link_copied?: number;
  cta_dismissed?: number;
  upgrade_interest?: number;
  /** ISO timestamp of first engagement event */
  first_engaged_at?: string;
  /** ISO timestamp of the most recent CTA dismissal */
  cta_dismissed_at?: string;
}

// ---------------------------------------------------------------------------
// Heuristic thresholds (D-20)
// ---------------------------------------------------------------------------

/**
 * Minimum engagement counts required to show the upgrade CTA.
 * Each threshold is independent — any one trigger is sufficient.
 */
const SHOW_THRESHOLDS = {
  theme_edit: 3,
  preview_visit: 2,
  share_link_copied: 1,
} as const;

/**
 * Number of days to suppress the banner after dismissal (cta_dismissed_at).
 * Per D-20 spec: "hides for 7 days after dismissal".
 */
const DISMISSAL_HIDE_DAYS = 7;

// ---------------------------------------------------------------------------
// Main heuristic function
// ---------------------------------------------------------------------------

/**
 * Returns true if the upgrade CTA banner should be shown to the doctor.
 *
 * Decision logic:
 * 1. If counters are null/undefined → false (no engagement data yet)
 * 2. If dismissed within the last 7 days → false
 * 3. If any engagement threshold is met → true
 * 4. Otherwise → false
 *
 * @param counters - The engagement_counters JSONB from physician_workspace_accounts
 * @returns Whether the upgrade CTA should be shown
 */
export function shouldShowUpgradeCTA(
  counters: EngagementCounters | null | undefined
): boolean {
  if (!counters) return false;

  // Check recent dismissal — suppress for DISMISSAL_HIDE_DAYS days
  if (counters.cta_dismissed_at) {
    const dismissedAt = new Date(counters.cta_dismissed_at);
    if (!isNaN(dismissedAt.getTime())) {
      const daysSinceDismissal =
        (Date.now() - dismissedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissal < DISMISSAL_HIDE_DAYS) return false;
    }
  }

  const themeEdits = counters.theme_edit ?? 0;
  const previewVisits = counters.preview_visit ?? 0;
  const shareLinkCopies = counters.share_link_copied ?? 0;

  return (
    themeEdits >= SHOW_THRESHOLDS.theme_edit ||
    previewVisits >= SHOW_THRESHOLDS.preview_visit ||
    shareLinkCopies >= SHOW_THRESHOLDS.share_link_copied
  );
}

// ---------------------------------------------------------------------------
// Client-side event tracking helper
// ---------------------------------------------------------------------------

/**
 * Fire-and-forget engagement event tracker.
 *
 * Posts the event to /api/practikah/engagement/track without awaiting the
 * result. Swallows all errors — engagement tracking must never block UX
 * or surface errors to the user (T-12-07-01: engagement is informational).
 *
 * @param event - The engagement event type to record
 */
export function trackEngagementEvent(event: EngagementEvent): void {
  fetch('/api/practikah/engagement/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event }),
  }).catch(() => {
    // Intentionally swallowed — engagement tracking is best-effort
  });
}
