/**
 * Physician Credential Verification Service
 *
 * Orchestrates the 3-tier verification process:
 * - Tier 1: Auto-verify (COFEPRIS, State Medical Boards)
 * - Tier 2: Semi-auto (LinkedIn, Google Scholar)
 * - Tier 3: Manual review queue
 */

import { supabase } from '../supabase';
import { PhysicianProfileData, PhysicianLicense } from '../physicianClient';
import { sendVerificationUpdate } from '../email';
import {
  VerificationResult,
  ManualReviewItem,
  PhysicianVerificationStatus,
  VerificationType,
  ManualReviewType,
  ReviewPriority,
} from './types';
import { verifyCedulaMexico, compareCofeprisData, buildMexicoVerificationResult } from './cofepris';
import { verifyUSAMedicalLicense, compareStateBoardData, buildUSAVerificationResult, getStateBoardUrl } from './usaMedicalBoards';
import { verifyLinkedInProfile, buildLinkedInVerificationResult } from './linkedinVerification';
import { verifyGoogleScholar, buildScholarVerificationResult } from './scholarVerification';

/**
 * Run full credential verification for a physician
 */
export async function verifyPhysicianCredentials(
  physicianId: string,
  options?: {
    forceRecheck?: boolean;
    specificTypes?: VerificationType[];
  }
): Promise<PhysicianVerificationStatus> {
  const { forceRecheck = false, specificTypes } = options || {};

  // Get physician data
  const physician = await getPhysicianData(physicianId);
  if (!physician) {
    throw new Error(`Physician not found: ${physicianId}`);
  }

  // Check existing verification results
  const existingResults = forceRecheck ? [] : await getExistingResults(physicianId);

  const results: VerificationResult[] = [...existingResults];
  const manualReviewItems: ManualReviewItem[] = [];

  // Tier 1: Auto-verify licenses
  if (!specificTypes || specificTypes.includes('license_mexico') || specificTypes.includes('license_usa')) {
    const licenseResults = await verifyLicenses(physicianId, physician, existingResults, forceRecheck);
    results.push(...licenseResults.results);
    manualReviewItems.push(...licenseResults.manualReviews);
  }

  // Tier 2: Semi-auto verification
  if (!specificTypes || specificTypes.includes('education_linkedin')) {
    if (physician.linkedinUrl) {
      const linkedinResult = await verifyLinkedIn(physicianId, physician, existingResults, forceRecheck);
      if (linkedinResult) {
        results.push(linkedinResult.result);
        if (linkedinResult.manualReview) {
          manualReviewItems.push(linkedinResult.manualReview);
        }
      }
    }
  }

  if (!specificTypes || specificTypes.includes('publications_scholar')) {
    if (physician.googleScholarUrl) {
      const scholarResult = await verifyScholar(physicianId, physician, existingResults, forceRecheck);
      if (scholarResult) {
        results.push(scholarResult.result);
        if (scholarResult.manualReview) {
          manualReviewItems.push(scholarResult.manualReview);
        }
      }
    }
  }

  // Save results to database
  await saveVerificationResults(results.filter(r => !existingResults.find(e => e.id === r.id)));
  await createManualReviewItems(manualReviewItems);

  // Calculate overall status
  const status = calculateOverallStatus(physicianId, results);

  // Update physician record
  await updatePhysicianVerificationStatus(physicianId, status);

  return status;
}

/**
 * Get physician data from database
 */
async function getPhysicianData(physicianId: string): Promise<PhysicianProfileData | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('physicians')
    .select('*')
    .eq('id', physicianId)
    .single();

  if (error || !data) return null;

  return {
    fullName: data.full_name,
    email: data.email,
    photoUrl: data.photo_url,
    linkedinUrl: data.linkedin_url,
    linkedinImported: data.linkedin_imported,
    licenses: data.licenses || [],
    primarySpecialty: data.primary_specialty,
    subSpecialties: data.sub_specialties,
    boardCertifications: data.board_certifications,
    medicalSchool: data.medical_school,
    medicalSchoolCountry: data.medical_school_country,
    graduationYear: data.graduation_year,
    honors: data.honors,
    residency: data.residency,
    fellowships: data.fellowships,
    googleScholarUrl: data.google_scholar_url,
    publications: data.publications,
    presentations: data.presentations,
    books: data.books,
    currentInstitutions: data.current_institutions,
    websiteUrl: data.website_url,
    twitterUrl: data.twitter_url,
    researchgateUrl: data.researchgate_url,
    academiaEduUrl: data.academia_edu_url,
    availableDays: data.available_days,
    availableHoursStart: data.available_hours_start,
    availableHoursEnd: data.available_hours_end,
    timezone: data.timezone,
    languages: data.languages,
    onboardingLanguage: data.onboarding_language,
  };
}

