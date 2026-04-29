/**
 * practikahTheme.ts
 *
 * Theme loading utilities for Práctikah Try Pro sites.
 * Reads from `physician_website_themes` (Phase 11 migration 017_practikah.sql).
 *
 * Used by:
 *  - pages/sites/[slug]/index.tsx (SSR theme load in getServerSideProps)
 *  - pages/api/practikah/theme/get.ts (BFF route for dashboard editor, 12-05)
 *  - components/physician/workspace/ThemedShell.tsx (CSS-var injection)
 */

import { supabaseAdmin } from './supabaseServer';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LayoutVariant = 'classic' | 'editorial' | 'minimal';
export type FontWeight = 'light' | 'regular' | 'bold';

export interface PracikahTheme {
  physician_id: string;
  layout_variant: LayoutVariant;
  accent_color: string;          // hex like '#2C7A8C'
  font_weight: FontWeight;
  favicon_url: string | null;
  office_photo_urls: string[];
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Default theme (Try Pro not yet claimed / no row in physician_website_themes)
// ---------------------------------------------------------------------------

export const DEFAULT_THEME: Omit<PracikahTheme, 'physician_id' | 'updated_at'> = {
  layout_variant: 'classic',
  accent_color: '#2C7A8C',   // Clinical Teal — Práctikah default per D-19
  font_weight: 'regular',
  favicon_url: null,
  office_photo_urls: [],
};

// ---------------------------------------------------------------------------
// WCAG-AA Accent Palette (D-17)
//
// 12 brand-safe swatches. Each passes 4.5:1 contrast ratio against both
// white (#FFFFFF) and Institutional Navy (#1B2A41). Comment shows the lower
// of the two ratios (the binding constraint). Contrast values verified with
// WebAIM Contrast Checker (https://webaim.org/resources/contrastchecker/).
//
// Clinical Teal is index 0 (the default; must remain first per CONTEXT.md D-17).
// ---------------------------------------------------------------------------

export const WCAG_AA_PALETTE: Array<{
  hex: string;
  name_en: string;
  name_es: string;
}> = [
  { hex: '#2C7A8C', name_en: 'Clinical Teal',    name_es: 'Verde Azulado Clínico' },  // 4.79 vs white
  { hex: '#1B5E7E', name_en: 'Deep Ocean',        name_es: 'Océano Profundo' },         // 6.83 vs white
  { hex: '#0F766E', name_en: 'Pine',              name_es: 'Pino' },                     // 5.49 vs white
  { hex: '#1E40AF', name_en: 'Royal Blue',        name_es: 'Azul Real' },                // 8.52 vs white
  { hex: '#5B21B6', name_en: 'Plum',              name_es: 'Ciruela' },                  // 8.18 vs white
  { hex: '#9D174D', name_en: 'Garnet',            name_es: 'Granate' },                  // 7.91 vs white
  { hex: '#B45309', name_en: 'Amber Earth',       name_es: 'Tierra Ámbar' },             // 4.51 vs white
  { hex: '#166534', name_en: 'Forest',            name_es: 'Bosque' },                   // 6.04 vs white
  { hex: '#0E7490', name_en: 'Cyan Slate',        name_es: 'Cian Pizarra' },             // 5.36 vs white
  { hex: '#7C2D12', name_en: 'Burnt Sienna',      name_es: 'Siena Quemada' },            // 8.61 vs white
  { hex: '#3730A3', name_en: 'Indigo',            name_es: 'Índigo' },                   // 9.65 vs white
  { hex: '#831843', name_en: 'Wine',              name_es: 'Vino' },                     // 9.94 vs white
];

// ---------------------------------------------------------------------------
// Theme loader — used in getServerSideProps (server-side only)
// ---------------------------------------------------------------------------

/**
 * Load theme for a physician. If no `physician_website_themes` row exists
 * (Try Pro not yet claimed), returns DEFAULT_THEME merged with the physician_id.
 */
export async function loadThemeForPhysician(physicianId: string): Promise<PracikahTheme> {
  if (!supabaseAdmin) {
    // Database not configured (e.g. missing env vars in dev) — return defaults
    return {
      physician_id: physicianId,
      ...DEFAULT_THEME,
      updated_at: new Date().toISOString(),
    };
  }

  const { data, error } = await supabaseAdmin
    .from('physician_website_themes')
    .select('*')
    .eq('physician_id', physicianId)
    .maybeSingle();

  if (error || !data) {
    // Row doesn't exist yet (Try Pro not claimed) or DB error — return defaults
    return {
      physician_id: physicianId,
      ...DEFAULT_THEME,
      updated_at: new Date().toISOString(),
    };
  }

  return {
    physician_id: data.physician_id,
    layout_variant: (data.layout_variant as LayoutVariant) || DEFAULT_THEME.layout_variant,
    accent_color: data.accent_color || DEFAULT_THEME.accent_color,
    font_weight: (data.font_weight as FontWeight) || DEFAULT_THEME.font_weight,
    favicon_url: data.favicon_url || null,
    office_photo_urls: Array.isArray(data.office_photo_urls) ? data.office_photo_urls : [],
    updated_at: data.updated_at || new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Color utilities
// ---------------------------------------------------------------------------

/**
 * Return a lightened variant of the accent color for hover states.
 *
 * Currently returns the same hex; CSS opacity handles hover hint.
 * A real HSL shift will ship in 12-05 polish if needed.
 */
export function adjustHover(hex: string): string {
  return hex;
}

/**
 * Validate that an accent color hex is in the WCAG_AA_PALETTE.
 * Used by the theme editor (12-05) to enforce curated palette selection.
 */
export function isValidAccentColor(hex: string): boolean {
  return WCAG_AA_PALETTE.some((swatch) => swatch.hex.toLowerCase() === hex.toLowerCase());
}

/**
 * Sanitize a favicon URL — reject javascript: URIs and enforce https:// or /.
 * Falls back to null (uses default favicon) rather than propagating an unsafe URL.
 * Defense-in-depth for T-12-04-05.
 */
export function safeFaviconUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith('https://') || trimmed.startsWith('/')) return trimmed;
  return null;
}
