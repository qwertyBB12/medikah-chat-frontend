/**
 * Wave primitive types — Práctikah workspace signature wave.
 *
 * Variant matrix (per Plan 20-02 + 20-CONTEXT D-03):
 *   darkDesktop  → fill=instBlue (#1B2A41), viewBox 1440x80, h=80
 *   darkMobile   → fill=instBlue (#1B2A41), viewBox 1440x60, h=60
 *   lightDesktop → fill=linen    (#F0EAE0), viewBox 1440x80, h=80
 *   lightMobile  → fill=linen    (#F0EAE0), viewBox 1440x60, h=60
 *
 * Geometry source: mailcow-config/sogo/custom-sogo.js line 4670 (desktop)
 * and line 3199 (mobile). The 40h homepage CurveDivider.tsx is a separate
 * "section divider" pattern and is OUT OF SCOPE here (D-01).
 *
 * Exported for both React consumers (Plan 20-04 dashboard masthead) and
 * the SOGo build target (Plan 20-03 wave.js generator).
 */

export type WaveDevice = 'desktop' | 'mobile';
export type WaveTheme = 'dark' | 'light';
export type WaveVariant = `${WaveTheme}${Capitalize<WaveDevice>}`;
// Resolves to: 'darkDesktop' | 'darkMobile' | 'lightDesktop' | 'lightMobile'

export interface WaveProps {
  variant: WaveVariant;
  className?: string;
}

export const WAVE_VARIANTS: readonly WaveVariant[] = [
  'darkDesktop',
  'darkMobile',
  'lightDesktop',
  'lightMobile',
] as const;