/**
 * Get existing verification results
 */
async function getExistingResults(physicianId: string): Promise<VerificationResult[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('physician_verification_results')
    .select('*')
    .eq('physician_id', physicianId);

  if (error || !data) return [];

  return data.map(row => ({
    id: row.id,
    physicianId: row.physician_id,
    verificationType: row.verification_type,
    credentialReference: row.credential_reference,
    status: row.status,
    verificationMethod: row.verification_method,
    externalData: row.external_data,
    matchConfidence: row.match_confidence,
    discrepancies: row.discrepancies,
    verifiedAt: row.verified_at,
    verifiedBy: row.verified_by,
    notes: row.notes,
  }));
}

/**
 * Verify all licenses (Tier 1)
 */
async function verifyLicenses(
  physicianId: string,
  physician: PhysicianProfileData,
  existingResults: VerificationResult[],
  forceRecheck: boolean
): Promise<{ results: VerificationResult[]; manualReviews: ManualReviewItem[] }> {
  const results: VerificationResult[] = [];
  const manualReviews: ManualReviewItem[] = [];

  for (let i = 0; i < physician.licenses.length; i++) {
    const license = physician.licenses[i];

    // Check if already verified
    const existing = existingResults.find(
      r =>
        r.credentialReference?.licenseIndex === i &&
        r.credentialReference?.countryCode === license.countryCode
    );

    if (existing && !forceRecheck && existing.status === 'verified') {
      results.push(existing);
      continue;
    }

    // Verify based on country
    if (license.countryCode === 'MX') {
      const result = await verifyMexicoLicense(physicianId, i, license, physician);
      results.push(result);

      if (result.status === 'manual_review') {
        manualReviews.push(createLicenseManualReview(physicianId, result, license, physician));
      }
    } else if (license.countryCode === 'US') {
      const result = await verifyUSLicense(physicianId, i, license, physician);
      results.push(result);

      if (result.status === 'manual_review') {
        manualReviews.push(createLicenseManualReview(physicianId, result, license, physician));
      }
    } else {
      // International license - queue for manual review
      const result: VerificationResult = {
        physicianId,
        verificationType: 'international_credential',
        credentialReference: {
          licenseIndex: i,
          country: license.country,
          countryCode: license.countryCode,
          number: license.number,
        },
        status: 'manual_review',
        verificationMethod: 'manual_review',
        notes: `International license from ${license.country} requires manual verification`,
      };
      results.push(result);
      manualReviews.push(createLicenseManualReview(physicianId, result, license, physician));
    }
  }

  return { results, manualReviews };
}

/**
 * Verify Mexico (COFEPRIS) license
 */
async function verifyMexicoLicense(
  physicianId: string,
  index: number,
  license: PhysicianLicense,
  physician: PhysicianProfileData
): Promise<VerificationResult> {
  const cofeprisResponse = await verifyCedulaMexico({ cedulaNumber: license.number });

  let comparison;
  if (cofeprisResponse.found) {
    comparison = compareCofeprisData(
      {
        fullName: physician.fullName,
        medicalSchool: physician.medicalSchool,
        graduationYear: physician.graduationYear,
      },
      cofeprisResponse
    );
  }

  return buildMexicoVerificationResult(
    physicianId,
    index,
    license.number,
    cofeprisResponse,
    comparison
  );
}

/**
 * Verify USA state license
 */
async function verifyUSLicense(
  physicianId: string,
  index: number,
  license: PhysicianLicense,
  physician: PhysicianProfileData
): Promise<VerificationResult> {
  if (!license.state) {
    return {
      physicianId,
      verificationType: 'license_usa',
      credentialReference: {
        licenseIndex: index,
        country: 'USA',
        countryCode: 'US',
        number: license.number,
      },
      status: 'failed',
      verificationMethod: 'state_medical_board',
      notes: 'USA license requires state to be specified',
    };
  }

  const response = await verifyUSAMedicalLicense({
    state: license.state,
    licenseNumber: license.number,
    lastName: physician.fullName.split(' ').pop(),
  });

  let comparison;
  if (response.found) {
    comparison = compareStateBoardData(
      {
        fullName: physician.fullName,
        specialty: physician.primarySpecialty,
      },
      response
    );
  }

  return buildUSAVerificationResult(
    physicianId,
    index,
    license.state,
    license.number,
    response,
    comparison
  );
}

