/**
 * Cédula verification name matcher.
 *
 * Compares the name on the official SEP "Constancia de Situación Profesional"
 * against the doctor's Medikah profile name and returns a human-reviewable
 * verdict. This NEVER auto-approves — it only recommends; an admin commits.
 *
 * Token-set comparison (order-independent) tolerant of Mexican naming:
 *  - accents and case are normalized away
 *  - nombre(s) + paterno + materno may appear in any order
 *  - the profile may omit the segundo apellido (a subset of the official name)
 * while still flagging a genuinely different surname as `partial` for review.
 */

export type NameMatchVerdict = 'match' | 'partial' | 'mismatch';

export interface NameMatchResult {
  verdict: NameMatchVerdict;
  /** 0..1 overlap of name tokens (rounded to 2 decimals). */
  score: number;
}

// Spanish connectors that carry no identifying signal in a name.
const PARTICLES = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e', 'da', 'do']);

function nameTokens(name: string): Set<string> {
  return new Set(
    (name || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // strip diacritics
      .toLowerCase()
      .replace(/[^a-z\s]/g, ' ') // letters + whitespace only
      .split(/\s+/)
      .filter((t) => t.length >= 2 && !PARTICLES.has(t)),
  );
}

export function matchCedulaName(extractedName: string, profileName: string): NameMatchResult {
  const a = nameTokens(extractedName);
  const b = nameTokens(profileName);
  if (a.size === 0 || b.size === 0) return { verdict: 'mismatch', score: 0 };

  let common = 0;
  for (const t of a) if (b.has(t)) common++;

  const overlap = common / Math.max(a.size, b.size);
  const coverage = common / Math.min(a.size, b.size);
  const score = Math.round(overlap * 100) / 100;

  let verdict: NameMatchVerdict;
  if (common >= 2 && coverage === 1) {
    // Every token of the shorter name appears in the other (≥2 shared tokens) —
    // e.g. profile omits the materno, or pure word-order/accent differences.
    verdict = 'match';
  } else if (overlap >= 0.5) {
    verdict = 'partial';
  } else {
    verdict = 'mismatch';
  }
  return { verdict, score };
}
