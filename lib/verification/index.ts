/**
 * Verification Module
 *
 * Exports for the physician credential verification system.
 */

// Types
export * from './types';

// Tier 1: Auto-verify
export { verifyCedulaMexico, compareCofeprisData, buildMexicoVerificationResult } from './cofepris';
export { verifyUSAMedicalLicense, compareStateBoardData, buildUSAVerificationResult, getStateBoardUrl } from './usaMedicalBoards';

// Tier 2: Semi-auto
export { verifyLinkedInProfile, isValidLinkedInUrl, extractLinkedInId, buildLinkedInVerificationResult } from './linkedinVerification';
export { verifyGoogleScholar, isValidScholarUrl, extractScholarId, buildScholarVerificationResult } from './scholarVerification';

// Main service
export {
  verifyPhysicianCredentials,
  getVerificationStatus,
  approveManualReview,
  rejectManualReview,
  getPendingManualReviews,
} from './verificationService';
