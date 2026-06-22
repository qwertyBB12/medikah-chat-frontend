export const LOGO_SRC = '/logo.png';           // White mark (dark backgrounds)
export const LOGO_DARK_SRC = '/logo-BLU.png';   // Navy mark (light backgrounds)
export const WORDMARK_SRC = '/medikah_wht.png';  // White wordmark PNG (legacy)

// SVG logo variants (vector, resolution-independent)
export const LOGO_MARK_SVG = '/logo-mark.svg';
export const LOGO_MINIMAL_SVG = '/logo-minimal.svg';
export const LOGO_APP_ICON_SVG = '/logo-app-icon.svg';

/**
 * Cue launcher glyph by rail tone.
 *
 * Shares PhysicianIconRail's `tone` convention, which describes the INK (not the
 * background): tone='dark' = dark ink on a LIGHT surface; tone='light' = light ink
 * on a DARK surface. The rail passes its own `tone` straight through to CueLauncher,
 * so this MUST stay aligned with TONE[] in PhysicianIconRail.tsx.
 *   tone='dark'  → navy mark  (LOGO_DARK_SRC) — visible on light/linen surfaces
 *   tone='light' → white mark (LOGO_SRC)      — visible on dark/navy surfaces
 *
 * (A prior inversion treated `tone` as a background descriptor, painting the glyph
 * white-on-linen and navy-on-navy → invisible on every rail surface.)
 */
export function cueGlyphSrc(tone: 'dark' | 'light'): string {
  return tone === 'dark' ? LOGO_DARK_SRC : LOGO_SRC;
}
