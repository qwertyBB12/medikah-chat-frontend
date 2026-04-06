/** NPI Registry lookup via NPPES API (free, no API key required) */

const NPI_API_BASE = 'https://npiregistry.cms.hhs.gov/api/';
const NPI_API_VERSION = '2.1';

export interface NPILookupResult {
  found: boolean;
  npiNumber?: string;
  fullName?: string; // "FirstName MiddleName LastName"
  credential?: string; // "MD", "DO", etc.
  primarySpecialty?: string; // taxonomy description, e.g., "Internal Medicine"
  taxonomyCode?: string; // e.g., "207R00000X"
  practiceState?: string; // 2-letter state from primary taxonomy
  practiceCity?: string;
  enumerationDate?: string; // when NPI was assigned
  status?: string; // "A" for active
  rawResponse?: Record<string, unknown>;
  error?: string;
}

export async function lookupNPI(npiNumber: string): Promise<NPILookupResult> {
  // 1. Validate format: exactly 10 digits
  if (!/^\d{10}$/.test(npiNumber)) {
    return { found: false, error: 'NPI must be exactly 10 digits' };
  }

  // 2. Validate Luhn check digit (NPI uses Luhn algorithm with prefix 80840)
  // Prepend '80840' to the NPI, then validate Luhn
  if (!validateNPILuhn(npiNumber)) {
    return { found: false, error: 'Invalid NPI check digit' };
  }

  // 3. Call NPPES API
  const url = `${NPI_API_BASE}?version=${NPI_API_VERSION}&number=${npiNumber}`;

  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!response.ok) {
      return { found: false, error: `NPI Registry returned ${response.status}` };
    }

    const data = await response.json();

    if (!data.result_count || data.result_count === 0 || !data.results?.length) {
      return { found: false, error: 'NPI not found in registry' };
    }

    const result = data.results[0];
    const basic = result.basic || {};
    const primaryTaxonomy = (result.taxonomies || []).find((t: { primary: boolean }) => t.primary) || result.taxonomies?.[0];
    const locationAddress = (result.addresses || []).find((a: { address_purpose: string }) => a.address_purpose === 'LOCATION');

    const nameParts = [basic.first_name, basic.middle_name, basic.last_name].filter(Boolean);

    return {
      found: true,
      npiNumber,
      fullName: nameParts.join(' '),
      credential: basic.credential,
      primarySpecialty: primaryTaxonomy?.desc,
      taxonomyCode: primaryTaxonomy?.code,
      practiceState: primaryTaxonomy?.state || locationAddress?.state,
      practiceCity: locationAddress?.city,
      enumerationDate: basic.enumeration_date,
      status: basic.status,
      rawResponse: data,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { found: false, error: `NPI lookup failed: ${message}` };
  }
}

function validateNPILuhn(npi: string): boolean {
  // NPI Luhn: prepend '80840', compute Luhn on all 15 digits
  const digits = ('80840' + npi).split('').map(Number);
  let sum = 0;
  let alternate = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits[i];
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}
