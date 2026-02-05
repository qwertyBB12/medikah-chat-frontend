/**
 * Google Scholar Verification (Tier 2 - Semi-Auto)
 *
 * Verifies physician publications and academic credentials via Google Scholar.
 * Uses Scholar profile URL to fetch publication data.
 *
 * Note: Google Scholar doesn't have an official API.
 * Options for fetching data:
 * 1. SerpAPI Google Scholar API (paid)
 * 2. Scholarly Python library (for server-side)
 * 3. Manual/cached data from onboarding
 */

import {
  ScholarVerificationData,
  VerificationResult,
  VerificationDiscrepancy,
} from './types';
import { Publication } from '../physicianClient';

// Google Scholar URL patterns
const SCHOLAR_URL_PATTERN = /^https?:\/\/scholar\.google\.com\/citations\?.*user=[\w-]+/i;
const SCHOLAR_USER_REGEX = /[?&]user=([\w-]+)/i;

interface ScholarVerificationParams {
  scholarUrl?: string;
  scholarId?: string;
  submittedData: {
    fullName: string;
    publications?: Publication[];
    primarySpecialty?: string;
    currentInstitutions?: string[];
  };
}

/**
 * Verify Google Scholar profile
 */
export async function verifyGoogleScholar(
  params: ScholarVerificationParams
): Promise<{
  valid: boolean;
  matches: boolean;
  confidence: number;
  discrepancies: VerificationDiscrepancy[];
  data?: ScholarVerificationData;
}> {
  const { scholarUrl, scholarId, submittedData } = params;

  // Need either URL or ID
  const url = scholarUrl || (scholarId ? buildScholarUrl(scholarId) : null);

  if (!url) {
    return {
      valid: false,
      matches: false,
      confidence: 0,
      discrepancies: [],
    };
  }

  // Validate URL format
  if (!isValidScholarUrl(url)) {
    return {
      valid: false,
      matches: false,
      confidence: 0,
      discrepancies: [{
        field: 'googleScholarUrl',
        submitted: url,
        found: null,
        severity: 'medium',
      }],
    };
  }

  // Try to fetch scholar data
  try {
    const scholarData = await fetchScholarProfile(url);

    if (scholarData) {
      const comparison = compareScholarData(submittedData, scholarData);
      return {
        valid: true,
        ...comparison,
        data: scholarData,
      };
    }
  } catch (error) {
    console.error('Scholar fetch error:', error);
  }

  // URL valid but couldn't fetch data
  return {
    valid: true,
    matches: false,
    confidence: 0.3, // Low confidence without actual data
    discrepancies: [],
    data: { profileUrl: url, scholarId: extractScholarId(url) || undefined },
  };
}

/**
 * Validate Google Scholar URL
 */
export function isValidScholarUrl(url: string): boolean {
  if (!url) return false;

  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === 'scholar.google.com' &&
      parsed.pathname === '/citations' &&
      parsed.searchParams.has('user')
    );
  } catch {
    return SCHOLAR_URL_PATTERN.test(url);
  }
}

/**
 * Extract Scholar user ID from URL
 */
export function extractScholarId(url: string): string | null {
  const match = url.match(SCHOLAR_USER_REGEX);
  return match ? match[1] : null;
}

/**
 * Build Scholar URL from ID
 */
function buildScholarUrl(scholarId: string): string {
  return `https://scholar.google.com/citations?user=${scholarId}`;
}

/**
 * Fetch Google Scholar profile data
 */
