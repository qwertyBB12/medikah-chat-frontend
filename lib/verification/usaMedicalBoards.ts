/**
 * USA State Medical Board Verification
 *
 * Verifies US medical licenses through state medical board APIs/databases.
 * Each state has its own medical board with varying levels of API access.
 *
 * Key resources:
 * - FSMB (Federation of State Medical Boards): https://www.fsmb.org/
 * - DocInfo: https://www.docinfo.org/ (aggregated lookup)
 * - Individual state board websites
 *
 * Note: Most state boards don't have public APIs. This implementation:
 * 1. Uses DocInfo/FSMB aggregated lookup when available
 * 2. Falls back to individual state board lookups
 * 3. Queues for manual verification if not found
 */

import {
  StateMedicalBoardResponse,
  VerificationResult,
  VerificationDiscrepancy,
} from './types';

// State medical board URLs and API info
const STATE_MEDICAL_BOARDS: Record<
  string,
  {
    name: string;
    url: string;
    hasApi: boolean;
    apiEndpoint?: string;
  }
> = {
  TX: {
    name: 'Texas Medical Board',
    url: 'https://www.tmb.state.tx.us/page/look-up-a-license',
    hasApi: true,
    apiEndpoint: 'https://profile.tmb.state.tx.us/PublicSearch/Search',
  },
  CA: {
    name: 'Medical Board of California',
    url: 'https://www.mbc.ca.gov/breeze/',
    hasApi: true,
    apiEndpoint: 'https://www.breeze.ca.gov/datamart/mainMenu.do',
  },
  NY: {
    name: 'New York State Office of the Professions',
    url: 'http://www.op.nysed.gov/opsearches.htm',
    hasApi: true,
    apiEndpoint: 'http://www.op.nysed.gov/verification/',
  },
  FL: {
    name: 'Florida Department of Health',
    url: 'https://mqa-internet.doh.state.fl.us/MQASearchServices/Home',
    hasApi: true,
    apiEndpoint: 'https://mqa-internet.doh.state.fl.us/MQASearchServices/HealthCareProviders',
  },
  IL: {
    name: 'Illinois Department of Financial and Professional Regulation',
    url: 'https://online-dfpr.micropact.com/lookup/licenselookup.aspx',
    hasApi: false,
  },
  PA: {
    name: 'Pennsylvania State Board of Medicine',
    url: 'https://www.pals.pa.gov/',
    hasApi: true,
    apiEndpoint: 'https://www.pals.pa.gov/api/Search/SearchForPersonOrFacility',
  },
  OH: {
    name: 'State Medical Board of Ohio',
    url: 'https://elicense.ohio.gov/oh_verifylicense',
    hasApi: false,
  },
  GA: {
    name: 'Georgia Composite Medical Board',
    url: 'https://gcmb.mylicense.com/verification/',
    hasApi: false,
  },
  NC: {
    name: 'North Carolina Medical Board',
    url: 'https://portal.ncmedboard.org/verification/',
    hasApi: true,
    apiEndpoint: 'https://portal.ncmedboard.org/api/verification/',
  },
  MI: {
    name: 'Michigan LARA',
    url: 'https://aca-prod.accela.com/MILARA/GeneralProperty/LicenseeSearch.aspx',
    hasApi: false,
  },
  NJ: {
    name: 'New Jersey Division of Consumer Affairs',
    url: 'https://newjersey.mylicense.com/verification/',
    hasApi: false,
  },
  VA: {
    name: 'Virginia Board of Medicine',
    url: 'https://dhp.virginiainteractive.org/Lookup/Index',
    hasApi: false,
  },
  AZ: {
    name: 'Arizona Medical Board',
    url: 'https://azmd.gov/glsuiteweb/clients/azbom/public/webverificationsearch.aspx',
    hasApi: true,
    apiEndpoint: 'https://azmd.gov/api/verification/',
  },
  MA: {
    name: 'Massachusetts Board of Registration in Medicine',
    url: 'https://checkalicense.hhs.state.ma.us/',
    hasApi: false,
  },
  WA: {
    name: 'Washington Medical Commission',
    url: 'https://fortress.wa.gov/doh/providercredentialsearch/',
    hasApi: true,
    apiEndpoint: 'https://fortress.wa.gov/doh/providercredentialsearch/api/search',
  },
  CO: {
    name: 'Colorado Medical Board',
    url: 'https://apps.colorado.gov/dora/licensing/Lookup/LicenseLookup.aspx',
    hasApi: false,
  },
  TN: {
    name: 'Tennessee Board of Medical Examiners',
    url: 'https://apps.health.tn.gov/Licensure/',
    hasApi: false,
  },
  MD: {
    name: 'Maryland Board of Physicians',
    url: 'https://www.mbp.state.md.us/bpqapp/',
    hasApi: false,
  },
  MN: {
    name: 'Minnesota Board of Medical Practice',
    url: 'https://mn.gov/boards/medical-practice/public-resources/license-lookup/',
    hasApi: false,
  },
  WI: {
    name: 'Wisconsin DSPS',
    url: 'https://licensesearch.wi.gov/',
    hasApi: true,
    apiEndpoint: 'https://licensesearch.wi.gov/api/search',
  },
};

