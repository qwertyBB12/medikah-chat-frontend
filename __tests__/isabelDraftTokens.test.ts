import { describe, it, expect } from 'vitest';
import { hashDraftToken, isPlausibleToken, isDraftExpired } from '../lib/isabel/draftTokens';

describe('isabel draft tokens (one-tap approve guards, task #28)', () => {
  it('hashes match the watcher side (python: hashlib.sha256(token).hexdigest())', () => {
    // echo -n "test-token" | shasum -a 256
    expect(hashDraftToken('test-token')).toBe(
      '4c5dc9b7708905f77f5e5d16316b5dfb425e68cb326dcd55a860e90a7707031e',
    );
    expect(hashDraftToken('a')).not.toBe(hashDraftToken('b'));
    expect(hashDraftToken('x')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('accepts url-safe base64 tokens of the size token_urlsafe(32) emits', () => {
    expect(isPlausibleToken('KDoOw0Q4vpDqCzUWi-1BFAJgeIS_mhBTB3XPjBpuLXk')).toBe(true);
    expect(isPlausibleToken('A'.repeat(20))).toBe(true);
  });

  it('rejects junk before any DB lookup', () => {
    expect(isPlausibleToken('')).toBe(false);
    expect(isPlausibleToken('short')).toBe(false);
    expect(isPlausibleToken('has spaces in it and is long enough')).toBe(false);
    expect(isPlausibleToken("x'; drop table isabel_drafts; --")).toBe(false);
    expect(isPlausibleToken(42)).toBe(false);
    expect(isPlausibleToken(null)).toBe(false);
    expect(isPlausibleToken(undefined)).toBe(false);
    expect(isPlausibleToken(['a'.repeat(30)])).toBe(false);
    expect(isPlausibleToken('A'.repeat(200))).toBe(false);
  });

  it('expiry is a strict past-check on token_expires_at', () => {
    const past = new Date(Date.now() - 1000).toISOString();
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(isDraftExpired({ token_expires_at: past })).toBe(true);
    expect(isDraftExpired({ token_expires_at: future })).toBe(false);
    // Fail closed: unparseable timestamps read as expired.
    expect(isDraftExpired({ token_expires_at: 'garbage' })).toBe(true);
  });
});