/**
 * Create manual review item for license
 */
function createLicenseManualReview(
  physicianId: string,
  result: VerificationResult,
  license: PhysicianLicense,
  physician: PhysicianProfileData
): ManualReviewItem {
  const reviewType: ManualReviewType = result.verificationType === 'international_credential'
    ? 'international_credential'
    : 'license_not_found';

  const boardUrl = license.countryCode === 'US' && license.state
    ? getStateBoardUrl(license.state)
    : license.countryCode === 'MX'
    ? 'https://www.cedulaprofesional.sep.gob.mx/'
    : null;

  return {
    physicianId,
    reviewType,
    priority: 'normal',
    reviewData: {
      physicianName: physician.fullName,
      physicianEmail: physician.email,
      license,
      verificationAttempt: result,
      boardLookupUrl: boardUrl,
      discrepancies: result.discrepancies,
    },
    reason: result.notes || `License verification requires manual review`,
    status: 'pending',
  };
}

/**
 * Verify LinkedIn profile (Tier 2)
 */
async function verifyLinkedIn(
  physicianId: string,
  physician: PhysicianProfileData,
  existingResults: VerificationResult[],
  forceRecheck: boolean
): Promise<{ result: VerificationResult; manualReview?: ManualReviewItem } | null> {
  if (!physician.linkedinUrl) return null;

  const existing = existingResults.find(r => r.verificationType === 'education_linkedin');
  if (existing && !forceRecheck && existing.status === 'verified') {
    return { result: existing };
  }

  const verificationResult = await verifyLinkedInProfile({
    linkedinUrl: physician.linkedinUrl,
    submittedData: {
      fullName: physician.fullName,
      medicalSchool: physician.medicalSchool,
      graduationYear: physician.graduationYear,
      currentInstitutions: physician.currentInstitutions,
      primarySpecialty: physician.primarySpecialty,
    },
  });

  const result = buildLinkedInVerificationResult(
    physicianId,
    physician.linkedinUrl,
    verificationResult
  );

  let manualReview: ManualReviewItem | undefined;
  if (result.status === 'manual_review' && verificationResult.discrepancies.length > 0) {
    manualReview = {
      physicianId,
      reviewType: 'data_discrepancy',
      priority: 'low',
      reviewData: {
        physicianName: physician.fullName,
        physicianEmail: physician.email,
        linkedinUrl: physician.linkedinUrl,
        linkedinData: verificationResult.data,
        discrepancies: verificationResult.discrepancies,
        confidence: verificationResult.confidence,
      },
      reason: `LinkedIn data has discrepancies with submitted information`,
      status: 'pending',
    };
  }

  return { result, manualReview };
}

/**
 * Verify Google Scholar (Tier 2)
 */
async function verifyScholar(
  physicianId: string,
  physician: PhysicianProfileData,
  existingResults: VerificationResult[],
  forceRecheck: boolean
): Promise<{ result: VerificationResult; manualReview?: ManualReviewItem } | null> {
  if (!physician.googleScholarUrl) return null;

  const existing = existingResults.find(r => r.verificationType === 'publications_scholar');
  if (existing && !forceRecheck && existing.status === 'verified') {
    return { result: existing };
  }

  const verificationResult = await verifyGoogleScholar({
    scholarUrl: physician.googleScholarUrl,
    submittedData: {
      fullName: physician.fullName,
      publications: physician.publications,
      primarySpecialty: physician.primarySpecialty,
      currentInstitutions: physician.currentInstitutions,
    },
  });

  const result = buildScholarVerificationResult(
    physicianId,
    physician.googleScholarUrl,
    verificationResult
  );

  let manualReview: ManualReviewItem | undefined;
  if (result.status === 'manual_review' && verificationResult.discrepancies.length > 0) {
    manualReview = {
      physicianId,
      reviewType: 'data_discrepancy',
      priority: 'low',
      reviewData: {
        physicianName: physician.fullName,
        physicianEmail: physician.email,
        scholarUrl: physician.googleScholarUrl,
        scholarData: verificationResult.data,
        discrepancies: verificationResult.discrepancies,
        confidence: verificationResult.confidence,
      },
      reason: `Google Scholar data has discrepancies with submitted information`,
      status: 'pending',
    };
  }

  return { result, manualReview };
}

