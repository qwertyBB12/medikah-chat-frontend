/**
 * practikahJsonLd.ts
 *
 * JSON-LD and OpenGraph meta helpers for Try Pro sites at <slug>.medikah.health.
 *
 * WEB-13: Builds Physician + MedicalBusiness schema.org structured data and
 *         OpenGraph/Twitter card meta for SSR injection in ThemedShell.
 *
 * Threat notes:
 *  - T-12-06-02: Physician fields are read-only here (write-locked to verified
 *    physicians via existing dashboard auth).
 *  - T-12-06-03: bio truncated to 280 chars for JSON-LD (guard against PHI in bio).
 *    Physician is responsible for own bio content per D-15 (PROJECT.md).
 */

import type { PracikahTheme } from './practikahTheme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PhysicianJsonLdInput {
  slug: string;
  fullName: string;
  photoUrl: string | null | undefined;
  primarySpecialty: string | null | undefined;
  subSpecialties?: string[];
  languages?: string[];
  timezone?: string | null;
  country?: string | null;
  primaryState?: string | null;
  licensedStates?: string[] | null;
  bio?: string | null;
  boardCertifications?: { board: string; certification: string; year?: number }[];
  education?: Record<string, unknown>[];
  npi?: string | null;
  cedula?: string | null;
}

export interface OpenGraphMeta {
  title: string;
  description: string;
  url: string;
  ogImage: string;
  locale: 'en' | 'es';
}

// ---------------------------------------------------------------------------
// buildPhysicianJsonLd — WEB-13 Physician schema
// ---------------------------------------------------------------------------

/**
 * Build schema.org/Physician JSON-LD for a Try Pro site.
 *
 * Shape: merged Person + MedicalBusiness as recommended by Google's Structured Data guidelines.
 * URL: https://schema.org/Physician
 */
export function buildPhysicianJsonLd(
  input: PhysicianJsonLdInput,
  locale: 'en' | 'es' = 'en',
): Record<string, unknown> {
  const url = `https://${input.slug}.medikah.health`;

  // T-12-06-03: bio truncated to 280 chars — limits potential PHI exposure in indexed JSON-LD
  const fullDescription = input.bio
    ? input.bio.slice(0, 280)
    : locale === 'es'
      ? `Médico${input.primarySpecialty ? ` especialista en ${input.primarySpecialty}` : ''}.`
      : `${input.primarySpecialty || 'Physician'}.`;

  const identifiers: Record<string, unknown>[] = [];
  if (input.npi) {
    identifiers.push({ '@type': 'PropertyValue', propertyID: 'NPI', value: input.npi });
  }
  if (input.cedula) {
    identifiers.push({
      '@type': 'PropertyValue',
      propertyID: 'CedulaProfesional',
      value: input.cedula,
    });
  }

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Physician',
    name: `Dr. ${input.fullName}`,
    url,
    description: fullDescription,
  };

  if (input.photoUrl) jsonLd['image'] = input.photoUrl;
  if (input.primarySpecialty) jsonLd['medicalSpecialty'] = input.primarySpecialty;
  if (input.languages && input.languages.length > 0) jsonLd['knowsLanguage'] = input.languages;
  if (identifiers.length > 0) jsonLd['identifier'] = identifiers;

  // Address: high-level only — country + region (NO street address, no PHI)
  if (input.country) {
    jsonLd['address'] = {
      '@type': 'PostalAddress',
      addressCountry: input.country,
      ...(input.primaryState ? { addressRegion: input.primaryState } : {}),
    };
  }

  // Board certifications → hasCredential
  if (input.boardCertifications && input.boardCertifications.length > 0) {
    jsonLd['hasCredential'] = input.boardCertifications.map((cert) => ({
      '@type': 'EducationalOccupationalCredential',
      credentialCategory: 'BoardCertification',
      name: cert.certification || cert.board,
    }));
  }

  // memberOf: always Medikah Physician Network
  jsonLd['memberOf'] = {
    '@type': 'MedicalOrganization',
    name: 'Medikah Physician Network',
    url: 'https://medikah.health',
  };

  return jsonLd;
}

// ---------------------------------------------------------------------------
// buildMedicalBusinessJsonLd — optional secondary schema for Local Business panels
// ---------------------------------------------------------------------------

export function buildMedicalBusinessJsonLd(input: PhysicianJsonLdInput): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'MedicalBusiness',
    name: `Dr. ${input.fullName}${input.primarySpecialty ? ` — ${input.primarySpecialty}` : ''}`,
    url: `https://${input.slug}.medikah.health`,
  };
  if (input.photoUrl) schema['image'] = input.photoUrl;
  if (input.country) {
    schema['address'] = {
      '@type': 'PostalAddress',
      addressCountry: input.country,
      ...(input.primaryState ? { addressRegion: input.primaryState } : {}),
    };
  }
  return schema;
}

// ---------------------------------------------------------------------------
// buildOpenGraphMeta — OG + Twitter card meta for ThemedShell <Head>
// ---------------------------------------------------------------------------

/**
 * Build OpenGraph + Twitter card meta values for ThemedShell.
 *
 * ogImage:
 *  - Uses physician photo if available (already public).
 *  - Falls back to a dynamic OG card URL at /api/og?slug=... (T-12-06-07 accept —
 *    that route is not yet built; the fallback is handled gracefully by Twitter/Slack
 *    as a missing image, which is acceptable for Phase 12).
 */
export function buildOpenGraphMeta(
  input: PhysicianJsonLdInput,
  _theme: PracikahTheme,
  locale: 'en' | 'es',
): OpenGraphMeta {
  const title = `Dr. ${input.fullName}${input.primarySpecialty ? ` — ${input.primarySpecialty}` : ''}`;
  const description =
    (input.bio?.slice(0, 160)) ||
    (locale === 'es'
      ? `Conoce al Dr. ${input.fullName}, médico${input.primarySpecialty ? ` especialista en ${input.primarySpecialty}` : ''}.`
      : `Meet Dr. ${input.fullName}, ${input.primarySpecialty || 'physician'}.`);
  const url = `https://${input.slug}.medikah.health`;
  // T-12-06-07: OG image uses photo_url if available; /api/og route deferred
  const ogImage = input.photoUrl || `https://medikah.health/api/og?slug=${input.slug}`;
  return { title, description, url, ogImage, locale };
}
