/**
 * Pure mailbox local-part derivation — client-safe (no server/DB imports).
 *
 * Shared by lib/mailcowProvisioner.ts (server saga) and the admin verify UI, so the
 * admin sees the SAME derived default the server would compute. The honorific
 * (Dr/Dra) is always supplied explicitly — never inferred from a name
 * (feedback_dr_dra_title_mexico).
 */

export type PhysicianTitle = 'Dr' | 'Dra';

export const MAILBOX_DOMAIN = 'medikah.health';
export const LOCAL_PART_REGEX = /^[a-z0-9._-]+$/;

/** Reserved local-parts — mirrors RESERVED_LOCAL_PARTS in the backend suggester (T-12-02-01). */
export const RESERVED_LOCAL_PARTS = new Set<string>([
  'admin', 'administrator', 'postmaster', 'webmaster', 'noreply', 'no-reply',
  'support', 'help', 'info', 'mail', 'root', 'abuse', 'security', 'practikah',
  'medikah', 'klinikah', 'hostmaster', 'mailer-daemon', 'welcome', 'contact',
  'sales', 'billing',
]);

const PARTICLES = new Set<string>([
  'de', 'del', 'la', 'las', 'los', 'y', 'e', 'da', 'do', 'van', 'von',
]);

/**
 * Strip diacritics → lowercase → hyphenated ascii slug segment.
 * Mirrors slugify() in the backend local_part_suggester.py.
 *   'López' → 'lopez'   'Núñez García' → 'nunez-garcia'   '' → ''
 */
export function slugifySegment(s: string): string {
  if (!s) return '';
  const ascii = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  return ascii.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/**
 * Derive the default mailbox local-part from a physician's full name + honorific.
 * Scheme: `{dr|dra}-{surname}` (surname = last meaningful token; particles dropped).
 * Returns '' if no usable surname can be derived.
 */
export function deriveLocalPart(fullName: string, title: PhysicianTitle): string {
  const prefix = title === 'Dra' ? 'dra' : 'dr';
  const tokens = (fullName || '')
    .split(/\s+/)
    .map((t) => slugifySegment(t))
    .filter((t) => t.length > 0 && !PARTICLES.has(t));

  if (tokens.length === 0) return '';
  const surname = tokens[tokens.length - 1];
  const candidate = `${prefix}-${surname}`;
  return LOCAL_PART_REGEX.test(candidate) ? candidate : '';
}

/** Validate an admin-supplied or derived local-part against format + reserved list. */
export function isUsableLocalPart(localPart: string): boolean {
  return (
    !!localPart &&
    localPart.length <= 64 &&
    LOCAL_PART_REGEX.test(localPart) &&
    !RESERVED_LOCAL_PARTS.has(localPart)
  );
}
