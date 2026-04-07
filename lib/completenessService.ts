/**
 * Completeness calculation service for Phase 7 (DASH-02, D-02, D-11).
 * Computes weighted credential completeness percentage and missing item nudges.
 * Client-side computation — no API call needed.
 */

import type { CredentialResponse } from './credentialTypes';
import type { MXCredentialResponse } from './mxCredentialTypes';
import type { ContactInfo } from './contactTypes';

export interface MissingItem {
  sectionId: string;      // DOM id for scrollIntoView
  label: string;          // EN label
  labelEs: string;        // ES label
  countryPrefix?: 'us' | 'mx'; // Only for dual-credential doctors
}

export interface CompletenessResult {
  percentage: number;          // 0-100, weighted
  missingItems: MissingItem[];
}

// ─── US weight table (per D-02 and UI-SPEC) ───────────────────────────────

interface WeightEntry {
  weight: number;
  sectionId: string;
  label: string;
  labelEs: string;
}

const US_WEIGHTS: WeightEntry[] = [
  { weight: 25, sectionId: 'us-npi-panel',           label: '🇺🇸 Enter NPI number',           labelEs: '🇺🇸 Ingresar número NPI' },
  { weight: 20, sectionId: 'us-licenses-panel',      label: '🇺🇸 Add state medical license',   labelEs: '🇺🇸 Agregar licencia médica estatal' },
  { weight: 15, sectionId: 'us-boardcerts-panel',    label: '🇺🇸 Add board certification',     labelEs: '🇺🇸 Agregar certificación de junta' },
  { weight: 10, sectionId: 'us-subspecialties-panel', label: '🇺🇸 Add sub-specialty',          labelEs: '🇺🇸 Agregar sub-especialidad' },
  { weight: 10, sectionId: 'us-credential-section',  label: '🇺🇸 Upload credential documents', labelEs: '🇺🇸 Subir documentos de credenciales' },
  { weight: 10, sectionId: 'contact-info-section',   label: 'Add phone number',                labelEs: 'Agregar número de teléfono' },
];
// US weights sum to 90 (documents placeholder always scores 100%), effective total is 90 weighted points.
// To normalize to 100%, we treat documents as always complete and divide scored items by (100 - 10) = 90.

// ─── MX weight table ───────────────────────────────────────────────────────

const MX_WEIGHTS: WeightEntry[] = [
  { weight: 20, sectionId: 'mx-cedula-panel',          label: '🇲🇽 Enter Cédula Profesional',    labelEs: '🇲🇽 Ingresar Cédula Profesional' },
  { weight: 15, sectionId: 'mx-cedula-panel',          label: '🇲🇽 Add Registro Estatal',         labelEs: '🇲🇽 Agregar Registro Estatal' },
  { weight: 15, sectionId: 'mx-consejo-panel',         label: '🇲🇽 Add Consejo certification',    labelEs: '🇲🇽 Agregar certificación de Consejo' },
  { weight: 15, sectionId: 'mx-especialidades-panel',  label: '🇲🇽 Add especialidad',             labelEs: '🇲🇽 Agregar especialidad' },
  { weight: 20, sectionId: 'mx-identity-panel',        label: '🇲🇽 Upload INE document',          labelEs: '🇲🇽 Subir documento INE' },
  { weight: 10, sectionId: 'contact-info-section',     label: 'Add phone number',                 labelEs: 'Agregar número de teléfono' },
  { weight:  5, sectionId: 'mx-identity-panel',        label: '🇲🇽 Enter CURP',                   labelEs: '🇲🇽 Ingresar CURP' },
];
// MX weights sum to 100.

// ─── US scoring helpers ────────────────────────────────────────────────────

function scoreUS(
  credentials: CredentialResponse | null,
  contact: Partial<ContactInfo>
): boolean[] {
  // Returns a boolean array (scored in same order as US_WEIGHTS):
  // [npi, stateLicenses, boardCerts, subSpecialties, documents, contact]
  return [
    !!(credentials?.npi?.npiNumber),
    !!(credentials && credentials.stateLicenses.length > 0 && credentials.stateLicenses.some(l => l.isPrimary)),
    !!(credentials && credentials.boardCertifications.length > 0),
    !!(credentials && credentials.subSpecialties.length > 0),
    true, // documents placeholder — always 100% in Phase 7
    !!(contact.phoneNumber?.trim()),
  ];
}

// ─── MX scoring helpers ────────────────────────────────────────────────────

