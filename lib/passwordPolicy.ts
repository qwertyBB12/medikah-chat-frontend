/**
 * lib/passwordPolicy.ts
 *
 * Single source of truth for the Medikah / Práctikah password policy.
 *
 * Closes the Phase 17 SC2 carry-item: prior to this, every password-setting
 * surface enforced length-only (≥ 12 chars). SC2 requires "≥ 12 chars, mix".
 * Pre-CDMX hardening (decision 36, 2026-06-15) makes this the highest-leverage
 * fix before ~40 physicians set their own mailbox passwords at the event.
 *
 * Policy (one definition, enforced identically on every client + server surface):
 *   - At least PASSWORD_MIN_LENGTH (12) characters
 *   - At least PASSWORD_MIN_CLASSES (3) of the 4 character classes:
 *     lowercase, uppercase, digit, symbol (any non-alphanumeric)
 *
 * Surfaces enforce by importing checkPassword / isPasswordValid. Each surface
 * maps the returned `reason` code to its own bilingual EN/ES copy — this module
 * stays copy-free so it can run on both client and server without i18n coupling.
 */

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MIN_CLASSES = 3;

/** Stable reason code; surfaces map this to localized EN/ES copy. */
export type PasswordFailReason = 'too_short' | 'needs_mix' | null;

export interface PasswordCheck {
  valid: boolean;
  /** meets the minimum length */
  meetsLength: boolean;
  /** count of the 4 character classes present (0..4) */
  classCount: number;
  /** first failing rule, evaluated length-then-mix; null when valid */
  reason: PasswordFailReason;
}

/** Count how many of the 4 character classes appear in the string. */
export function countCharacterClasses(pwd: string): number {
  let count = 0;
  if (/[a-z]/.test(pwd)) count++;
  if (/[A-Z]/.test(pwd)) count++;
  if (/\d/.test(pwd)) count++;
  if (/[^a-zA-Z0-9]/.test(pwd)) count++;
  return count;
}

/** Full structured check — use when the caller needs the reason / class count. */
export function checkPassword(pwd: string): PasswordCheck {
  const value = typeof pwd === 'string' ? pwd : '';
  const meetsLength = value.length >= PASSWORD_MIN_LENGTH;
  const classCount = countCharacterClasses(value);
  const meetsMix = classCount >= PASSWORD_MIN_CLASSES;

  let reason: PasswordFailReason = null;
  if (!meetsLength) reason = 'too_short';
  else if (!meetsMix) reason = 'needs_mix';

  return {
    valid: meetsLength && meetsMix,
    meetsLength,
    classCount,
    reason,
  };
}

/** Boolean convenience for the common "is this acceptable?" gate. */
export function isPasswordValid(pwd: string): boolean {
  return checkPassword(pwd).valid;
}