// DocInfo API (FSMB aggregated lookup)
const DOCINFO_URL = 'https://www.docinfo.org';

interface LicenseSearchParams {
  state: string;
  licenseNumber: string;
  lastName?: string; // Optional: for additional validation
}

/**
 * Verify a US state medical license
 */
export async function verifyUSAMedicalLicense(
  params: LicenseSearchParams
): Promise<StateMedicalBoardResponse> {
  const { state, licenseNumber, lastName } = params;

  // Normalize state code
  const stateCode = state.toUpperCase().trim();

  // Validate state
  if (!STATE_MEDICAL_BOARDS[stateCode] && !isValidStateCode(stateCode)) {
    return {
      found: false,
      state: stateCode,
      rawResponse: { error: 'Invalid or unsupported state code' },
    };
  }

  // Clean license number
  const cleanLicense = licenseNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

  try {
    // Attempt 1: Try DocInfo aggregated lookup
    const docInfoResult = await lookupViaDocInfo(stateCode, cleanLicense, lastName);
    if (docInfoResult.found) {
      return docInfoResult;
    }

    // Attempt 2: Try state-specific API if available
    const boardInfo = STATE_MEDICAL_BOARDS[stateCode];
    if (boardInfo?.hasApi && boardInfo.apiEndpoint) {
      const stateResult = await lookupViaStateBoard(stateCode, cleanLicense, lastName);
      if (stateResult.found) {
        return stateResult;
      }
    }

    // Not found
    return {
      found: false,
      licenseNumber: cleanLicense,
      state: stateCode,
      rawResponse: {
        searched: true,
        sources: ['docinfo', boardInfo?.hasApi ? 'state_board' : null].filter(Boolean),
        boardUrl: boardInfo?.url,
      },
    };
  } catch (error) {
    console.error('USA medical license verification error:', error);
    return {
      found: false,
      licenseNumber: cleanLicense,
      state: stateCode,
      rawResponse: { error: error instanceof Error ? error.message : 'Unknown error' },
    };
  }
}

/**
 * Lookup via DocInfo (FSMB aggregated database)
 */
