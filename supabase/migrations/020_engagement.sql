-- Migration 020: Engagement counters for upgrade CTA heuristic (Phase 12-07)
-- Implements:
--   FREE-08: engagement-gated upgrade CTA (D-20 heuristic)
--   WSPC-07: non-intrusive upgrade banner visibility gating
--
-- Adds engagement_counters JSONB column to physician_workspace_accounts.
-- Tracks: theme_edit, preview_visit, share_link_copied, cta_dismissed, upgrade_interest
-- along with first_engaged_at and cta_dismissed_at timestamps.
--
-- Uses ADD COLUMN IF NOT EXISTS for idempotency (mirrors 018 pattern).

ALTER TABLE physician_workspace_accounts
  ADD COLUMN IF NOT EXISTS engagement_counters JSONB NOT NULL DEFAULT '{}';

COMMENT ON COLUMN physician_workspace_accounts.engagement_counters IS
  'FREE-08 engagement heuristic counters. Keys: theme_edit, preview_visit, share_link_copied, cta_dismissed, upgrade_interest, first_engaged_at (ISO timestamp), cta_dismissed_at (ISO timestamp). Used by shouldShowUpgradeCTA() in practikahEngagementHeuristic.ts.';

-- Index for potential future queries on engagement data
CREATE INDEX IF NOT EXISTS idx_physician_workspace_accounts_engagement
  ON physician_workspace_accounts USING gin(engagement_counters);
