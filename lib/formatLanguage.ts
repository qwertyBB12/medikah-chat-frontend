/**
 * Map ISO language codes to human-readable names, locale-aware. Physician
 * records store languages as codes (e.g. ['es','en']); the public profile must
 * not render the raw codes. Unknown values pass through unchanged so existing
 * full-name data ('Spanish') still renders.
 */
const NAMES: Record<string, { en: string; es: string }> = {
  en: { en: 'English', es: 'Inglés' },
  es: { en: 'Spanish', es: 'Español' },
  pt: { en: 'Portuguese', es: 'Portugués' },
  fr: { en: 'French', es: 'Francés' },
  de: { en: 'German', es: 'Alemán' },
  it: { en: 'Italian', es: 'Italiano' },
};

export function languageLabel(code: string, isEs: boolean): string {
  const c = (code || '').trim().toLowerCase();
  const n = NAMES[c];
  if (!n) return code; // unknown / already a full name -> show as-is
  return isEs ? n.es : n.en;
}

export function formatLanguages(
  codes: string[] | undefined,
  isEs: boolean,
  sep = ' · '
): string {
  return (codes || []).map((c) => languageLabel(c, isEs)).join(sep);
}
