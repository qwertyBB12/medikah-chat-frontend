/**
 * Canonical education types (Phase B2 — source-of-truth refactor).
 *
 * physician_education is the ONE place a physician's training history lives:
 * medical school (single), residencies, and fellowships. Board certification is
 * NOT here — it is an attribute of a specialty row in physician_specialties
 * (Phase B1). Education was previously captured ONLY in the Public-Profile
 * EducationEditor; this gives it a canonical home in Credentials so the Public
 * Profile can become a visibility layer (derive-at-read).
 *
 * A row's `kind` discriminates the three shapes:
 *   - medical_school: institution + country + endYear (graduation year)
 *   - residency / fellowship: institution + specialty + startYear + endYear
 *
 * Verification mirrors specialties: education has no automated source, so new
 * rows start unverified and are confirmed by an admin (spec §5). The profile
 * card and the public page read from here; public display is gated by
 * verification AND the per-field visibility toggle.
 */
export type EducationKind = 'medical_school' | 'residency' | 'fellowship';
export type EducationVerificationStatus = 'verified' | 'manual_review' | 'pending';
export type EducationVerificationSource = 'admin' | 'migration' | null;

export interface PhysicianEducation {
  id?: string;
  kind: EducationKind;
  institution: string;
  country?: string; // medical_school: country of the medical school
  specialty?: string; // residency / fellowship
  startYear?: number; // residency / fellowship
  endYear?: number; // medical_school: graduation year; otherwise completion year
  verificationStatus: EducationVerificationStatus;
  verificationSource?: EducationVerificationSource;
  verifiedAt?: string;
}

export interface EducationResponse {
  education: PhysicianEducation[];
}

export interface SaveEducationPayload {
  education: PhysicianEducation;
}

/**
 * Spec §5 public gate: an education entry is shown to patients iff its
 * visibility toggle is on AND it is verified. Nothing self-declared shows
 * unconfirmed.
 */
export function isPubliclyVisibleEducation(
  e: PhysicianEducation,
  toggleOn: boolean
): boolean {
  return toggleOn && e.verificationStatus === 'verified';
}
