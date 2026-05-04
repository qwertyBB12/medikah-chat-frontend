/**
 * Phase 13 Plan 13-04: Deterministic rule-based domain-suggestion engine.
 *
 * Per D-19: deterministic rules — NO LLM at search time. Country-weighted TLD
 * pairing per D-19 (.mx/.com.mx for MX physicians; .com/.org/.net for US).
 * `.health` is excluded by D-04 (Cloudflare Registrar doesn't carry it and we
 * ship no fallback registrar in Phase 13). Pre-launch, an LLM CAN generate the
 * rule set; rules ship as static config to avoid per-search LLM cost, latency,
 * and non-determinism.
 *
 * Per PRO-14 / D-21: defensive-registration suggestions surface inline as a
 * secondary list during search, with one-click reserve at standard Pro pricing
 * per added domain.
 *
 * Per CLAUDE.md: every user-facing string in the consuming UI is bilingual
 * EN/ES. This module emits stable `reason` keys; the UI maps them via
 * `lib/practikahWorkspaceContent.ts` (`upgrade.search.rules.*`).
 */

export type SuggestionCountry = 'MX' | 'US';

export type SuggestionInput = {
  firstName: string;
  lastName: string;
  /** Latin convention — paternal apellido + maternal apellido */
  secondLastName?: string;
  /** Optional clinic / consultorio name */
  clinicName?: string;
  country: SuggestionCountry;
  /** User-typed override — slugified before use */
  freeform?: string;
};

export type Suggestion = {
  /** e.g., "dr-lopez.mx" */
  domain: string;
  tldClass: 'standard' | 'premium';
  /** e.g., "mx", "com", "doctor" */
  tld: string;
  /** Sort key — higher = top of list */
  priority: number;
  category: 'primary' | 'defensive';
  /** Stable copy key — UI maps via `practikahWorkspaceContent.upgrade.search.rules.*` */
  reason: string;
};

/**
 * Country-weighted TLD list per D-19. `.health` excluded by D-04 (no fallback
 * registrar in Phase 13). LATAM ccTLDs other than `.mx` excluded by D-23
 * (Mexico-only at launch).
 */
const TLD_WEIGHTS: Record<SuggestionCountry, { standard: string[]; premium: string[] }> = {
  MX: { standard: ['mx', 'com.mx', 'com', 'org', 'net'], premium: ['doctor', 'clinic'] },
  US: { standard: ['com', 'org', 'net'], premium: ['doctor', 'clinic'] },
};

/**
 * Strip diacritics + lowercase + slugify ASCII. Mirrors the helper in
 * `components/physician/workspace/wizard/LocalPartPicker.tsx` so a single
 * convention applies to both mailbox local-parts and domain stems.
 */
export function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

type Stem = { stem: string; reason: string };

function buildStems(input: SuggestionInput): Stem[] {
  const last = slugify(input.lastName);
  const first = slugify(input.firstName);
  const second = input.secondLastName ? slugify(input.secondLastName) : '';
  const clinic = input.clinicName ? slugify(input.clinicName) : '';
  const freeform = input.freeform ? slugify(input.freeform) : '';

  const stems: Stem[] = [];
  if (last) {
    stems.push({ stem: `dr-${last}`, reason: 'dr_lastname' });
    stems.push({ stem: `dra-${last}`, reason: 'dra_lastname' });
    stems.push({ stem: `${last}-md`, reason: 'lastname_md' });
    stems.push({ stem: `consultorio-${last}`, reason: 'consultorio_lastname' });
  }
  if (first && last) {
    stems.push({ stem: `${first}-${last}`, reason: 'first_last' });
  }
  if (last && second) {
    stems.push({ stem: `${last}-${second}`, reason: 'paternal_maternal' });
  }
  if (clinic) {
    stems.push({ stem: clinic, reason: 'clinic_name' });
  }
  if (freeform) {
    stems.push({ stem: freeform, reason: 'freeform' });
  }

  // De-duplicate by stem (clinic/freeform may collide with derived stems).
  const seen = new Set<string>();
  const out: Stem[] = [];
  for (const s of stems) {
    if (!s.stem || seen.has(s.stem)) continue;
    seen.add(s.stem);
    out.push(s);
  }
  return out;
}

/**
 * Generate primary domain candidates. Country-weighted standard TLDs first,
 * premium TLDs second. Returns up to 12 — the UI surfaces the top 6 with a
 * "show more" reveal.
 */
export function generateSuggestions(input: SuggestionInput): Suggestion[] {
  const weights = TLD_WEIGHTS[input.country];
  const stems = buildStems(input);
  if (stems.length === 0) return [];

  const out: Suggestion[] = [];
  let priority = 1000;
  for (const tld of weights.standard) {
    for (const { stem, reason } of stems) {
      out.push({
        domain: `${stem}.${tld}`,
        tldClass: 'standard',
        tld,
        priority: priority--,
        category: 'primary',
        reason,
      });
    }
  }
  for (const tld of weights.premium) {
    for (const { stem, reason } of stems) {
      out.push({
        domain: `${stem}.${tld}`,
        tldClass: 'premium',
        tld,
        priority: priority--,
        category: 'primary',
        reason,
      });
    }
  }
  return out.slice(0, 12);
}

/**
 * Defensive-registration suggestions per PRO-14 / D-21. Always returns the
 * `.com` mirror of a primary `.mx` pick (when applicable) plus a couple of
 * common typo / consolidation candidates that won't collide with the primary
 * list.
 */
export function generateDefensiveSuggestions(
  input: SuggestionInput,
  primary: Suggestion[],
): Suggestion[] {
  const taken = new Set(primary.map((s) => s.domain));
  const last = slugify(input.lastName);
  const first = slugify(input.firstName);
  const candidates: Suggestion[] = [];

  // Mirror primary in .com if primary used .mx — defends a Mexican brand from
  // a US-side .com squatter.
  const topPrimary = primary[0];
  if (input.country === 'MX' && topPrimary?.tld === 'mx') {
    candidates.push({
      domain: topPrimary.domain.replace(/\.mx$/, '.com'),
      tldClass: 'standard',
      tld: 'com',
      priority: 100,
      category: 'defensive',
      reason: 'defensive_com_mirror',
    });
  }

  if (last) {
    candidates.push({
      domain: `consultorio-${last}.com`,
      tldClass: 'standard',
      tld: 'com',
      priority: 90,
      category: 'defensive',
      reason: 'defensive_consultorio',
    });
  }
  if (first && last) {
    candidates.push({
      domain: `${first}${last}.com`,
      tldClass: 'standard',
      tld: 'com',
      priority: 80,
      category: 'defensive',
      reason: 'defensive_concat',
    });
  }

  // De-dup against primary + against each other.
  const seen = new Set<string>();
  const out: Suggestion[] = [];
  for (const c of candidates) {
    if (taken.has(c.domain) || seen.has(c.domain)) continue;
    seen.add(c.domain);
    out.push(c);
  }
  return out.slice(0, 4);
}

/**
 * Stable list of `reason` keys emitted by this module — useful for content
 * authors validating that `practikahWorkspaceContent.upgrade.search.rules.*`
 * covers every possible badge.
 */
export const SUGGESTION_REASON_KEYS = [
  'dr_lastname',
  'dra_lastname',
  'lastname_md',
  'consultorio_lastname',
  'first_last',
  'paternal_maternal',
  'clinic_name',
  'freeform',
  'defensive_com_mirror',
  'defensive_consultorio',
  'defensive_concat',
] as const;

export type SuggestionReasonKey = (typeof SUGGESTION_REASON_KEYS)[number];
