/**
 * Medikah Design System — Clinical Institutional Palette
 * Aligned with the BeNeXT ecosystem. Dressed for the hospital, not the embassy.
 *
 * @deprecated Phase 20 introduces lib/design-tokens.ts as the canonical
 * Medikah design-token authority (per D-05 in 20-CONTEXT.md). This file
 * remains for backwards compatibility with already-shipped imports.
 * New code should import from './design-tokens' instead.
 */

export const colors = {
  // Primary
  institutionalBlue: '#1B2A41',
  clinicalTeal: '#2C7A8C',
  steadyTeal: '#E8F4F6',

  // Neutrals
  deepCharcoal: '#1C1C1E',
  bodySlate: '#4A5568',
  archivalGrey: '#8A8D91',
  borderLine: '#D1D5DB',
  clinicalSurface: '#F5F6F8',
  pureWhite: '#FFFFFF',

  // Semantic
  confirmationGreen: '#2D7D5F',
  cautionAmber: '#B8860B',
  alertGarnet: '#B83D3D',
  infoBlue: '#3B82B6',

  // Warm accent (patient intake & chat only)
  linenWarmth: '#F0EAE0',
} as const;
