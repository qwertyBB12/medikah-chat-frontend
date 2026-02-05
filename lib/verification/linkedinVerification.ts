/**
 * LinkedIn Verification (Tier 2 - Semi-Auto)
 *
 * Verifies physician data against their LinkedIn profile.
 * Since LinkedIn doesn't have a public API for profile scraping,
 * this uses:
 * 1. LinkedIn Profile URL validation
 * 2. Manual/semi-automated data comparison (data imported during onboarding)
 *
 * For full automation, you'd need:
 * - LinkedIn OAuth integration
 * - LinkedIn Marketing API access (expensive)
 * - Or a third-party service like Proxycurl
 */

import {
  LinkedInVerificationData,
  VerificationResult,
  VerificationDiscrepancy,
} from './types';

// LinkedIn URL patterns
const LINKEDIN_URL_PATTERN = /^https?:\/\/(www\.)?linkedin\.com\/in\/[\w-]+\/?$/i;
const LINKEDIN_PROFILE_REGEX = /linkedin\.com\/in\/([\w-]+)/i;

interface LinkedInVerificationParams {
  linkedinUrl: string;
  linkedinData?: LinkedInVerificationData; // Data imported during onboarding
  submittedData: {
    fullName: string;
    medicalSchool?: string;
    graduationYear?: number;
    currentInstitutions?: string[];
    primarySpecialty?: string;
  };
}

/**
 * Verify LinkedIn profile data
 */
export async function verifyLinkedInProfile(
  params: LinkedInVerificationParams
): Promise<{
  valid: boolean;
  matches: boolean;
  confidence: number;
  discrepancies: VerificationDiscrepancy[];
  data?: LinkedInVerificationData;
}> {
  const { linkedinUrl, linkedinData, submittedData } = params;

  // Step 1: Validate LinkedIn URL format
  if (!isValidLinkedInUrl(linkedinUrl)) {
    return {
      valid: false,
      matches: false,
      confidence: 0,
      discrepancies: [{
        field: 'linkedinUrl',
        submitted: linkedinUrl,
        found: null,
        severity: 'high',
      }],
    };
  }

  // Step 2: If we have LinkedIn data (from import), compare it
  if (linkedinData) {
    const comparison = compareLinkedInData(submittedData, linkedinData);
    return {
      valid: true,
      ...comparison,
      data: linkedinData,
    };
  }

  // Step 3: Try to fetch profile data via third-party service
  try {
    const fetchedData = await fetchLinkedInProfile(linkedinUrl);
    if (fetchedData) {
      const comparison = compareLinkedInData(submittedData, fetchedData);
      return {
        valid: true,
        ...comparison,
        data: fetchedData,
      };
    }
  } catch (error) {
    console.error('LinkedIn fetch error:', error);
  }

  // Step 4: URL is valid but we couldn't verify data
  return {
    valid: true,
    matches: false, // Can't confirm without data
    confidence: 0.3, // Low confidence - URL exists but unverified
    discrepancies: [],
    data: { profileUrl: linkedinUrl },
  };
}

/**
 * Validate LinkedIn URL format
 */
export function isValidLinkedInUrl(url: string): boolean {
  if (!url) return false;

  try {
    const parsed = new URL(url);
    return (
      (parsed.hostname === 'linkedin.com' || parsed.hostname === 'www.linkedin.com') &&
      parsed.pathname.startsWith('/in/')
    );
  } catch {
    return LINKEDIN_URL_PATTERN.test(url);
  }
}

/**
 * Extract LinkedIn profile ID from URL
 */
export function extractLinkedInId(url: string): string | null {
  const match = url.match(LINKEDIN_PROFILE_REGEX);
  return match ? match[1] : null;
}

/**
 * Fetch LinkedIn profile data
 * Note: This would require a third-party service like Proxycurl
 */
async function fetchLinkedInProfile(
  url: string
): Promise<LinkedInVerificationData | null> {
  // Check if we have Proxycurl API key configured
  const proxycurlApiKey = process.env.PROXYCURL_API_KEY;

  if (!proxycurlApiKey) {
    console.warn('PROXYCURL_API_KEY not configured - LinkedIn data fetch disabled');
    return null;
  }

  try {
    const profileId = extractLinkedInId(url);
    if (!profileId) return null;

    const response = await fetch(
      `https://nubela.co/proxycurl/api/v2/linkedin?url=${encodeURIComponent(url)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${proxycurlApiKey}`,
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!response.ok) {
      console.error('Proxycurl error:', response.status);
      return null;
    }

    const data = await response.json();

    return {
      profileUrl: url,
      fullName: data.full_name,
      headline: data.headline,
      photoUrl: data.profile_pic_url,
      currentPosition: data.experiences?.[0]
        ? {
            title: data.experiences[0].title,
            company: data.experiences[0].company,
          }
        : undefined,
      education: data.education?.map((edu: {
        school: string;
        degree_name?: string;
        field_of_study?: string;
        starts_at?: { year?: number };
        ends_at?: { year?: number };
      }) => ({
        school: edu.school,
        degree: edu.degree_name,
        field: edu.field_of_study,
        startYear: edu.starts_at?.year,
        endYear: edu.ends_at?.year,
      })),
      rawData: data,
    };
  } catch (error) {
    console.error('LinkedIn profile fetch error:', error);
    return null;
  }
}

