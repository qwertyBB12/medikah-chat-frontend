/**
 * Phase 21 — server-side JWT revocation.
 *
 * The NextAuth session is a stateless HS256 JWT (≤1h maxAge). Clearing the
 * cookie on logout kills the same-browser session but does NOT revoke a *copied*
 * token before its exp. This module is the authoritative cross-device kill: a
 * per-physician `session_epoch` watermark (epoch SECONDS) on
 * physician_workspace_accounts. Each token pins its issue time at sign-in
 * (token.session_iat); the SSO gate rejects any token whose session_iat predates
 * the physician's epoch. Bumping the epoch to now() invalidates every outstanding
 * token for that physician everywhere at once.
 *
 *   - Checked by   pages/api/practikah/sso-verify.ts   (nginx auth_request gate)
 *   - Bumped by    pages/api/auth/workspace-logout.ts  (unified sign-out)
 *                  pages/api/admin/totp-reset-approve.ts (admin 2FA reset)
 *   - Column added in supabase/migrations/028_session_revocation.sql
 *
 * FAIL-OPEN posture (Hector, by voice 2026-06-20): the epoch check is an
 * ADDITIONAL layer on top of the signature/role/verified checks already enforced
 * by the gate. Any missing input, missing row, or DB error returns "not revoked"
 * so a Supabase blip (free-tier autopause has taken the DB down before) can never
 * drop us below the pre-revocation security baseline by locking the launch cohort
 * out of their email. The cost is that revocation is paused — not bypassed —
 * during an outage. This mirrors the established fail-open pattern in the jwt()
 * bootstrap-demotion gate (T-18-04-03).
 */

import { supabaseAdmin } from '../supabaseServer';

/** Current time in epoch SECONDS — the unit shared by JWT `iat` and `session_epoch`. */
export function nowEpochSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * True when the token (identified by its pinned session_iat) was issued before
 * the physician's revocation watermark. FAILS OPEN (returns false) on any missing
 * input, missing workspace row, unconfigured admin client, or DB error.
 */
export async function isSessionRevoked(
  physicianId: string | undefined,
  sessionIat: number | undefined,
): Promise<boolean> {
  // No pinned issue time → the watermark cannot be evaluated. Fail open.
  if (
    !physicianId ||
    typeof sessionIat !== 'number' ||
    !Number.isFinite(sessionIat)
  ) {
    return false;
  }
  if (!supabaseAdmin) return false;

  try {
    const { data, error } = await supabaseAdmin
      .from('physician_workspace_accounts')
      .select('session_epoch')
      .eq('physician_id', physicianId)
      .maybeSingle();

    if (error) {
      console.error(
        '[sessionRevocation] epoch read failed — failing open:',
        error.message,
      );
      return false;
    }

    // BIGINT may arrive as number or string from PostgREST; coerce defensively.
    const epoch = Number((data as { session_epoch?: number | string } | null)?.session_epoch ?? 0);
    if (!Number.isFinite(epoch) || epoch <= 0) return false;

    return sessionIat < epoch;
  } catch (err) {
    console.error(
      '[sessionRevocation] epoch read exception — failing open:',
      err instanceof Error ? err.message : String(err),
    );
    return false;
  }
}

/**
 * Advance the physician's revocation watermark to now → invalidates every
 * outstanding token for that physician across all devices. Best-effort: returns
 * false on any failure and NEVER throws, so callers must not block sign-out (or
 * an admin reset) on the result. The same-browser cookie clear and the credential
 * change are the primary kills; this is the cross-device backstop.
 */
export async function bumpSessionEpoch(
  physicianId: string | undefined,
): Promise<boolean> {
  if (!physicianId || !supabaseAdmin) return false;
  try {
    const { error } = await supabaseAdmin
      .from('physician_workspace_accounts')
      .update({ session_epoch: nowEpochSeconds() })
      .eq('physician_id', physicianId);

    if (error) {
      console.error('[sessionRevocation] epoch bump failed:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error(
      '[sessionRevocation] epoch bump exception:',
      err instanceof Error ? err.message : String(err),
    );
    return false;
  }
}
