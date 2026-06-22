/**
 * physicianAuthz — canonical ownership check for /api/physicians/[id]/* routes.
 *
 * Post-v1.3 (Mailcow identity), the AUTHORITATIVE identity is the `physician_id`
 * JWT claim, set server-side in the NextAuth jwt() callback from the verified
 * login (see pages/api/auth/[...nextauth].ts). onboarding-status.ts already
 * authorizes on it.
 *
 * The legacy gate `physician.email === session.user.email` is stale: for a
 * Mailcow-identity physician, session.user.email is the `@medikah.health` login
 * while the physicians.email column still holds the original onboarding address,
 * so they never match → spurious 403 on the physician's OWN record.
 *
 * Authorization (a physician may only act on their own record):
 *   1. session.user.physician_id === urlId           (canonical), OR
 *   2. physician.email === session.user.email         (legacy fallback,
 *      case-insensitive — covers bootstrap/pre-Mailcow sessions with no claim).
 *
 * The route fetches the record by urlId, so physician.id === urlId; the claim
 * check is therefore a true ownership boundary (a foreign id won't match the
 * claim, and won't match the email of someone else's record either).
 */

export interface OwnableSession {
  user?: {
    email?: string | null;
    physician_id?: string | null;
  } | null;
}

export interface OwnablePhysician {
  email?: string | null;
}

export function sessionOwnsPhysician(
  session: OwnableSession | null | undefined,
  physician: OwnablePhysician | null | undefined,
  urlId: string,
): boolean {
  const claim = session?.user?.physician_id;
  if (claim && urlId && claim === urlId) return true;

  const sessionEmail = session?.user?.email?.toLowerCase();
  const recordEmail = physician?.email?.toLowerCase();
  return Boolean(sessionEmail && recordEmail && sessionEmail === recordEmail);
}