/**
 * Compare submitted data with LinkedIn data
 */
function compareLinkedInData(
  submitted: {
    fullName: string;
    medicalSchool?: string;
    graduationYear?: number;
    currentInstitutions?: string[];
    primarySpecialty?: string;
  },
  linkedin: LinkedInVerificationData
): { matches: boolean; confidence: number; discrepancies: VerificationDiscrepancy[] } {
  const discrepancies: VerificationDiscrepancy[] = [];
  let matchScore = 0;
  let totalChecks = 0;

  // Name comparison
  if (linkedin.fullName) {
    totalChecks++;
    const nameSimilarity = calculateNameSimilarity(submitted.fullName, linkedin.fullName);

    if (nameSimilarity > 0.8) {
      matchScore++;
    } else if (nameSimilarity < 0.5) {
      discrepancies.push({
        field: 'fullName',
        submitted: submitted.fullName,
        found: linkedin.fullName,
        severity: nameSimilarity < 0.3 ? 'high' : 'medium',
      });
    } else {
      matchScore += 0.5; // Partial match
    }
  }

  // Education comparison
  if (submitted.medicalSchool && linkedin.education && linkedin.education.length > 0) {
    totalChecks++;
    const medSchoolMatch = linkedin.education.some(edu => {
      const schoolSimilarity = calculateStringSimilarity(
        submitted.medicalSchool!.toLowerCase(),
        edu.school.toLowerCase()
      );
      return schoolSimilarity > 0.6;
    });

    if (medSchoolMatch) {
      matchScore++;
    } else {
      discrepancies.push({
        field: 'medicalSchool',
        submitted: submitted.medicalSchool,
        found: linkedin.education.map(e => e.school).join(', '),
        severity: 'medium',
      });
    }
  }

  // Graduation year comparison
  if (submitted.graduationYear && linkedin.education) {
    totalChecks++;
    const yearMatch = linkedin.education.some(edu => {
      if (!edu.endYear) return false;
      return Math.abs(edu.endYear - submitted.graduationYear!) <= 1;
    });

    if (yearMatch) {
      matchScore++;
    } else {
      const foundYears = linkedin.education
        .map(e => e.endYear)
        .filter(Boolean)
        .join(', ');
      if (foundYears) {
        discrepancies.push({
          field: 'graduationYear',
          submitted: submitted.graduationYear,
          found: foundYears,
          severity: 'medium',
        });
      }
    }
  }

  // Current institution comparison
  if (
    submitted.currentInstitutions &&
    submitted.currentInstitutions.length > 0 &&
    linkedin.currentPosition
  ) {
    totalChecks++;
    const institutionMatch = submitted.currentInstitutions.some(inst =>
      calculateStringSimilarity(
        inst.toLowerCase(),
        linkedin.currentPosition!.company.toLowerCase()
      ) > 0.5
    );

    if (institutionMatch) {
      matchScore++;
    } else {
      discrepancies.push({
        field: 'currentInstitution',
        submitted: submitted.currentInstitutions.join(', '),
        found: linkedin.currentPosition.company,
        severity: 'low',
      });
    }
  }

  // Photo verification (just check if exists)
  if (linkedin.photoUrl) {
    totalChecks++;
    matchScore++; // Having a photo is a positive signal
  }

  const confidence = totalChecks > 0 ? matchScore / totalChecks : 0;
  const hasHighSeverity = discrepancies.some(d => d.severity === 'high');
  const matches = confidence >= 0.6 && !hasHighSeverity;

  return { matches, confidence, discrepancies };
}

/**
 * Build verification result for LinkedIn
 */
export function buildLinkedInVerificationResult(
  physicianId: string,
  linkedinUrl: string,
  verificationResult: {
    valid: boolean;
    matches: boolean;
    confidence: number;
    discrepancies: VerificationDiscrepancy[];
    data?: LinkedInVerificationData;
  }
): VerificationResult {
  const { valid, matches, confidence, discrepancies, data } = verificationResult;

  let status: 'verified' | 'failed' | 'manual_review';
  if (!valid) {
    status = 'failed';
  } else if (matches && confidence >= 0.7) {
    status = 'verified';
  } else if (confidence >= 0.5) {
    status = 'manual_review'; // Some matches but not confident enough
  } else {
    status = 'manual_review';
  }

  return {
    physicianId,
    verificationType: 'education_linkedin',
    credentialReference: {
      country: 'LinkedIn',
    },
    status,
    verificationMethod: 'linkedin_match',
    externalData: {
      profileUrl: linkedinUrl,
      ...(data?.rawData || {}),
    },
    matchConfidence: confidence,
    discrepancies,
    verifiedAt: status === 'verified' ? new Date().toISOString() : undefined,
    verifiedBy: status === 'verified' ? 'system' : undefined,
    notes: !valid
      ? 'Invalid LinkedIn URL format'
      : matches
      ? `LinkedIn profile verified. Confidence: ${(confidence * 100).toFixed(0)}%`
      : `LinkedIn profile requires manual review. Confidence: ${(confidence * 100).toFixed(0)}%`,
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

  // Check if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) {
    return 0.8;
  }

  // Simple word overlap
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  const matching = words1.filter(w => words2.includes(w)).length;
  const total = Math.max(words1.length, words2.length);

  return matching / total;
}
