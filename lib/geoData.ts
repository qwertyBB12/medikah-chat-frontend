/**
 * Shared geo data for physician-facing inputs (U2/U3 — Aguirre audit).
 *
 * UI scope for launch is US + Mexico ONLY (Aguirre directive). The backend
 * data model stays hemisphere-wide per governance — this is a UI constraint,
 * not a data-model constraint. Add countries here as we expand.
 */

export interface CountryOption {
  code: 'US' | 'MX';
  nameEn: string;
  nameEs: string;
  dialCode: string;
  flag: string;
}

export interface StateOption {
  code: string;
  name: string;
}

export const COUNTRIES: CountryOption[] = [
  { code: 'US', nameEn: 'United States', nameEs: 'Estados Unidos', dialCode: '+1', flag: '🇺🇸' },
  { code: 'MX', nameEn: 'Mexico', nameEs: 'México', dialCode: '+52', flag: '🇲🇽' },
];

export const US_STATES: StateOption[] = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' }, { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' },
  { code: 'DC', name: 'District of Columbia' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' }, { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' }, { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' }, { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' }, { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' }, { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' }, { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' }, { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' }, { code: 'PR', name: 'Puerto Rico' },
];

// 31 estados + Ciudad de México (32 federal entities).
export const MX_STATES: StateOption[] = [
  { code: 'AGU', name: 'Aguascalientes' }, { code: 'BCN', name: 'Baja California' },
  { code: 'BCS', name: 'Baja California Sur' }, { code: 'CAM', name: 'Campeche' },
  { code: 'CHP', name: 'Chiapas' }, { code: 'CHH', name: 'Chihuahua' },
  { code: 'CMX', name: 'Ciudad de México' }, { code: 'COA', name: 'Coahuila' },
  { code: 'COL', name: 'Colima' }, { code: 'DUR', name: 'Durango' },
  { code: 'GUA', name: 'Guanajuato' }, { code: 'GRO', name: 'Guerrero' },
  { code: 'HID', name: 'Hidalgo' }, { code: 'JAL', name: 'Jalisco' },
  { code: 'MEX', name: 'Estado de México' }, { code: 'MIC', name: 'Michoacán' },
  { code: 'MOR', name: 'Morelos' }, { code: 'NAY', name: 'Nayarit' },
  { code: 'NLE', name: 'Nuevo León' }, { code: 'OAX', name: 'Oaxaca' },
  { code: 'PUE', name: 'Puebla' }, { code: 'QUE', name: 'Querétaro' },
  { code: 'ROO', name: 'Quintana Roo' }, { code: 'SLP', name: 'San Luis Potosí' },
  { code: 'SIN', name: 'Sinaloa' }, { code: 'SON', name: 'Sonora' },
  { code: 'TAB', name: 'Tabasco' }, { code: 'TAM', name: 'Tamaulipas' },
  { code: 'TLA', name: 'Tlaxcala' }, { code: 'VER', name: 'Veracruz' },
  { code: 'YUC', name: 'Yucatán' }, { code: 'ZAC', name: 'Zacatecas' },
];

/** States for a given country code (by name). Empty for unknown countries. */
export function statesForCountry(country?: string | null): StateOption[] {
  const c = (country || '').trim().toUpperCase();
  if (c === 'US' || c === 'UNITED STATES' || c === 'USA' || c === 'EE.UU.') return US_STATES;
  if (c === 'MX' || c === 'MEXICO' || c === 'MÉXICO') return MX_STATES;
  return [];
}

/**
 * Format a raw national number for display.
 * US (+1): (XXX) XXX-XXXX. MX (+52): (XX) XXXX-XXXX. Falls back to grouped digits.
 */
export function formatPhoneNational(dialCode: string, raw: string): string {
  const digits = (raw || '').replace(/\D/g, '');
  if (dialCode === '+1' && digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (dialCode === '+52' && digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return digits;
}

/** Compose the stored phone string from a dial code + raw national digits. */
export function composePhone(dialCode: string, raw: string): string {
  const digits = (raw || '').replace(/\D/g, '');
  if (!digits) return '';
  return `${dialCode} ${formatPhoneNational(dialCode, digits)}`.trim();
}

/**
 * Split a stored phone string back into { dialCode, national }.
 * Recognizes a leading +1 / +52; defaults to +1 when ambiguous.
 */
export function parsePhone(stored?: string | null): { dialCode: string; national: string } {
  const s = (stored || '').trim();
  if (s.startsWith('+52')) return { dialCode: '+52', national: s.slice(3).replace(/\D/g, '') };
  if (s.startsWith('+1')) return { dialCode: '+1', national: s.slice(2).replace(/\D/g, '') };
  // No recognizable prefix — treat all digits as national under default +1.
  return { dialCode: '+1', national: s.replace(/\D/g, '') };
}
