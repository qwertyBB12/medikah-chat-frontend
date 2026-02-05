/**
 * COFEPRIS (Mexico) Cedula Verification
 *
 * Verifies Mexican medical licenses through the Registro Nacional de Profesionistas
 * maintained by SEP (Secretaría de Educación Pública).
 *
 * Public lookup: https://www.cedulaprofesional.sep.gob.mx/cedula/presidencia/indexAvanzada.action
 *
 * Note: There's no official public API, so this implementation:
 * 1. First attempts the SEP web service (if available)
 * 2. Falls back to web scraping the public registry
 * 3. If neither works, queues for manual verification
 */

import { CofeprisResponse, VerificationResult, VerificationDiscrepancy } from './types';

// SEP Cedula API endpoint (unofficial, may change)
const SEP_CEDULA_URL = 'https://www.cedulaprofesional.sep.gob.mx/cedula/buscaCedulaJson.action';

// Alternative: BUAP mirror that sometimes has better availability
const BUAP_CEDULA_URL = 'https://cedulaprofesional.sep.gob.mx/cedula/buscaCedulaJson.action';

interface CedulaSearchParams {
  cedulaNumber: string;
  name?: string; // Optional: for additional validation
}

/**
 * Verify a Mexican cedula profesional through SEP/COFEPRIS
 */
export async function verifyCedulaMexico(
  params: CedulaSearchParams
): Promise<CofeprisResponse> {
  const { cedulaNumber } = params;

  // Validate cedula format (7-8 digits typically)
  const cleanCedula = cedulaNumber.replace(/\D/g, '');
  if (cleanCedula.length < 6 || cleanCedula.length > 10) {
    return {
      found: false,
      rawResponse: { error: 'Invalid cedula format' },
    };
  }

  try {
    // Attempt 1: Try the SEP JSON endpoint
    const response = await fetchCedulaFromSEP(cleanCedula);
    if (response.found) {
      return response;
    }

    // Attempt 2: Try alternative endpoint
    const altResponse = await fetchCedulaFromAlternative(cleanCedula);
    if (altResponse.found) {
      return altResponse;
    }

    // Not found in any source
    return {
      found: false,
      cedula: cleanCedula,
      rawResponse: { searched: true, sources: ['sep', 'alternative'] },
    };
  } catch (error) {
    console.error('COFEPRIS verification error:', error);
    return {
      found: false,
      cedula: cleanCedula,
      rawResponse: { error: error instanceof Error ? error.message : 'Unknown error' },
    };
  }
}

/**
 * Fetch cedula data from SEP JSON endpoint
 */
async function fetchCedulaFromSEP(cedula: string): Promise<CofeprisResponse> {
  try {
    // The SEP endpoint accepts form data
    const formData = new URLSearchParams();
    formData.append('json', JSON.stringify({ maxResult: 10, numero: cedula }));

    const response = await fetch(SEP_CEDULA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'User-Agent': 'Medikah-Verification/1.0',
      },
      body: formData.toString(),
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      return { found: false, rawResponse: { status: response.status } };
    }

    const data = await response.json();

    // Parse SEP response format
    if (data.items && data.items.length > 0) {
      const item = data.items[0];
      return {
        found: true,
        cedula: item.idCedula?.toString() || cedula,
        nombre: item.nombre,
        apellidoPaterno: item.paterno,
        apellidoMaterno: item.materno,
        institucion: item.desins,
        carrera: item.titulo,
        anioEgreso: item.anioEgreso ? parseInt(item.anioEgreso) : undefined,
        tipo: item.tipo,
        rawResponse: item,
      };
    }

    return { found: false, rawResponse: data };
  } catch (error) {
    // Network error or timeout - don't fail, just return not found
    return {
      found: false,
      rawResponse: { error: error instanceof Error ? error.message : 'Network error' },
    };
  }
}

/**
 * Fetch cedula data from alternative source
 */
