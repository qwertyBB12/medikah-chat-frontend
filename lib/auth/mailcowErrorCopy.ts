/**
 * Mailcow auth — locked generic-failure copy (Phase 16, D-12).
 *
 * Single source of truth for the user-facing error string surfaced on every
 * failure outcome of the `mailcow-imap` NextAuth provider (`bad_password`,
 * `unknown_user`, `locked_out`, `infra_error`). The string never reveals which
 * side was wrong — see ROADMAP Phase 16 success criteria and `16-CONTEXT.md`
 * decision D-12.
 *
 * Referenced from:
 *   - `pages/chat.tsx` error banner (plan 04)
 *   - `lib/auth/mailcowImapProvider.ts` thrown error name (plan 03)
 *
 * The recovery page (`pages/auth/recovery.tsx`) maintains its own copy block
 * — this module is intentionally narrow to the locked generic-failure string.
 */

export type Lang = 'en' | 'es';

export const MAILCOW_ERROR_COPY = {
  errorMailcow: {
    en: 'Invalid credentials. Try again or use account recovery.',
    es: 'Credenciales no válidas. Inténtalo de nuevo o usa la recuperación de cuenta.',
  },
} as const;
