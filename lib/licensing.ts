/**
 * Pure helpers for physician country_of_practice membership.
 *
 * Annotation 1 (Aguirre): the licensing selector is multi-select — a physician
 * may be licensed in the US, Mexico, or both. "Both" is no longer a distinct
 * state; it is simply both codes present. Canonical order is US then MX.
 */
export type CountryCode = 'US' | 'MX';

const CANONICAL_ORDER: CountryCode[] = ['US', 'MX'];

export function toggleCountry(current: string[], code: CountryCode): string[] {
  const has = current.includes(code);
  const next = has ? current.filter((c) => c !== code) : [...current, code];
  return CANONICAL_ORDER.filter((c) => next.includes(c));
}
