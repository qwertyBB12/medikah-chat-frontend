-- Migration 018: Práctikah Free-Tier State Machine + Schema Delta (Phase 12-02)
-- Implements:
--   WSPC-05: physician_workspace_accounts.state — free_pending → provisioning → free_active | free_failed
--   FREE-01/02: mailbox_address + mailbox_quota_mb columns for provisioned mailbox tracking
--   Phase 12-02 plan: adds title (Dr/Dra), state, mailbox_address, mailbox_quota_mb to
--                     physician_workspace_accounts (omitted from 017 — added here as delta)
--
-- Idempotent: uses ADD COLUMN IF NOT EXISTS throughout.
-- All new columns are nullable or have safe defaults (no data loss on existing rows).
--
-- State machine (WSPC-05):
--   free_pending   — workspace row created; mailbox not yet provisioned (wizard step 1/2)
--   provisioning   — wizard complete submitted; saga in-flight
--   free_active    — saga succeeded; mailbox live at mailbox_address
--   free_failed    — saga failed; operator or retry needed
--   (Phase 13 will add: pro_pending | pro_active | pro_failed | downgraded)

-- ============================================================
-- PART 1: Add state column (free-tier state machine — WSPC-05)
-- ============================================================

ALTER TABLE physician_workspace_accounts
  ADD COLUMN IF NOT EXISTS state TEXT NULL
    CHECK (
      state IS NULL
      OR state IN (
        'free_pending',
        'provisioning',
        'free_active',
        'free_failed',
        'pro_pending',
        'pro_active',
        'pro_failed',
        'downgraded'
      )
    );

COMMENT ON COLUMN physician_workspace_accounts.state IS
  'WSPC-05 state machine: free_pending → provisioning → free_active | free_failed. '
  'NULL means row exists but wizard not yet started. Phase 13 adds pro_* / downgraded values.';

-- Index for state-based queries (dashboard listing, health monitoring)
CREATE INDEX IF NOT EXISTS idx_physician_workspace_accounts_state
  ON physician_workspace_accounts(state);

-- ============================================================
-- PART 2: Add title column (Dr / Dra honorific — FREE-04)
-- ============================================================

ALTER TABLE physician_workspace_accounts
  ADD COLUMN IF NOT EXISTS title TEXT NULL
    CHECK (title IS NULL OR title IN ('Dr', 'Dra'));

COMMENT ON COLUMN physician_workspace_accounts.title IS
  'Physician honorific chosen in wizard step 1 (Dr or Dra). NULL until wizard step 1 completes.';

-- ============================================================
-- PART 3: Add mailbox_address column (FREE-02)
-- ============================================================
-- Stores the full provisioned mailbox address, e.g. 'dr-lopez@medikah.health' (free tier)
-- or 'dr.lopez@drlopez.health' (pro tier). NULL until provisioning succeeds (state=free_active).

ALTER TABLE physician_workspace_accounts
  ADD COLUMN IF NOT EXISTS mailbox_address TEXT NULL;

COMMENT ON COLUMN physician_workspace_accounts.mailbox_address IS
  'FREE-02: Full provisioned mailbox address. NULL until saga succeeds. '
  'Free tier: <local_part>@medikah.health. Pro tier: <local_part>@<custom_domain>.';

-- ============================================================
-- PART 4: Add mailbox_quota_mb column (MAIL-08: 10 GB default)
-- ============================================================

ALTER TABLE physician_workspace_accounts
  ADD COLUMN IF NOT EXISTS mailbox_quota_mb INTEGER NULL DEFAULT 10240;

COMMENT ON COLUMN physician_workspace_accounts.mailbox_quota_mb IS
  'MAIL-08: Mailbox storage quota in MB. Default 10240 (10 GB) per free-tier spec.';
