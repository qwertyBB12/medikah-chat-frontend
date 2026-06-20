-- =====================================================
-- Phase 21 — Cross-Surface Icon Rail + Steady-State Navigation
-- Migration 028: server-side JWT revocation epoch
-- =====================================================
-- The NextAuth session is a stateless HS256 JWT (≤1h maxAge). Clearing the
-- cookie on logout kills the same-browser session but does NOT revoke a *copied*
-- token before its exp — an exfiltrated cookie replays into the SSO gate
-- (pages/api/practikah/sso-verify.ts) for up to an hour.
--
-- session_epoch is the authoritative revocation watermark, in epoch SECONDS
-- (matching the JWT iat unit). At sign-in the token pins its issue time
-- (token.session_iat); the SSO gate rejects any token whose session_iat is
-- OLDER than the physician's session_epoch. Bumping the epoch to now()
-- instantly invalidates every outstanding token for that physician across all
-- devices. The next legitimate login mints a token with a newer session_iat and
-- passes.
--
-- Default 0: existing sessions are NOT mass-revoked on deploy (every real token
-- has iat > 0). The watermark only advances when a logout / admin TOTP-reset
-- explicitly bumps it.
--
-- Bumped by:
--   - GET /api/auth/workspace-logout       (unified cross-surface sign-out)
--   - /api/admin/totp-reset-approve         (admin 2FA reset — kills live sessions)
-- Checked by:
--   - GET /api/practikah/sso-verify         (nginx auth_request gate, cached 5s/cookie)
-- See lib/auth/sessionRevocation.ts.
-- =====================================================

ALTER TABLE physician_workspace_accounts
  ADD COLUMN IF NOT EXISTS session_epoch BIGINT NOT NULL DEFAULT 0;

COMMENT ON COLUMN physician_workspace_accounts.session_epoch IS 'Phase 21 server-side JWT revocation watermark, in epoch SECONDS. A session JWT is rejected by the SSO gate when its pinned session_iat < session_epoch. Bumped to now() on logout and admin TOTP-reset to invalidate all outstanding copied tokens across every device. Default 0 so existing sessions survive deploy. See lib/auth/sessionRevocation.ts.';