async function fetchScholarProfile(
  url: string
): Promise<ScholarVerificationData | null> {
  // Check for SerpAPI key
  const serpApiKey = process.env.SERPAPI_KEY;

  if (!serpApiKey) {
    console.warn('SERPAPI_KEY not configured - Scholar data fetch disabled');
    return null;
  }

  try {
    const scholarId = extractScholarId(url);
    if (!scholarId) return null;

    // Use SerpAPI to fetch Scholar profile
    const response = await fetch(
      `https://serpapi.com/search.json?engine=google_scholar_author&author_id=${scholarId}&api_key=${serpApiKey}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!response.ok) {
      console.error('SerpAPI error:', response.status);
      return null;
    }

    const data = await response.json();

    if (!data.author) {
      return null;
    }

    return {
      profileUrl: url,
      scholarId,
      name: data.author.name,
      affiliation: data.author.affiliations,
      citationCount: data.cited_by?.table?.[0]?.citations?.all,
      hIndex: data.cited_by?.table?.[1]?.h_index?.all,
      i10Index: data.cited_by?.table?.[2]?.i10_index?.all,
      publications: data.articles?.slice(0, 20).map((article: {
        title: string;
        authors: string;
        publication?: string;
        year?: string;
        cited_by?: { value?: number };
      }) => ({
        title: article.title,
        authors: article.authors,
        journal: article.publication,
        year: article.year ? parseInt(article.year) : undefined,
        citations: article.cited_by?.value,
      })),
      rawData: data,
    };
  } catch (error) {
    console.error('Scholar profile fetch error:', error);
    return null;
  }
}

/**
 * Compare submitted data with Scholar data
 */
function compareScholarData(
  submitted: {
    fullName: string;
    publications?: Publication[];
    primarySpecialty?: string;
    currentInstitutions?: string[];
  },
  scholar: ScholarVerificationData
): { matches: boolean; confidence: number; discrepancies: VerificationDiscrepancy[] } {
  const discrepancies: VerificationDiscrepancy[] = [];
  let matchScore = 0;
  let totalChecks = 0;

  // Name comparison
  if (scholar.name) {
    totalChecks++;
    const nameSimilarity = calculateNameSimilarity(submitted.fullName, scholar.name);

    if (nameSimilarity > 0.7) {
      matchScore++;
    } else if (nameSimilarity < 0.4) {
      discrepancies.push({
        field: 'fullName',
        submitted: submitted.fullName,
        found: scholar.name,
        severity: 'high',
      });
    } else {
      matchScore += 0.5;
    }
  }

  // Affiliation comparison
  if (submitted.currentInstitutions && submitted.currentInstitutions.length > 0 && scholar.affiliation) {
    totalChecks++;
    const affiliationMatch = submitted.currentInstitutions.some(inst =>
      calculateStringSimilarity(inst.toLowerCase(), scholar.affiliation!.toLowerCase()) > 0.4
    );

    if (affiliationMatch) {
      matchScore++;
    } else {
      discrepancies.push({
        field: 'affiliation',
        submitted: submitted.currentInstitutions.join(', '),
        found: scholar.affiliation,
        severity: 'low',
      });
    }
  }

  // Publication count verification
  if (submitted.publications && submitted.publications.length > 0) {
    totalChecks++;

    // Check if scholar has publications
    if (scholar.publications && scholar.publications.length > 0) {
      // Try to match some publications by title
      let matchedPubs = 0;
      for (const subPub of submitted.publications.slice(0, 5)) {
        const found = scholar.publications.some(
          schPub => calculateStringSimilarity(subPub.title, schPub.title) > 0.7
        );
        if (found) matchedPubs++;
      }

      const pubMatchRatio = matchedPubs / Math.min(5, submitted.publications.length);
      matchScore += pubMatchRatio;

      if (pubMatchRatio < 0.3 && submitted.publications.length > 2) {
        discrepancies.push({
          field: 'publications',
          submitted: `${submitted.publications.length} publications`,
          found: `${scholar.publications.length} found, ${matchedPubs} matched`,
          severity: 'medium',
        });
      }
    } else {
      discrepancies.push({
        field: 'publications',
        submitted: `${submitted.publications.length} publications`,
        found: 'None found on Scholar',
        severity: 'medium',
      });
    }
  }

  // Citation metrics (if available) add credibility
  if (scholar.citationCount !== undefined && scholar.citationCount > 0) {
    totalChecks++;
    matchScore++; // Having citations is a positive signal
  }

  if (scholar.hIndex !== undefined && scholar.hIndex > 0) {
    totalChecks++;
    matchScore++;
  }

  const confidence = totalChecks > 0 ? matchScore / totalChecks : 0;
  const hasHighSeverity = discrepancies.some(d => d.severity === 'high');
  const matches = confidence >= 0.6 && !hasHighSeverity;

  return { matches, confidence, discrepancies };
}

/**
 * Build verification result for Google Scholar
 */
export function buildScholarVerificationResult(
  physicianId: string,
  scholarUrl: string,
  verificationResult: {
    valid: boolean;
    matches: boolean;
    confidence: number;
    discrepancies: VerificationDiscrepancy[];
    data?: ScholarVerificationData;
  }
): VerificationResult {
  const { valid, matches, confidence, discrepancies, data } = verificationResult;

  let status: 'verified' | 'failed' | 'manual_review';
  if (!valid) {
    status = 'failed';
  } else if (matches && confidence >= 0.7) {
    status = 'verified';
  } else if (confidence >= 0.4) {
    status = 'manual_review';
  } else {
    status = 'manual_review';
  }

  const metricsNote = data
    ? `Citations: ${data.citationCount || 'N/A'}, h-index: ${data.hIndex || 'N/A'}, Publications: ${data.publications?.length || 'N/A'}`
    : 'No metrics available';

  return {
    physicianId,
    verificationType: 'publications_scholar',
    credentialReference: {
      country: 'Google Scholar',
    },
    status,
    verificationMethod: 'scholar_fetch',
    externalData: {
      profileUrl: scholarUrl,
      scholarId: data?.scholarId,
      citationCount: data?.citationCount,
      hIndex: data?.hIndex,
      i10Index: data?.i10Index,
      publicationCount: data?.publications?.length,
    },
    matchConfidence: confidence,
    discrepancies,
    verifiedAt: status === 'verified' ? new Date().toISOString() : undefined,
    verifiedBy: status === 'verified' ? 'system' : undefined,
    notes: !valid
      ? 'Invalid Google Scholar URL format'
      : matches
      ? `Scholar profile verified. ${metricsNote}. Confidence: ${(confidence * 100).toFixed(0)}%`
      : `Scholar profile requires review. ${metricsNote}`,
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

  const parts1 = n1.split(' ');
  const parts2 = n2.split(' ');
  const matching = parts1.filter(p => parts2.includes(p)).length;
  const total = Math.max(parts1.length, parts2.length);

  return matching / total;
}

/**
 * Calculate string similarity
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const s1 = str1.trim().toLowerCase();
  const s2 = str2.trim().toLowerCase();

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  if (s1.includes(s2) || s2.includes(s1)) {
    return 0.8;
  }

  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  const matching = words1.filter(w => words2.includes(w)).length;
  const total = Math.max(words1.length, words2.length);

  return matching / total;
}
