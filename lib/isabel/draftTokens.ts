/**
 * Isabel one-tap approval tokens.
 *
 * Unlike the clerk's signed JWT, Isabel's watcher runs OUTSIDE this codebase
 * (kah-operations GH Actions) — sharing NEXTAUTH_SECRET there would widen a
 * core secret's blast radius. Instead the watcher mints a random opaque token
 * (`secrets.token_urlsafe(32)`) and stores only its SHA-256 hex in
 * `isabel_drafts.token_hash`. The endpoints hash the presented token and look
 * the row up; single-use is the `pending → decided` status flip, expiry is
 * `token_expires_at`. Same Phase-18 D-14 properties (bound, expiring,
 * single-use, admin-session-gated on top) without a shared signing key.
 */
import { createHash } from 'crypto';

export interface IsabelDraft {
  id: string;
  source_from: string;
  source_subject: string | null;
  source_excerpt: string | null;
  recipient: string;
  reply_to_message_id: string | null;
  reply_subject: string;
  reply_body: string;
  confidence: string | null;
  status: 'pending' | 'approved_sent' | 'rejected' | 'expired' | 'send_failed';
  token_expires_at: string;
  created_at: string;
}

export function hashDraftToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/** Tokens are url-safe base64, ~43 chars; reject junk before hashing. */
export function isPlausibleToken(token: unknown): token is string {
  return typeof token === 'string' && /^[A-Za-z0-9_-]{20,128}$/.test(token);
}

export function isDraftExpired(draft: Pick<IsabelDraft, 'token_expires_at'>): boolean {
  const expiresAt = Date.parse(draft.token_expires_at);
  // Fail closed: an unparseable timestamp reads as expired.
  return Number.isNaN(expiresAt) || expiresAt < Date.now();
}