/**
 * Save verification results to database
 */
async function saveVerificationResults(results: VerificationResult[]): Promise<void> {
  if (!supabase || results.length === 0) return;

  const rows = results.map(r => ({
    physician_id: r.physicianId,
    verification_type: r.verificationType,
    credential_reference: r.credentialReference,
    status: r.status,
    verification_method: r.verificationMethod,
    external_data: r.externalData,
    match_confidence: r.matchConfidence,
    discrepancies: r.discrepancies,
    verified_at: r.verifiedAt,
    verified_by: r.verifiedBy,
    notes: r.notes,
  }));

  const { error } = await supabase
    .from('physician_verification_results')
    .insert(rows);

  if (error) {
    console.error('Failed to save verification results:', error);
  }
}

/**
 * Create manual review queue items
 */
async function createManualReviewItems(items: ManualReviewItem[]): Promise<void> {
  if (!supabase || items.length === 0) return;

  const rows = items.map(item => ({
    physician_id: item.physicianId,
    verification_result_id: item.verificationResultId,
    review_type: item.reviewType,
    priority: item.priority,
    review_data: item.reviewData,
    reason: item.reason,
    status: item.status,
    sla_deadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 hours
  }));

  const { error } = await supabase
    .from('physician_manual_review_queue')
    .insert(rows);

  if (error) {
    console.error('Failed to create manual review items:', error);
  }
}

/**
 * Calculate overall verification status
 */
function calculateOverallStatus(
  physicianId: string,
  results: VerificationResult[]
): PhysicianVerificationStatus {
  const summary = {
    total: results.length,
    verified: results.filter(r => r.status === 'verified').length,
    failed: results.filter(r => r.status === 'failed' || r.status === 'rejected').length,
    pending: results.filter(r => r.status === 'pending').length,
    manualReview: results.filter(r => r.status === 'manual_review').length,
  };

  let overallStatus: PhysicianVerificationStatus['overallStatus'];
  let tier: PhysicianVerificationStatus['tier'] = null;

  if (summary.total === 0) {
    overallStatus = 'pending';
  } else if (summary.failed > 0) {
    overallStatus = 'rejected';
  } else if (summary.verified === summary.total) {
    overallStatus = 'verified';
    tier = summary.manualReview === 0 ? 'tier1' : 'tier2';
  } else if (summary.verified > 0) {
    overallStatus = 'partially_verified';
    tier = 'tier2';
  } else if (summary.manualReview > 0) {
    overallStatus = 'in_progress';
    tier = 'tier3';
  } else {
    overallStatus = 'pending';
  }

  return {
    physicianId,
    overallStatus,
    tier,
    verifiedAt: overallStatus === 'verified' ? new Date().toISOString() : null,
    verifiedBy: overallStatus === 'verified' ? 'system' : null,
    results,
    pendingManualReviews: summary.manualReview,
    summary,
  };
}

/**
 * Update physician verification status in main table
 */
async function updatePhysicianVerificationStatus(
  physicianId: string,
  status: PhysicianVerificationStatus
): Promise<void> {
  if (!supabase) return;

  const dbStatus = status.overallStatus === 'verified'
    ? 'verified'
    : status.overallStatus === 'rejected'
    ? 'rejected'
    : status.overallStatus === 'partially_verified'
    ? 'in_review'
    : 'pending';

  const { error } = await supabase
    .from('physicians')
    .update({
      verification_status: dbStatus,
      verified_at: status.verifiedAt,
      verified_by: status.verifiedBy,
      verification_tier: status.tier,
      verification_notes: `${status.summary.verified}/${status.summary.total} credentials verified`,
    })
    .eq('id', physicianId);

  if (error) {
    console.error('Failed to update physician verification status:', error);
  }
}

/**
 * Get verification status for a physician
 */
export async function getVerificationStatus(
  physicianId: string
): Promise<PhysicianVerificationStatus | null> {
  const results = await getExistingResults(physicianId);

  if (results.length === 0) {
    // Check if physician exists
    const physician = await getPhysicianData(physicianId);
    if (!physician) return null;

    return {
      physicianId,
      overallStatus: 'pending',
      tier: null,
      verifiedAt: null,
      verifiedBy: null,
      results: [],
      pendingManualReviews: 0,
      summary: { total: 0, verified: 0, failed: 0, pending: 0, manualReview: 0 },
    };
  }

  return calculateOverallStatus(physicianId, results);
}

