/**
 * Canonical specialty types (Phase B1 — source-of-truth refactor).
 *
 * physician_specialties is the ONE place a physician's primary specialty and
 * subspecialties live (Dr. Aguirre annotations 2/3/7). Board certification is an
 * attribute of a specialty row, not a separate list. The profile card and the
 * public page read from here; public display is gated by verification (spec §5).
 */
export type SpecialtyRole = 'primary' | 'subspecialty';
export type SpecialtyVerificationStatus = 'verified' | 'manual_review' | 'pending';
export type SpecialtyVerificationSource =
  | 'npi_registry' | 'sep_cedula' | 'admin' | 'migration' | null;

export interface PhysicianSpecialty {
  id?: string;
  country: 'US' | 'MX';
  name: string;
  role: SpecialtyRole;
  boardCertified: boolean;
  certifyingBoard?: string; // only when boardCertified
  expirationYear?: number; // only when boardCertified
  verificationStatus: SpecialtyVerificationStatus;
  verificationSource?: SpecialtyVerificationSource;
  verifiedAt?: string;
}

export interface SpecialtiesResponse {
  specialties: PhysicianSpecialty[];
}

export interface SaveSpecialtyPayload {
  specialty: PhysicianSpecialty;
}

/**
 * Spec §5 public gate: a specialty is shown to patients iff its visibility
 * toggle is on AND it is verified. Nothing self-declared shows unconfirmed.
 */
export function isPubliclyVisibleSpecialty(
  s: PhysicianSpecialty,
  toggleOn: boolean
): boolean {
  return toggleOn && s.verificationStatus === 'verified';
}
