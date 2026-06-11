/**
 * Phase 17 — TOTP Secret Crypto Helper
 *
 * AES-256-GCM encrypt/decrypt for the physician TOTP secret stored at rest
 * in physician_workspace_accounts.totp_secret.
 *
 * Security contract (T-17-03-03):
 *   - Key is TOTP_ENCRYPTION_KEY env var (32 bytes = 64 hex chars).
 *   - 12-byte random IV per encrypt call (prevents IV reuse attacks).
 *   - 16-byte GCM auth tag detects any tampering (decryptTotpSecret throws).
 *   - Ciphertext format: iv_hex + ':' + authTag_hex + ':' + ciphertext_hex
 *   - Raw plaintext (TOTP secret) is NEVER logged.
 *   - No console.* calls in this file.
 */

import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Key derivation
// ---------------------------------------------------------------------------

/**
 * Derive the AES-256-GCM encryption key from TOTP_ENCRYPTION_KEY env var.
 * Expects a 64-character hex string (32 bytes).
 */
function getKey(): Buffer {
  const hex = process.env.TOTP_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error('[totpCrypto] TOTP_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)');
  }
  return Buffer.from(hex, 'hex');
}

// ---------------------------------------------------------------------------
// encryptTotpSecret
// ---------------------------------------------------------------------------

/**
 * Encrypt a TOTP secret (base32 string) using AES-256-GCM.
 *
 * Returns a string in the format: `iv_hex:authTag_hex:ciphertext_hex`
 *   - iv_hex       — 24 hex chars (12-byte random IV)
 *   - authTag_hex  — 32 hex chars (16-byte GCM authentication tag)
 *   - ciphertext_hex — hex-encoded encrypted bytes
 *
 * A fresh 12-byte IV is generated on every call, ensuring that two calls
 * with the same plaintext produce different ciphertexts.
 */
export function encryptTotpSecret(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString('hex'),
    authTag.toString('hex'),
    encrypted.toString('hex'),
  ].join(':');
}

// ---------------------------------------------------------------------------
// decryptTotpSecret
// ---------------------------------------------------------------------------

/**
 * Decrypt a TOTP secret encrypted by encryptTotpSecret.
 *
 * @param ciphertext — string in the format `iv_hex:authTag_hex:ciphertext_hex`
 * @returns Decrypted plaintext string.
 * @throws If the ciphertext is malformed, the key is wrong, or the auth tag
 *         fails (indicating tampering).
 */
export function decryptTotpSecret(ciphertext: string): string {
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error('[totpCrypto] Invalid ciphertext format: expected iv:tag:ct');
  }

  const [ivHex, tagHex, ctHex] = parts;
  const key = getKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(tagHex, 'hex');
  const encrypted = Buffer.from(ctHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  // If auth tag verification fails, decipher.final() throws — tamper detected.
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}
