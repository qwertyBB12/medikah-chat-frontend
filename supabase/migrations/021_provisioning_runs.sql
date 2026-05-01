-- Migration 021: Provisioning Runs + Stripe Events Processed (Phase 13-01)
-- Implements:
--   D-13: Stripe is the single source of truth; webhook handler is the SOLE writer of
--         subscription state. stripe_events_processed enforces idempotency at the
--         DB layer (UNIQUE PRIMARY KEY on event_id) so duplicate Stripe deliveries
--         are absorbed even if app-level dedup is bypassed.
--   D-17: provisioning_runs is the saga state table for the Pro upgrade flow
--         (Phase 13-06). Stores run_id, status, current_step, completed steps,
--         retry counters, and Stripe correlation IDs so a crashed FastAPI process
--         can resume where it left off.
--   D-14: UUID PKs, TIMESTAMPTZ, ON DELETE CASCADE, RLS on every table — mirrors
--         017_practikah.sql verbatim.
--   T-13-01-03 / T-13-01-07: webhook event idempotency at the DB layer.
--
-- Mirrors 017_practikah.sql conventions exactly (RLS shape, indexes,
-- TEXT+CHECK pattern from 018_practikah_states.sql for status enums).

-- =====================================================
-- PART 1: PROVISIONING_RUNS (D-17)
-- Saga state per Phase 13 D-17 — one row per Pro upgrade saga run.
-- Allows crash-resume: orchestrator scans WHERE status IN ('pending','running','partial_finish_later')
-- on FastAPI startup and resumes from current_step.
-- =====================================================

CREATE TABLE IF NOT EXISTS provisioning_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Per D-14: ON DELETE CASCADE on physician_id FK
  physician_id UUID NOT NULL REFERENCES physicians(id) ON DELETE CASCADE,

  -- Correlates all log entries for one saga run (D-17). Globally unique.
  run_id UUID NOT NULL UNIQUE,

  -- Phase 13 supports a single saga today; left as a CHECK to make
  -- future additions (e.g. 'pro_downgrade') explicit and reviewable.
  saga_type TEXT NOT NULL CHECK (saga_type IN ('pro_upgrade')),

  -- D-17 state machine values. 'partial_finish_later' covers the case where
  -- a domain-side step finishes async (DNS propagation) and the saga is
  -- "succeeded enough to mark Pro" but not fully closed out.
  status TEXT NOT NULL CHECK (status IN ('pending','running','succeeded','failed','partial_finish_later')),

  -- Last step name attempted; used by crash-resume to know where to pick up.
  current_step TEXT,

  -- Append-only list of completed step names within this run.
  -- e.g. [{"step":"stripe.create_subscription","at":"2026-05-01T..."}, ...]
  steps_completed JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Last error envelope when status='failed'. Null otherwise.
  error JSONB,

  retry_count INT NOT NULL DEFAULT 0,

  -- Stripe correlation IDs surfaced from webhook payloads.
  stripe_session_id TEXT,
  stripe_subscription_id TEXT,

  -- Custom domain attached at upgrade time (NULL during plan/checkout phase).
  domain_name TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_provisioning_runs_physician
  ON provisioning_runs(physician_id);

-- Partial index for the crash-resume scanner — only "live" rows matter.
CREATE INDEX IF NOT EXISTS idx_provisioning_runs_status
  ON provisioning_runs(status)
  WHERE status IN ('pending','running','partial_finish_later');

CREATE INDEX IF NOT EXISTS idx_provisioning_runs_stripe_subscription_id
  ON provisioning_runs(stripe_subscription_id);

ALTER TABLE provisioning_runs ENABLE ROW LEVEL SECURITY;