function scoreMX(
  credentials: MXCredentialResponse | null,
  contact: Partial<ContactInfo>
): boolean[] {
  // Returns a boolean array in same order as MX_WEIGHTS:
  // [cedula, registroEstatal, consejo, especialidades, documents(INE), contact, curp]
  return [
    !!(credentials?.cedulaProfesional),
    !!(credentials?.registroEstatal),
    !!(credentials && credentials.consejos.length > 0),
    !!(credentials && credentials.especialidades.length > 0),
    !!(credentials?.identity.ineFrontUploaded && credentials?.identity.ineBackUploaded),
    !!(contact.phoneNumber?.trim()),
    !!(credentials?.identity.curp?.trim()),
  ];
}

// ─── Main computation functions ───────────────────────────────────────────

export function computeUSCompleteness(
  credentials: CredentialResponse | null,
  contact: Partial<ContactInfo>
): CompletenessResult {
  const scores = scoreUS(credentials, contact);

  let earnedPoints = 0;
  const missing: Array<WeightEntry & { weight: number }> = [];

  US_WEIGHTS.forEach((entry, i) => {
    if (scores[i]) {
      earnedPoints += entry.weight;
    } else {
      missing.push(entry);
    }
  });

  // Total possible = 100 (documents always 10/10, so max earnable = 90 + 10 = 100)
  const percentage = Math.round(earnedPoints);

  // Top 3 missing by weight (already sorted descending in US_WEIGHTS)
  const top3 = missing
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map(entry => ({
      sectionId: entry.sectionId,
      label: entry.label,
      labelEs: entry.labelEs,
    }));

  return { percentage, missingItems: top3 };
}

export function computeMXCompleteness(
  credentials: MXCredentialResponse | null,
  contact: Partial<ContactInfo>
): CompletenessResult {
  const scores = scoreMX(credentials, contact);

  let earnedPoints = 0;
  const missing: Array<WeightEntry & { weight: number }> = [];

  MX_WEIGHTS.forEach((entry, i) => {
    if (scores[i]) {
      earnedPoints += entry.weight;
    } else {
      missing.push(entry);
    }
  });

  const percentage = Math.round(earnedPoints);

  const top3 = missing
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map(entry => ({
      sectionId: entry.sectionId,
      label: entry.label,
      labelEs: entry.labelEs,
    }));

  return { percentage, missingItems: top3 };
}

export function computeCompleteness(
  countryOfPractice: string[],
  usCredentials: CredentialResponse | null,
  mxCredentials: MXCredentialResponse | null,
  contact: Partial<ContactInfo>
): CompletenessResult {
  const hasUS = countryOfPractice.includes('US');
  const hasMX = countryOfPractice.includes('MX');

  // US-only
  if (hasUS && !hasMX) {
    return computeUSCompleteness(usCredentials, contact);
  }

  // MX-only
  if (hasMX && !hasUS) {
    return computeMXCompleteness(mxCredentials, contact);
  }

  // Dual-credential (D-11): 50/50 weighted average
  if (hasUS && hasMX) {
    const usResult = computeUSCompleteness(usCredentials, contact);
    const mxResult = computeMXCompleteness(mxCredentials, contact);

    const percentage = Math.round(usResult.percentage * 0.5 + mxResult.percentage * 0.5);

    // Merge missing items, adding countryPrefix. Deduplicate contact (only list once, no prefix).
    const contactSectionId = 'contact-info-section';
    let contactAdded = false;

    // Interleave US and MX items by weight (take alternating from each list, top 3 total)
    const usMissing = usResult.missingItems.map(item => ({
      ...item,
      countryPrefix: item.sectionId === contactSectionId ? undefined : ('us' as const),
    }));
    const mxMissing = mxResult.missingItems.map(item => ({
      ...item,
      countryPrefix: item.sectionId === contactSectionId ? undefined : ('mx' as const),
    }));

    const merged: MissingItem[] = [];
    const maxLen = Math.max(usMissing.length, mxMissing.length);

    for (let i = 0; i < maxLen && merged.length < 3; i++) {
      if (i < usMissing.length) {
        const item = usMissing[i];
        if (item.sectionId === contactSectionId) {
          if (!contactAdded) {
            merged.push({ sectionId: item.sectionId, label: item.label, labelEs: item.labelEs });
            contactAdded = true;
          }
        } else {
          merged.push(item);
        }
      }
      if (merged.length >= 3) break;
      if (i < mxMissing.length) {
        const item = mxMissing[i];
        if (item.sectionId === contactSectionId) {
          if (!contactAdded) {
            merged.push({ sectionId: item.sectionId, label: item.label, labelEs: item.labelEs });
            contactAdded = true;
          }
        } else {
          merged.push(item);
        }
      }
    }

    return { percentage, missingItems: merged.slice(0, 3) };
  }

  // Legacy: no country set — default to US behavior for backward compatibility
  return computeUSCompleteness(usCredentials, contact);
}