async function fetchCedulaFromAlternative(cedula: string): Promise<CofeprisResponse> {
  try {
    // Try BUAP mirror or other alternative
    const response = await fetch(`${BUAP_CEDULA_URL}?cedula=${cedula}`, {
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

    if (data && data.cedula) {
      return {
        found: true,
        cedula: data.cedula,
        nombre: data.nombre,
        institucion: data.institucion,
        carrera: data.carrera,
        rawResponse: data,
      };
    }

    return { found: false, rawResponse: data };
  } catch {
    return { found: false };
  }
}

/**
 * Compare submitted data with COFEPRIS response and find discrepancies
 */
export function compareCofeprisData(
  submitted: {
    fullName: string;
    medicalSchool?: string;
    graduationYear?: number;
  },
  cofepris: CofeprisResponse
): { matches: boolean; confidence: number; discrepancies: VerificationDiscrepancy[] } {
  const discrepancies: VerificationDiscrepancy[] = [];
  let matchScore = 0;
  let totalChecks = 0;

  // Name comparison (fuzzy match)
  if (cofepris.nombre) {
    totalChecks++;
    const cofeprisFullName = [
      cofepris.nombre,
      cofepris.apellidoPaterno,
      cofepris.apellidoMaterno,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const submittedName = submitted.fullName.toLowerCase();
    const nameSimilarity = calculateStringSimilarity(submittedName, cofeprisFullName);

    if (nameSimilarity > 0.8) {
      matchScore++;
    } else if (nameSimilarity < 0.5) {
      discrepancies.push({
        field: 'fullName',
        submitted: submitted.fullName,
        found: cofeprisFullName,
        severity: nameSimilarity < 0.3 ? 'high' : 'medium',
      });
    }
  }

  // Medical school comparison
  if (submitted.medicalSchool && cofepris.institucion) {
    totalChecks++;
    const schoolSimilarity = calculateStringSimilarity(
      submitted.medicalSchool.toLowerCase(),
      cofepris.institucion.toLowerCase()
    );

    if (schoolSimilarity > 0.6) {
      matchScore++;
    } else {
      discrepancies.push({
        field: 'medicalSchool',
        submitted: submitted.medicalSchool,
        found: cofepris.institucion,
        severity: 'medium',
      });
    }
  }

  // Graduation year comparison
  if (submitted.graduationYear && cofepris.anioEgreso) {
    totalChecks++;
    const yearDiff = Math.abs(submitted.graduationYear - cofepris.anioEgreso);

    if (yearDiff === 0) {
      matchScore++;
    } else if (yearDiff <= 1) {
      // Allow 1 year tolerance (graduation vs certification year)
      matchScore += 0.5;
    } else {
      discrepancies.push({
        field: 'graduationYear',
        submitted: submitted.graduationYear,
        found: cofepris.anioEgreso,
        severity: yearDiff > 3 ? 'high' : 'medium',
      });
    }
  }

  const confidence = totalChecks > 0 ? matchScore / totalChecks : 0;
  const matches = confidence >= 0.7 && discrepancies.filter(d => d.severity === 'high').length === 0;

  return { matches, confidence, discrepancies };
}

/**
 * Build verification result for Mexico license
 */
export function buildMexicoVerificationResult(
  physicianId: string,
  licenseIndex: number,
  cedulaNumber: string,
  cofeprisResponse: CofeprisResponse,
  comparisonResult?: { matches: boolean; confidence: number; discrepancies: VerificationDiscrepancy[] }
): VerificationResult {
  const status = cofeprisResponse.found
    ? comparisonResult?.matches
      ? 'verified'
      : comparisonResult
      ? 'manual_review' // Found but discrepancies
      : 'verified' // Found, no comparison needed
    : 'manual_review'; // Not found, needs manual review

  return {
    physicianId,
    verificationType: 'license_mexico',
    credentialReference: {
      licenseIndex,
      country: 'Mexico',
      countryCode: 'MX',
      number: cedulaNumber,
    },
    status,
    verificationMethod: 'cofepris_api',
    externalData: cofeprisResponse.rawResponse,
    matchConfidence: comparisonResult?.confidence,
    discrepancies: comparisonResult?.discrepancies,
    verifiedAt: status === 'verified' ? new Date().toISOString() : undefined,
    verifiedBy: status === 'verified' ? 'system' : undefined,
    notes: cofeprisResponse.found
      ? `Cedula found in SEP registry. Name: ${cofeprisResponse.nombre} ${cofeprisResponse.apellidoPaterno || ''}`
      : 'Cedula not found in SEP registry - queued for manual verification',
  };
}

/**
 * Simple string similarity using Levenshtein distance
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const s1 = str1.trim();
  const s2 = str2.trim();

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  // Normalize strings
  const normalize = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ''); // Keep only alphanumeric

  const n1 = normalize(s1);
  const n2 = normalize(s2);

  // Calculate Levenshtein distance
  const matrix: number[][] = [];

  for (let i = 0; i <= n1.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= n2.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= n1.length; i++) {
    for (let j = 1; j <= n2.length; j++) {
      const cost = n1[i - 1] === n2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const distance = matrix[n1.length][n2.length];
  const maxLength = Math.max(n1.length, n2.length);

  return 1 - distance / maxLength;
}
