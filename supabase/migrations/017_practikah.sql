-- Migration 017: Práctikah Workspace Schema (Phase 11)
-- Implements:
--   WSPC-02: physician_workspace_accounts — one Medikah login → workspace (tier/mailbox/Stripe state)
--   WSPC-06: physician_domains, physician_website_themes — workspace components (domains + site themes)
--   OPS-01:  workspace_audit_log — 6-year compliance event retention (append-only)
--   D-13:    practikah_provisioning_log — system event log (~90-day retention, append-only)
--   D-14:    UUID PKs, TIMESTAMPTZ, ON DELETE CASCADE, RLS on every table (mirrors 016 verbatim)
--   D-15:    Extends physician_consent_records + physician_website with v1.2 columns
--
-- Complements 016_verification_engine.sql (append-only audit pattern, RLS shape, trigger pattern).

-- =====================================================
-- PART 1: PHYSICIAN_WORKSPACE_ACCOUNTS (WSPC-02)
-- Holds tier / mailbox / Stripe state per physician workspace.
-- One row per physician — UNIQUE(physician_id).
-- =====================================================

CREATE TABLE IF NOT EXISTS physician_workspace_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Per D-14: physician_id FK uses ON DELETE CASCADE
  physician_id UUID NOT NULL REFERENCES physicians(id) ON DELETE CASCADE,

  -- 'free' | 'pro_standard' | 'pro_premium'
  tier TEXT NOT NULL DEFAULT 'free',

  -- Picked at first workspace access (FREE-04); NULL until chosen
  mailbox_local_part TEXT NULL,

  -- Flips to custom domain on Pro upgrade; NULL until workspace provisioned
  mailbox_domain TEXT NULL DEFAULT 'medikah.health',

  mailbox_password_set BOOLEAN NOT NULL DEFAULT FALSE,

  -- Populated at first Pro upgrade (PRO-01)
  stripe_customer_id TEXT NULL,
  stripe_subscription_id TEXT NULL,

  -- 'active' | 'past_due' | 'canceled' | NULL for free tier
  subscription_status TEXT NULL,

  -- Stripe billing cycle end; NULL for free tier
  current_period_end TIMESTAMPTZ NULL,

  -- Set when the doctor completes the workspace onboarding wizard (Phase 12)
  workspace_setup_completed_at TIMESTAMPTZ NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(physician_id)
);

-- Per D-14 RLS pattern from 016: physician SELECT/UPDATE own row; service role FOR ALL
CREATE INDEX IF NOT EXISTS idx_physician_workspace_accounts_physician_id
  ON physician_workspace_accounts(physician_id);
CREATE INDEX IF NOT EXISTS idx_physician_workspace_accounts_subscription_status
  ON physician_workspace_accounts(subscription_status);