async function lookupViaDocInfo(
  state: string,
  licenseNumber: string,
  lastName?: string
): Promise<StateMedicalBoardResponse> {
  try {
    // DocInfo uses a search form, we'd need to POST to their API
    // This is a simplified implementation - real integration would need their API access
    const searchParams = new URLSearchParams({
      state,
      license: licenseNumber,
      ...(lastName && { lastName }),
    });

    const response = await fetch(`${DOCINFO_URL}/api/search?${searchParams}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Medikah-Verification/1.0',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return { found: false };
    }

    const data = await response.json();

    if (data && data.physician) {
      return {
        found: true,
        licenseNumber: data.physician.licenseNumber,
        licenseeFullName: data.physician.fullName,
        licenseType: data.physician.licenseType,
        licenseStatus: data.physician.status,
        issueDate: data.physician.issueDate,
        expirationDate: data.physician.expirationDate,
        specialty: data.physician.specialty,
        state,
        rawResponse: data,
      };
    }

    return { found: false, rawResponse: data };
  } catch {
    // Network error - don't fail completely
    return { found: false };
  }
}

/**
 * Lookup via state-specific medical board
 */
async function lookupViaStateBoard(
  state: string,
  licenseNumber: string,
  lastName?: string
): Promise<StateMedicalBoardResponse> {
  // State-specific implementations
  switch (state) {
    case 'TX':
      return lookupTexasLicense(licenseNumber, lastName);
    case 'CA':
      return lookupCaliforniaLicense(licenseNumber, lastName);
    case 'NY':
      return lookupNewYorkLicense(licenseNumber, lastName);
    case 'FL':
      return lookupFloridaLicense(licenseNumber, lastName);
    default:
      // For states without specific implementation, return not found
      return { found: false, state };
  }
}

/**
 * Texas Medical Board lookup
 */
async function lookupTexasLicense(
  licenseNumber: string,
  lastName?: string
): Promise<StateMedicalBoardResponse> {
  try {
    const boardInfo = STATE_MEDICAL_BOARDS.TX;
    const response = await fetch(boardInfo.apiEndpoint!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        LicenseNumber: licenseNumber,
        LastName: lastName || '',
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return { found: false, state: 'TX' };
    }

    const data = await response.json();

    if (data.Results && data.Results.length > 0) {
      const result = data.Results[0];
      return {
        found: true,
        licenseNumber: result.LicenseNumber,
        licenseeFullName: `${result.FirstName} ${result.LastName}`,
        licenseType: result.LicenseType,
        licenseStatus: result.Status,
        expirationDate: result.ExpirationDate,
        state: 'TX',
        rawResponse: result,
      };
    }

    return { found: false, state: 'TX', rawResponse: data };
  } catch {
    return { found: false, state: 'TX' };
  }
}

/**
 * California Medical Board lookup (Breeze system)
 */
async function lookupCaliforniaLicense(
  licenseNumber: string,
  _lastName?: string
): Promise<StateMedicalBoardResponse> {
  try {
    // California uses the Breeze system
    const response = await fetch(
      `https://search.dca.ca.gov/results?license_number=${licenseNumber}&board=16`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      return { found: false, state: 'CA' };
    }

    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      return {
        found: true,
        licenseNumber: result.license_number,
        licenseeFullName: result.name,
        licenseType: result.license_type,
        licenseStatus: result.status,
        expirationDate: result.expiration_date,
        state: 'CA',
        rawResponse: result,
      };
    }

    return { found: false, state: 'CA', rawResponse: data };
  } catch {
    return { found: false, state: 'CA' };
  }
}

/**
 * New York State lookup
 */
async function lookupNewYorkLicense(
  licenseNumber: string,
  _lastName?: string
): Promise<StateMedicalBoardResponse> {
  try {
    const response = await fetch(
      `http://www.op.nysed.gov/verification/search?lic=${licenseNumber}&prof=60`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      return { found: false, state: 'NY' };
    }

    const data = await response.json();

    if (data && data.licensee) {
      return {
        found: true,
        licenseNumber: data.licensee.licenseNumber,
        licenseeFullName: data.licensee.name,
        licenseType: data.licensee.profession,
        licenseStatus: data.licensee.status,
        state: 'NY',
        rawResponse: data,
      };
    }

    return { found: false, state: 'NY', rawResponse: data };
  } catch {
    return { found: false, state: 'NY' };
  }
}

/**
 * Florida Department of Health lookup
 */
async function lookupFloridaLicense(
  licenseNumber: string,
  _lastName?: string
): Promise<StateMedicalBoardResponse> {
  try {
    const boardInfo = STATE_MEDICAL_BOARDS.FL;
    const response = await fetch(
      `${boardInfo.apiEndpoint}?LicenseNumber=${licenseNumber}&Profession=MD`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      return { found: false, state: 'FL' };
    }

    const data = await response.json();

    if (data.providers && data.providers.length > 0) {
      const result = data.providers[0];
      return {
        found: true,
        licenseNumber: result.licenseNumber,
        licenseeFullName: result.fullName,
        licenseType: result.profession,
        licenseStatus: result.status,
        expirationDate: result.expirationDate,
        state: 'FL',
        rawResponse: result,
      };
    }

    return { found: false, state: 'FL', rawResponse: data };
  } catch {
    return { found: false, state: 'FL' };
  }
}

