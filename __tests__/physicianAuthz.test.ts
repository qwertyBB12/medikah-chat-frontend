// @vitest-environment node

/**
 * Fix A regression — physician ownership authorization.
 *
 * Root cause this guards against (found 2026-06-22): /api/physicians/[id]/* routes
 * authorized via `physician.email === session.user.email`. Post-v1.3 Mailcow identity,
 * session.user.email is the @medikah.health login while physicians.email holds the
 * original onboarding address → spurious 403 on the physician's OWN record. The
 * canonical key is the server-set `physician_id` claim (already trusted by
 * onboarding-status.ts).
 */

import { describe, it, expect } from 'vitest';
import { sessionOwnsPhysician } from '../lib/physicianAuthz';

const ID = '7f8a308f-e753-4d54-bfe9-19f430ac3a89';

describe('sessionOwnsPhysician', () => {
  it('authorizes via physician_id claim even when emails differ (the Mailcow case)', () => {
    const session = { user: { email: 'hhlopez@medikah.health', physician_id: ID } };
    const physician = { email: 'hector@nxtglobal.org' }; // legacy onboarding email
    expect(sessionOwnsPhysician(session, physician, ID)).toBe(true);
  });

  it('authorizes via legacy email match when no claim is present (bootstrap session)', () => {
    const session = { user: { email: 'Hector@NxtGlobal.org', physician_id: null } };
    const physician = { email: 'hector@nxtglobal.org' };
    expect(sessionOwnsPhysician(session, physician, ID)).toBe(true);
  });

  it('denies a foreign id: claim does not match the requested record', () => {
    const session = { user: { email: 'hhlopez@medikah.health', physician_id: ID } };
    const physician = { email: 'someone.else@medikah.health' };
    expect(sessionOwnsPhysician(session, physician, 'a-different-id')).toBe(false);
  });

  it('denies when neither claim nor email match', () => {
    const session = { user: { email: 'attacker@evil.com', physician_id: 'attacker-id' } };
    const physician = { email: 'victim@medikah.health' };
    expect(sessionOwnsPhysician(session, physician, ID)).toBe(false);
  });

  it('denies when both emails are missing and no claim (no implicit allow)', () => {
    const session = { user: { email: null, physician_id: null } };
    const physician = { email: null };
    expect(sessionOwnsPhysician(session, physician, ID)).toBe(false);
  });
});
