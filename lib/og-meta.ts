// Helper that builds <meta property="og:image"> URLs for the Medikah
// edge OG renderers. Centralizes the URL shape so the homepage Head,
// /dr/[slug] Head (via ProfileLayout), and any future Práctikah marketing
// page all agree on the routing.

import { nameToSlug } from './slug';

export type OGSurface = 'home' | 'physician' | 'practikah';

export interface OGMetaInput {
  surface: OGSurface;
  locale?: 'en' | 'es';
  physicianName?: string;
  physicianSpecialty?: string;
  practikahTitle?: string;
  practikahSubtitle?: string;
  practikahEyebrow?: string;
}

/**
 * Build the canonical og:image URL for the given surface.
 *
 * @param base e.g. `https://medikah.health` or `process.env.NEXT_PUBLIC_BASE_URL`
 *
 * Examples:
 *   buildOGImageURL('https://medikah.health', { surface: 'home' })
 *     → 'https://medikah.health/api/og/home'
 *   buildOGImageURL('https://medikah.health', { surface: 'home', locale: 'es' })
 *     → 'https://medikah.health/api/og/home?lang=es'
 *   buildOGImageURL('https://medikah.health', {
 *     surface: 'physician',
 *     physicianName: 'Dr. María Núñez',
 *     physicianSpecialty: 'Cardiology',
 *   })
 *     → 'https://medikah.health/api/og/physician/dr-maria-nunez?name=Dr.%20Mar%C3%ADa%20N%C3%BA%C3%B1ez&specialty=Cardiology'
 */
export function buildOGImageURL(base: string, input: OGMetaInput): string {
  let path: string;
  switch (input.surface) {
    case 'home':
      path = '/api/og/home';
      break;
    case 'physician': {
      const slug = input.physicianName ? nameToSlug(input.physicianName) : 'physician';
      path = `/api/og/physician/${encodeURIComponent(slug)}`;
      break;
    }
    case 'practikah':
      path = '/api/og/practikah';
      break;
  }

  const u = new URL(path, base);
  if (input.locale) u.searchParams.set('lang', input.locale);
  if (input.physicianName) u.searchParams.set('name', input.physicianName);
  if (input.physicianSpecialty) u.searchParams.set('specialty', input.physicianSpecialty);
  if (input.practikahTitle) u.searchParams.set('title', input.practikahTitle);
  if (input.practikahSubtitle) u.searchParams.set('subtitle', input.practikahSubtitle);
  if (input.practikahEyebrow) u.searchParams.set('eyebrow', input.practikahEyebrow);
  return u.toString();
}

/**
 * Resolve the canonical site origin. Prefers NEXT_PUBLIC_BASE_URL; falls
 * back to the production origin so build-time / SSR rendering doesn't
 * emit relative og:image URLs (social card crawlers require absolute URLs).
 */
export function ogBaseURL(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || 'https://medikah.health';
}