-- Physicians can view their own runs (used by /upgrade/status SSE BFF in 13-06).
CREATE POLICY "Physicians can view own provisioning runs"
  ON provisioning_runs
  FOR SELECT
  USING (
    physician_id IN (
      SELECT id FROM physicians WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Service role manages writes (orchestrator + webhook handler are the only writers).
CREATE POLICY "Service role can manage provisioning runs"
  ON provisioning_runs
  FOR ALL
  USING (auth.role() = 'service_role');

-- updated_at trigger (mirrors 017 lines 86-97 trigger pattern)
CREATE OR REPLACE FUNCTION update_provisioning_runs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS provisioning_runs_updated_at ON provisioning_runs;
CREATE TRIGGER provisioning_runs_updated_at
  BEFORE UPDATE ON provisioning_runs
  FOR EACH ROW
  EXECUTE FUNCTION update_provisioning_runs_updated_at();

COMMENT ON TABLE provisioning_runs IS 'Phase 13 D-17: Saga state for the Pro upgrade flow. One row per saga run. Crash-resume scans WHERE status IN (''pending'',''running'',''partial_finish_later'') on FastAPI startup.';
COMMENT ON COLUMN provisioning_runs.status IS 'pending | running | succeeded | failed | partial_finish_later — D-17 state machine';
COMMENT ON COLUMN provisioning_runs.steps_completed IS 'Append-only JSONB array of {step, at} entries; used to compute resume point after crash.';
COMMENT ON COLUMN provisioning_runs.stripe_subscription_id IS 'Stripe subscription ID surfaced by checkout.session.completed; correlates to physician_workspace_accounts.';

-- =====================================================
-- PART 2: STRIPE_EVENTS_PROCESSED (D-13 / T-13-01-03 / T-13-01-07)
-- Webhook idempotency table. event_id is Stripe's globally unique event ID
-- (evt_*); PRIMARY KEY ensures duplicate deliveries are rejected at the DB
-- layer with O(1) UNIQUE INDEX check, even if app-level dedup is bypassed.
-- Append-only — NO updated_at, NO physician SELECT policy.
-- =====================================================

CREATE TABLE IF NOT EXISTS stripe_events_processed (
  -- Stripe's evt_* ID — globally unique per Stripe.
  event_id TEXT PRIMARY KEY,

  -- e.g. 'checkout.session.completed' | 'invoice.payment_succeeded' | ...
  event_type TEXT NOT NULL,

  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Best-effort link to the physician affected by this event; NULL when the
  -- event cannot be associated (e.g. malformed payload).
  physician_id UUID REFERENCES physicians(id) ON DELETE SET NULL,

  -- sha256 of the raw webhook payload — defense-in-depth for repudiation
  -- (T-13-01-03). Lets us prove the exact bytes we processed if Stripe later
  -- replays a stale event.
  payload_hash TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stripe_events_type
  ON stripe_events_processed(event_type);

CREATE INDEX IF NOT EXISTS idx_stripe_events_physician_id
  ON stripe_events_processed(physician_id);

ALTER TABLE stripe_events_processed ENABLE ROW LEVEL SECURITY;

-- INTENTIONAL: NO physician-level SELECT policy on this table.
-- Per D-13 / T-13-01-04: this table is admin/webhook-only. Physicians have
-- no need to enumerate Stripe event IDs — exposing them is information
-- disclosure surface for free. RLS denies by default when no matching policy
-- exists; only the service role can read/write.

CREATE POLICY "Service role can manage stripe events processed"
  ON stripe_events_processed
  FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE stripe_events_processed IS 'Phase 13 D-13: Webhook idempotency table. PRIMARY KEY on event_id deduplicates Stripe retry-storms at the DB layer (T-13-01-07). Admin/webhook-only — no physician SELECT policy.';
COMMENT ON COLUMN stripe_events_processed.event_id IS 'Stripe evt_* ID — globally unique. PRIMARY KEY enforces exactly-once processing.';
COMMENT ON COLUMN stripe_events_processed.payload_hash IS 'sha256(raw_body) — non-repudiation evidence of what we processed (T-13-01-03).';

-- =====================================================
-- END OF MIGRATION 021
-- =====================================================
