// @vitest-environment node
// (jose's `instanceof Uint8Array` checks reject jsdom's Uint8Array global; this
// is Node-side token-signing code, so the node environment is the correct fit.)
import { describe, it, expect, beforeAll } from 'vitest';
import { decodeJwt } from 'jose';

// The activation magic-link lifetime is security- AND onboarding-critical: too
// short (the old 30m) silently locks out doctors whose inbox is slow; the value
// must match between the JWT exp and the DB row (shared ACTIVATION_TTL_MINUTES).
beforeAll(() => {
  delete process.env.ACTIVATION_TTL_MINUTES; // exercise the default
  process.env.NEXTAUTH_SECRET =
    process.env.NEXTAUTH_SECRET || 'test-secret-at-least-32-bytes-long-aaaaaaaa';
});

describe('activation token TTL', () => {
  it('defaults ACTIVATION_TTL_MINUTES to 1440 (24h), not the old 30m', async () => {
    const { ACTIVATION_TTL_MINUTES } = await import('./activationTokens');
    expect(ACTIVATION_TTL_MINUTES).toBe(1440);
  });

  it('signs a token whose exp reflects ACTIVATION_TTL_MINUTES', async () => {
    const { signActivationToken, ACTIVATION_TTL_MINUTES } = await import('./activationTokens');
    const nowSec = Math.floor(Date.now() / 1000);
    const token = await signActivationToken({
      physician_id: 'p1',
      email: 'doc@example.com',
      jti: 'jti-1',
    });
    const { exp } = decodeJwt(token);
    expect(exp).toBeDefined();
    const lifetimeMin = ((exp as number) - nowSec) / 60;
    // Within a minute of the configured TTL...
    expect(lifetimeMin).toBeGreaterThanOrEqual(ACTIVATION_TTL_MINUTES - 1);
    expect(lifetimeMin).toBeLessThanOrEqual(ACTIVATION_TTL_MINUTES + 1);
    // ...and decisively NOT the old 30-minute window.
    expect(lifetimeMin).toBeGreaterThan(60);
  });
});