ALTER TABLE physician_workspace_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Physicians can view own workspace account"
  ON physician_workspace_accounts
  FOR SELECT
  USING (
    physician_id IN (
      SELECT id FROM physicians WHERE email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Physicians can update own workspace account"
  ON physician_workspace_accounts
  FOR UPDATE
  USING (
    physician_id IN (
      SELECT id FROM physicians WHERE email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Service role can manage workspace accounts"
  ON physician_workspace_accounts
  FOR ALL
  USING (auth.role() = 'service_role');

-- updated_at trigger (mirrors 016 lines 196-207 consejo_thresholds trigger pattern)
CREATE OR REPLACE FUNCTION update_physician_workspace_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER physician_workspace_accounts_updated_at
  BEFORE UPDATE ON physician_workspace_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_physician_workspace_accounts_updated_at();

COMMENT ON TABLE physician_workspace_accounts IS 'WSPC-02: One row per physician workspace. Holds tier (free/pro_standard/pro_premium), mailbox local-part and domain, mailbox password state, and Stripe subscription metadata.';
COMMENT ON COLUMN physician_workspace_accounts.tier IS 'free | pro_standard | pro_premium — determines feature access and billing tier';
COMMENT ON COLUMN physician_workspace_accounts.subscription_status IS 'Stripe subscription status: active | past_due | canceled | NULL (free tier)';
COMMENT ON COLUMN physician_workspace_accounts.mailbox_local_part IS 'dr- or dra- prefix + physician name fragment; chosen at first workspace access (FREE-04)';

-- =====================================================
-- PART 2: PHYSICIAN_DOMAINS (WSPC-06)
-- Per-Pro-domain registry linking physician → registrar resource → Cloudflare zone.
-- =====================================================

CREATE TABLE IF NOT EXISTS physician_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Per D-14: ON DELETE CASCADE on physician_id FK
  physician_id UUID NOT NULL REFERENCES physicians(id) ON DELETE CASCADE,
  workspace_account_id UUID NOT NULL REFERENCES physician_workspace_accounts(id) ON DELETE CASCADE,

  -- e.g., 'drlopez.com' or 'sandbox-drlopez.com' in sandbox mode (D-19)
  domain TEXT NOT NULL,

  -- 'cloudflare' | 'opensrs' (ccTLD fallback)
  registrar TEXT NOT NULL,

  -- Vendor's resource ID; 'mock-<sha>' in mocked-mode dry-run (D-18)
  registrar_domain_id TEXT NULL,

  -- Cloudflare zone and custom-hostname IDs (CF for SaaS)
  cloudflare_zone_id TEXT NULL,
  cloudflare_hostname_id TEXT NULL,

  -- 'pending' | 'active' | 'released' | 'transfer_out_requested'
  status TEXT NOT NULL DEFAULT 'pending',

  whois_privacy BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ NULL,
  auto_renew BOOLEAN NOT NULL DEFAULT TRUE,

  -- D-19: sandbox-prefixed rows on live VPS, tagged for cleanup; no parallel infra twin
  is_sandbox BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(domain)
);

CREATE INDEX IF NOT EXISTS idx_physician_domains_physician_id
  ON physician_domains(physician_id);
CREATE INDEX IF NOT EXISTS idx_physician_domains_workspace_account_id
  ON physician_domains(workspace_account_id);
CREATE INDEX IF NOT EXISTS idx_physician_domains_status
  ON physician_domains(status);
CREATE INDEX IF NOT EXISTS idx_physician_domains_expires_at
  ON physician_domains(expires_at);

ALTER TABLE physician_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Physicians can view own domains"
  ON physician_domains
  FOR SELECT
  USING (
    physician_id IN (
      SELECT id FROM physicians WHERE email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Physicians can update own domains"
  ON physician_domains
  FOR UPDATE
  USING (
    physician_id IN (
      SELECT id FROM physicians WHERE email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Service role can manage physician domains"
  ON physician_domains
  FOR ALL
  USING (auth.role() = 'service_role');

-- updated_at trigger (mirrors 016 pattern)
CREATE OR REPLACE FUNCTION update_physician_domains_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER physician_domains_updated_at
  BEFORE UPDATE ON physician_domains
  FOR EACH ROW
  EXECUTE FUNCTION update_physician_domains_updated_at();

COMMENT ON TABLE physician_domains IS 'WSPC-06: Per-Pro-domain registry. Links physician workspace → registrar resource → Cloudflare zone and Custom Hostname (CF for SaaS). One row per registered domain per physician.';
COMMENT ON COLUMN physician_domains.registrar IS 'Registrar vendor: cloudflare (primary) | opensrs (ccTLD fallback per Phase 11 D-01 / STACK §3)';
COMMENT ON COLUMN physician_domains.is_sandbox IS 'D-19: TRUE for sandbox-prefixed rows written during MEDIKAH_PROVISIONING_SANDBOX=true runs. Cleanup job sweeps rows WHERE is_sandbox = TRUE.';
COMMENT ON COLUMN physician_domains.status IS 'pending | active | released | transfer_out_requested — tracks domain lifecycle';

-- =====================================================
-- PART 3: PHYSICIAN_WEBSITE_THEMES (WSPC-06 / WEB-11..13)
-- Stores theme customization per physician website.
-- One row per physician — UNIQUE(physician_id).
-- =====================================================

CREATE TABLE IF NOT EXISTS physician_website_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Per D-14: ON DELETE CASCADE on physician_id FK
  physician_id UUID NOT NULL REFERENCES physicians(id) ON DELETE CASCADE,

  -- WEB-11: 'classic' | 'editorial' | 'minimal'
  layout_variant TEXT NOT NULL DEFAULT 'classic',

  -- WEB-11: WCAG-AA palette accent color (hex string)
  accent_color TEXT NOT NULL DEFAULT '#2C7A8C',

  -- WEB-11: 'light' | 'regular' | 'bold'
  font_weight TEXT NOT NULL DEFAULT 'regular',

  -- WEB-13: Favicon URL (Supabase storage path or null)
  favicon_url TEXT NULL,

  -- WEB-12: Array of Supabase storage paths for office photos
  office_photo_urls JSONB NOT NULL DEFAULT '[]',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(physician_id)
);

CREATE INDEX IF NOT EXISTS idx_physician_website_themes_physician_id
  ON physician_website_themes(physician_id);

ALTER TABLE physician_website_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Physicians can view own website theme"
  ON physician_website_themes
  FOR SELECT
  USING (
    physician_id IN (
      SELECT id FROM physicians WHERE email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Physicians can update own website theme"
  ON physician_website_themes
  FOR UPDATE
  USING (
    physician_id IN (
      SELECT id FROM physicians WHERE email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Service role can manage website themes"
  ON physician_website_themes
  FOR ALL
  USING (auth.role() = 'service_role');

-- updated_at trigger (mirrors 016 pattern)
CREATE OR REPLACE FUNCTION update_physician_website_themes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER physician_website_themes_updated_at
  BEFORE UPDATE ON physician_website_themes
  FOR EACH ROW
  EXECUTE FUNCTION update_physician_website_themes_updated_at();

COMMENT ON TABLE physician_website_themes IS 'WSPC-06 / WEB-11..13: Per-physician website theme customization. Stores layout variant, accent color, font weight, favicon, and office photos. One row per physician.';
COMMENT ON COLUMN physician_website_themes.layout_variant IS 'WEB-11: Site layout: classic | editorial | minimal';
COMMENT ON COLUMN physician_website_themes.accent_color IS 'WEB-11: Hex color string; must be WCAG-AA compliant against both light and dark surfaces';
COMMENT ON COLUMN physician_website_themes.office_photo_urls IS 'WEB-12: JSONB array of Supabase storage paths for office/practice photos';

-- =====================================================
-- PART 4: PRACTIKAH_PROVISIONING_LOG (D-13)
-- Append-only system event log for the Práctikah provisioning saga.
-- ~90-day retention via post-launch archive job.
-- NO updated_at — immutable append-only log.
-- =====================================================

CREATE TABLE IF NOT EXISTS practikah_provisioning_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Per D-14: ON DELETE CASCADE on physician_id FK
  physician_id UUID NOT NULL REFERENCES physicians(id) ON DELETE CASCADE,

  -- Correlates all events of one provisioning run (D-09 crash-recovery uses this)
  run_id UUID NOT NULL,

  -- 'registrar.register' | 'cloudflare.create_zone' | 'mailcow.add_domain' | 'mailcow.add_mailbox' | 'dns.write' | 'cloudflare.create_custom_hostname' | etc.
  step_name TEXT NOT NULL,

  -- 'domain' | 'mailbox' | 'dns' | 'cloudflare_zone' | 'cloudflare_hostname' | 'workspace'
  resource_type TEXT NOT NULL,

  -- Per D-10 event values (state machine transitions):
  -- 'requested' | 'succeeded' | 'failed' | 'rollback_started' | 'rollback_succeeded' | 'rollback_failed'
  event TEXT NOT NULL,

  -- Free-form JSONB payload per step (vendor resource IDs, error messages, etc.)
  detail JSONB NOT NULL DEFAULT '{}',

  -- Who initiated this provisioning run
  initiated_by TEXT NOT NULL DEFAULT 'system',

  -- Per D-10: sha256(physician_id|resource_type|run_id|step_name|event) — prevents duplicate row replay
  idempotency_key TEXT NOT NULL,

  -- Immutable timestamp (server-assigned)
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Per D-13: indexes for rollback runner (list_completed_steps_for_run) + archive job + monitoring
CREATE INDEX IF NOT EXISTS idx_practikah_provisioning_log_run_id
  ON practikah_provisioning_log(run_id);
CREATE INDEX IF NOT EXISTS idx_practikah_provisioning_log_physician_id
  ON practikah_provisioning_log(physician_id);
CREATE INDEX IF NOT EXISTS idx_practikah_provisioning_log_recorded_at
  ON practikah_provisioning_log(recorded_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_practikah_provisioning_log_idempotency
  ON practikah_provisioning_log(idempotency_key);

ALTER TABLE practikah_provisioning_log ENABLE ROW LEVEL SECURITY;

-- Physicians can SELECT their own provisioning history
CREATE POLICY "Physicians can view own provisioning log"
  ON practikah_provisioning_log
  FOR SELECT
  USING (
    physician_id IN (
      SELECT id FROM physicians WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Service role can INSERT only — no UPDATE/DELETE policies granted at all
-- This enforces append-only: even the service role cannot modify past provisioning rows
-- (RLS denies by default when no matching policy exists)
-- Per D-14 RLS pattern from 016 lines 116-148
CREATE POLICY "Service role can insert provisioning log"
  ON practikah_provisioning_log
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can select provisioning log"
  ON practikah_provisioning_log
  FOR SELECT
  USING (auth.role() = 'service_role');

-- NO UPDATE policy — RLS denies
-- NO DELETE policy — RLS denies
-- This is the append-only guarantee

COMMENT ON TABLE practikah_provisioning_log IS 'Phase 11 D-13: System provisioning event log. ~90-day retention via post-launch archive job. Append-only. No UPDATE/DELETE policies.';
COMMENT ON COLUMN practikah_provisioning_log.event IS 'State machine transition values: requested | succeeded | failed | rollback_started | rollback_succeeded | rollback_failed';
COMMENT ON COLUMN practikah_provisioning_log.idempotency_key IS 'sha256(physician_id|resource_type|run_id|step_name|event) — computed by the audit helper to prevent duplicate row insertion per D-10';
COMMENT ON COLUMN practikah_provisioning_log.initiated_by IS 'Who triggered this run: doctor | admin | system_renewal | system_health | system';

-- =====================================================
-- PART 5: WORKSPACE_AUDIT_LOG (OPS-01)
-- Append-only compliance event log. 6-year retention required per OPS-01.
-- NO updated_at — immutable append-only log.
-- =====================================================

CREATE TABLE IF NOT EXISTS workspace_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Per D-14: ON DELETE CASCADE on physician_id FK
  physician_id UUID NOT NULL REFERENCES physicians(id) ON DELETE CASCADE,

  -- Session userId; NULL for system-initiated actions
  actor_id UUID NULL,

  -- 'physician' | 'admin' | 'system'
  actor_role TEXT NOT NULL,

  -- Per D-13 Table B — 9 valid action values (workspace.login | mailbox.access | domain.changed |
  -- site.edited | theme.changed | pro.upgraded | pro.downgraded | phi_warning.overridden | consent.signed)
  action TEXT NOT NULL,

  -- Polymorphic resource reference (NULL for actions not tied to a specific resource)
  resource_type TEXT NULL,
  resource_id UUID NULL,

  -- Free-form compliance detail payload
  detail JSONB NOT NULL DEFAULT '{}',

  -- Captured only on security-relevant actions (workspace.login, consent.signed, phi_warning.overridden)
  -- per 11-PATTERNS.md discretion guidance — omitted for routine actions to minimize PII surface
  ip_address INET NULL,
  user_agent TEXT NULL,

  -- Immutable timestamp (server-assigned)
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspace_audit_log_physician_id
  ON workspace_audit_log(physician_id);
CREATE INDEX IF NOT EXISTS idx_workspace_audit_log_action
  ON workspace_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_workspace_audit_log_occurred_at
  ON workspace_audit_log(occurred_at DESC);

ALTER TABLE workspace_audit_log ENABLE ROW LEVEL SECURITY;

-- Physicians can SELECT their own compliance audit history
CREATE POLICY "Physicians can view own workspace audit log"
  ON workspace_audit_log
  FOR SELECT
  USING (
    physician_id IN (
      SELECT id FROM physicians WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Service role can INSERT only — no UPDATE/DELETE policies granted at all
-- This enforces append-only: even the service role cannot modify past audit rows
-- (RLS denies by default when no matching policy exists)
-- Per D-14 RLS pattern from 016 lines 116-148
CREATE POLICY "Service role can insert workspace audit log"
  ON workspace_audit_log
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can select workspace audit log"
  ON workspace_audit_log
  FOR SELECT
  USING (auth.role() = 'service_role');

-- NO UPDATE policy — RLS denies
-- NO DELETE policy — RLS denies
-- This is the append-only guarantee

COMMENT ON TABLE workspace_audit_log IS 'OPS-01: Compliance event log — 6-year retention required. Append-only. No UPDATE/DELETE policies.';
COMMENT ON COLUMN workspace_audit_log.action IS 'Valid action values (D-13 Table B): workspace.login | mailbox.access | domain.changed | site.edited | theme.changed | pro.upgraded | pro.downgraded | phi_warning.overridden | consent.signed';
COMMENT ON COLUMN workspace_audit_log.actor_id IS 'Session userId from NextAuth JWT; NULL for system-initiated actions (renewal, health checks)';
COMMENT ON COLUMN workspace_audit_log.ip_address IS 'Captured only on security-relevant actions (workspace.login, consent.signed, phi_warning.overridden) to minimize PII surface';

-- =====================================================
-- PART 6: EXTEND physician_consent_records (D-15)
-- No DDL change needed — 'form_type' VARCHAR(50) already accepts arbitrary strings.
-- This COMMENT documents the new reserved value for Phase 14 PHI consent (PHI-01..04).
-- Per D-15 spec: application-layer convention, not a CHECK constraint (would invalidate existing rows).
-- =====================================================

COMMENT ON COLUMN physician_consent_records.form_type IS 'Reserved values: network_agreement | practikah_pii_acknowledgment (added Phase 11 D-15 for Phase 14 PHI consent)';

-- =====================================================
-- PART 7: EXTEND physician_website (D-15)
-- Additive ALTER — no schema change to existing rows.
-- ON DELETE SET NULL chosen so a domain release does not orphan-delete the website row.
-- =====================================================

ALTER TABLE physician_website
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ NULL;

ALTER TABLE physician_website
  ADD COLUMN IF NOT EXISTS published_to_domain_id UUID NULL
    REFERENCES physician_domains(id) ON DELETE SET NULL;

COMMENT ON COLUMN physician_website.published_at IS 'Phase 11 D-15: Set when the doctor publishes the site (Try Pro preview or Pro custom-domain).';
COMMENT ON COLUMN physician_website.published_to_domain_id IS 'Phase 11 D-15: NULL for Try Pro preview at <slug>.medikah.health; FK to physician_domains for Pro custom-domain.';

-- =====================================================
-- END OF MIGRATION 017
-- =====================================================
