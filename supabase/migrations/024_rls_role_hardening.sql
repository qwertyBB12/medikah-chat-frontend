-- 024_rls_role_hardening.sql
--
-- Security hardening (Phase: 2026-06-09 audit, finding H2).
-- Several RLS policies were written with `USING (true)` / no role clause, so
-- they applied to the PUBLIC role (incl. the browser `anon` key). The two below
-- exposed READ access to sensitive tables.
--
-- These tables are accessed by the application ONLY through the server-side
-- service-role client (`supabaseAdmin`), which BYPASSES RLS entirely. Dropping
-- the permissive policies therefore does NOT change application behaviour — it
-- only removes the latent anon-read exposure. RLS stays ENABLED on both tables;
-- with no policy present, anon/authenticated roles see zero rows while the
-- service role retains full access.
--
-- ⚠️  NOT auto-applied on deploy. Review, then run in the Supabase SQL editor
--     (or via `supabase db push`) against the production project.
--
-- Verified before writing:
--   * lib/linkedin.ts accesses linkedin_oauth_sessions via supabaseAdmin only.
--   * lib/adminAuth.ts reads admin_users via supabaseAdmin only.
--   * The browser anon client (lib/supabase.ts) does NOT read either table.

-- 1. linkedin_oauth_sessions — was readable AND deletable by anyone (USING true),
--    exposing every OAuth session row. All access is server-side (service role).
DROP POLICY IF EXISTS "Sessions are readable by session_id" ON linkedin_oauth_sessions;
DROP POLICY IF EXISTS "Sessions are deletable"             ON linkedin_oauth_sessions;
DROP POLICY IF EXISTS "Anyone can create linkedin sessions" ON linkedin_oauth_sessions;

-- 2. admin_users — the policy named "Service role full access" carried no role
--    clause, so it granted PUBLIC (incl. anon) read of the admin roster. The
--    service role bypasses RLS, so removing it leaves admin_users service-role-only.
DROP POLICY IF EXISTS "Service role full access" ON admin_users;

-- Note (intentionally NOT changed here): the INSERT policies on `physicians`
-- ("Physicians can insert own profile", WITH CHECK true) and
-- `physician_onboarding_audit` ("Anyone can insert audit entries", WITH CHECK
-- true) remain. The onboarding audit log is written by the browser anon client,
-- and tightening the physicians insert path needs a coordinated change to the
-- onboarding flow — tracked as a separate follow-up.
