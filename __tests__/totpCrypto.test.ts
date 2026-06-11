// @vitest-environment node

/**
 * Phase 17 Plan 03 — Wave-0 TDD tests for totpCrypto helper (Task 1)
 *
 * Tests encryptTotpSecret / decryptTotpSecret round-trip behaviour and
 * tamper detection. Run before implementation exists (RED phase).
 *
 * All tests require TOTP_ENCRYPTION_KEY to be a 32-byte hex string.
 * When the env var is absent the test file stubs a 64-char hex key so
 * the tests can exercise the crypto path in any environment.
 */

import { describe, it, expect, beforeAll } from 'vitest';

// Stub a key if not set in environment
beforeAll(() => {
  if (!process.env.TOTP_ENCRYPTION_KEY) {
    process.env.TOTP_ENCRYPTION_KEY = 'a'.repeat(64); // 32 zero bytes as hex
  }
});

describe('totpCrypto', () => {
  it('exports encryptTotpSecret and decryptTotpSecret', async () => {
    const mod = await import('../lib/auth/totpCrypto');
    expect(typeof mod.encryptTotpSecret).toBe('function');
    expect(typeof mod.decryptTotpSecret).toBe('function');
  });

  it('round-trips a TOTP secret through encrypt then decrypt', async () => {
    const { encryptTotpSecret, decryptTotpSecret } = await import('../lib/auth/totpCrypto');
    const plaintext = 'JBSWY3DPEHPK3PXP';
    const ciphertext = encryptTotpSecret(plaintext);
    expect(typeof ciphertext).toBe('string');
    // Ciphertext must NOT equal plaintext
    expect(ciphertext).not.toBe(plaintext);
    const recovered = decryptTotpSecret(ciphertext);
    expect(recovered).toBe(plaintext);
  });

  it('produces different ciphertext on each encrypt call (random IV)', async () => {
    const { encryptTotpSecret } = await import('../lib/auth/totpCrypto');
    const plaintext = 'JBSWY3DPEHPK3PXP';
    const c1 = encryptTotpSecret(plaintext);
    const c2 = encryptTotpSecret(plaintext);
    // Random IV means ciphertexts differ
    expect(c1).not.toBe(c2);
  });

  it('ciphertext format contains exactly three colon-separated hex segments (iv:tag:ct)', async () => {
    const { encryptTotpSecret } = await import('../lib/auth/totpCrypto');
    const ciphertext = encryptTotpSecret('TESTSECRET');
    const parts = ciphertext.split(':');
    expect(parts).toHaveLength(3);
    // All three parts are non-empty hex strings
    for (const part of parts) {
      expect(part.length).toBeGreaterThan(0);
      expect(/^[0-9a-f]+$/.test(part)).toBe(true);
    }
  });

  it('IV segment is 24 hex chars (12-byte IV)', async () => {
    const { encryptTotpSecret } = await import('../lib/auth/totpCrypto');
    const ciphertext = encryptTotpSecret('SECRETTEST');
    const [iv] = ciphertext.split(':');
    expect(iv.length).toBe(24); // 12 bytes × 2 hex chars/byte
  });

  it('auth-tag segment is 32 hex chars (16-byte GCM tag)', async () => {
    const { encryptTotpSecret } = await import('../lib/auth/totpCrypto');
    const ciphertext = encryptTotpSecret('SECRETTEST');
    const parts = ciphertext.split(':');
    expect(parts[1].length).toBe(32); // 16 bytes × 2 hex chars/byte
  });

  it('tampered ciphertext throws on decrypt', async () => {
    const { encryptTotpSecret, decryptTotpSecret } = await import('../lib/auth/totpCrypto');
    const ciphertext = encryptTotpSecret('JBSWY3DPEHPK3PXP');
    // Flip last char of ciphertext to simulate tampering
    const parts = ciphertext.split(':');
    const ct = parts[2];
    parts[2] = ct.slice(0, -1) + (ct.at(-1) === 'f' ? 'e' : 'f');
    const tampered = parts.join(':');
    expect(() => decryptTotpSecret(tampered)).toThrow();
  });

  it('encrypts with AES-256-GCM (uses TOTP_ENCRYPTION_KEY from env)', async () => {
    // Verify that changing the env key makes decryption fail
    const { encryptTotpSecret, decryptTotpSecret } = await import('../lib/auth/totpCrypto');
    const ciphertext = encryptTotpSecret('JBSWY3DPEHPK3PXP');
    // Temporarily override key to a different value
    const origKey = process.env.TOTP_ENCRYPTION_KEY;
    process.env.TOTP_ENCRYPTION_KEY = 'b'.repeat(64);
    try {
      expect(() => decryptTotpSecret(ciphertext)).toThrow();
    } finally {
      process.env.TOTP_ENCRYPTION_KEY = origKey;
    }
  });
});