/**
 * Validate state code
 */
function isValidStateCode(code: string): boolean {
  const validStates = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
    'DC', 'PR', 'VI', 'GU',
  ];
  return validStates.includes(code);
}

/**
 * Compare submitted data with state board response
 */
export function compareStateBoardData(
  submitted: {
    fullName: string;
    specialty?: string;
  },
  response: StateMedicalBoardResponse
): { matches: boolean; confidence: number; discrepancies: VerificationDiscrepancy[] } {
  const discrepancies: VerificationDiscrepancy[] = [];
  let matchScore = 0;
  let totalChecks = 0;

  // Name comparison
  if (response.licenseeFullName) {
    totalChecks++;
    const nameSimilarity = calculateNameSimilarity(
      submitted.fullName,
      response.licenseeFullName
    );

    if (nameSimilarity > 0.8) {
      matchScore++;
    } else if (nameSimilarity < 0.5) {
      discrepancies.push({
        field: 'fullName',
        submitted: submitted.fullName,
        found: response.licenseeFullName,
        severity: nameSimilarity < 0.3 ? 'high' : 'medium',
      });
    }
  }

  // License status check
  if (response.licenseStatus) {
    totalChecks++;
    const activeStatuses = ['active', 'clear', 'current', 'valid'];
    const isActive = activeStatuses.some(s =>
      response.licenseStatus?.toLowerCase().includes(s)
    );

    if (isActive) {
      matchScore++;
    } else {
      discrepancies.push({
        field: 'licenseStatus',
        submitted: 'active (expected)',
        found: response.licenseStatus,
        severity: 'high',
      });
    }
  }

  const confidence = totalChecks > 0 ? matchScore / totalChecks : 0;
  const matches = confidence >= 0.7 && discrepancies.filter(d => d.severity === 'high').length === 0;

  return { matches, confidence, discrepancies };
}

/**
 * Build verification result for USA license
 */
export function buildUSAVerificationResult(
  physicianId: string,
  licenseIndex: number,
  state: string,
  licenseNumber: string,
  response: StateMedicalBoardResponse,
  comparisonResult?: { matches: boolean; confidence: number; discrepancies: VerificationDiscrepancy[] }
): VerificationResult {
  const status = response.found
    ? comparisonResult?.matches
      ? 'verified'
      : comparisonResult
      ? 'manual_review'
      : 'verified'
    : 'manual_review';

  return {
    physicianId,
    verificationType: 'license_usa',
    credentialReference: {
      licenseIndex,
      country: 'USA',
      countryCode: 'US',
      state,
      number: licenseNumber,
    },
    status,
    verificationMethod: 'state_medical_board',
    externalData: response.rawResponse,
    matchConfidence: comparisonResult?.confidence,
    discrepancies: comparisonResult?.discrepancies,
    verifiedAt: status === 'verified' ? new Date().toISOString() : undefined,
    verifiedBy: status === 'verified' ? 'system' : undefined,
    notes: response.found
      ? `License found: ${response.licenseStatus || 'status unknown'}. Name: ${response.licenseeFullName || 'N/A'}`
      : `License not found in ${state} medical board - queued for manual verification`,
  };
}

/**
 * Calculate name similarity
 */
function calculateNameSimilarity(name1: string, name2: string): number {
  const normalize = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z\s]/g, '')
      .split(/\s+/)
      .filter(Boolean)
      .sort()
      .join(' ');

  const n1 = normalize(name1);
  const n2 = normalize(name2);

  if (n1 === n2) return 1;

  // Check if all parts of one name are in the other
  const parts1 = n1.split(' ');
  const parts2 = n2.split(' ');

  const matching = parts1.filter(p => parts2.includes(p)).length;
  const total = Math.max(parts1.length, parts2.length);

  return matching / total;
}

/**
 * Get manual verification URL for a state
 */
export function getStateBoardUrl(state: string): string | null {
  const boardInfo = STATE_MEDICAL_BOARDS[state.toUpperCase()];
  return boardInfo?.url || null;
}