/**
 * Manually approve a verification result
 */
export async function approveManualReview(
  reviewId: string,
  reviewerId: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Database not configured' };
  }

  try {
    // Get the review item
    const { data: review, error: fetchError } = await supabase
      .from('physician_manual_review_queue')
      .select('*')
      .eq('id', reviewId)
      .single();

    if (fetchError || !review) {
      return { success: false, error: 'Review not found' };
    }

    // Update the review queue
    const { error: updateError } = await supabase
      .from('physician_manual_review_queue')
      .update({
        status: 'approved',
        resolved_at: new Date().toISOString(),
        resolved_by: reviewerId,
        resolution_notes: notes,
      })
      .eq('id', reviewId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Update the verification result
    if (review.verification_result_id) {
      await supabase
        .from('physician_verification_results')
        .update({
          status: 'verified',
          verified_at: new Date().toISOString(),
          verified_by: `manual:${reviewerId}`,
          notes: notes || 'Manually verified',
        })
        .eq('id', review.verification_result_id);
    }

    // Recalculate overall status
    const newStatus = await verifyPhysicianCredentials(review.physician_id);

    // Send verification update email if fully verified
    if (newStatus.overallStatus === 'verified') {
      const physician = await getPhysicianData(review.physician_id);
      if (physician) {
        sendVerificationUpdate({
          physicianId: review.physician_id,
          fullName: physician.fullName,
          email: physician.email,
          newStatus: 'verified',
          lang: (physician.onboardingLanguage as 'en' | 'es') || 'en',
        }).catch(err => {
          console.error('Failed to send verification email:', err);
        });
      }
    }

    return { success: true };
  } catch {
    return { success: false, error: 'Failed to approve review' };
  }
}

/**
 * Reject a manual review
 */
export async function rejectManualReview(
  reviewId: string,
  reviewerId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Database not configured' };
  }

  try {
    // Get the review item
    const { data: review, error: fetchError } = await supabase
      .from('physician_manual_review_queue')
      .select('*')
      .eq('id', reviewId)
      .single();

    if (fetchError || !review) {
      return { success: false, error: 'Review not found' };
    }

    // Update the review queue
    const { error: updateError } = await supabase
      .from('physician_manual_review_queue')
      .update({
        status: 'rejected',
        resolved_at: new Date().toISOString(),
        resolved_by: reviewerId,
        resolution_notes: reason,
      })
      .eq('id', reviewId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Update the verification result
    if (review.verification_result_id) {
      await supabase
        .from('physician_verification_results')
        .update({
          status: 'rejected',
          verified_at: new Date().toISOString(),
          verified_by: `manual:${reviewerId}`,
          notes: `Rejected: ${reason}`,
        })
        .eq('id', review.verification_result_id);
    }

    // Recalculate overall status
    await verifyPhysicianCredentials(review.physician_id);

    // Send rejection email
    const physician = await getPhysicianData(review.physician_id);
    if (physician) {
      sendVerificationUpdate({
        physicianId: review.physician_id,
        fullName: physician.fullName,
        email: physician.email,
        newStatus: 'rejected',
        rejectionReason: reason,
        lang: (physician.onboardingLanguage as 'en' | 'es') || 'en',
      }).catch(err => {
        console.error('Failed to send rejection email:', err);
      });
    }

    return { success: true };
  } catch {
    return { success: false, error: 'Failed to reject review' };
  }
}

/**
 * Get pending manual reviews
 */
export async function getPendingManualReviews(
  options?: {
    limit?: number;
    priority?: ReviewPriority;
  }
): Promise<ManualReviewItem[]> {
  if (!supabase) return [];

  let query = supabase
    .from('physician_manual_review_queue')
    .select('*')
    .eq('status', 'pending')
    .order('sla_deadline', { ascending: true });

  if (options?.priority) {
    query = query.eq('priority', options.priority);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error || !data) return [];

  return data.map(row => ({
    id: row.id,
    physicianId: row.physician_id,
    verificationResultId: row.verification_result_id,
    reviewType: row.review_type,
    priority: row.priority,
    reviewData: row.review_data,
    reason: row.reason,
    slaDeadline: row.sla_deadline,
    assignedTo: row.assigned_to,
    assignedAt: row.assigned_at,
    status: row.status,
    resolutionNotes: row.resolution_notes,
    resolvedAt: row.resolved_at,
    resolvedBy: row.resolved_by,
  }));
}
