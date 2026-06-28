/**
 * Derive-at-read for the public profile (Phase B2).
 *
 * The public page /dr/[slug] reads canonical specialty + education and the
 * per-field visibility toggles, instead of the flat physicians columns. A field
 * shows iff its toggle is on AND the underlying row is verified (spec §5). Board
 * certifications have no canonical store yet, so they stay flat and are gated by
 * the certifications toggle alone (deriving them would regress already-verified
 * profiles whose flat board certs were never migrated).
 *
 * No-regression invariant (the reason this is a pure, tested function): an
 * already-verified physician had their specialty/education backfilled as verified
 * (migrations 033/035) and every toggle defaults on, so the derived output is
 * identical to the prior flat-column render. The tests pin that invariant.
 */
import type { ProfileVisibility } from './visibilityTypes';

export interface DeriveSpecialtyRow {
  name: string;
  role: string; // 'primary' | 'subspecialty'
  verification_status: string;
}

export interface DeriveEducationRow {
  kind: string; // 'medical_school' | 'residency' | 'fellowship'
  institution: string;
  country: string | null;
  specialty: string | null;
  start_year: number | null;
  end_year: number | null;
  verification_status: string;
}

export interface BoardCertification {
  board: string;
  certification: string;
  year?: number;
}

export interface TrainingEntry {
  institution: string;
  specialty: string;
  startYear: number;
  endYear: number;
}

export interface DerivedPublicProfile {
  primarySpecialty: string | null;
  subSpecialties: string[];
  medicalSchool: string | null;
  medicalSchoolCountry: string | null;
  graduationYear: number | null;
  residency: TrainingEntry[];
  fellowships: TrainingEntry[];
  boardCertifications: BoardCertification[];
}

export interface DerivedContact {
  officeAddress: string | null;
  officeCity: string | null;
  officeCountry: string | null;
  officePhone: string | null;
  officeEmail: string | null;
  appointmentUrl: string | null;
}

const isVerified = (s: string) => s === 'verified';

export function derivePublicProfile(input: {
  specialties: DeriveSpecialtyRow[];
  education: DeriveEducationRow[];
  toggles: ProfileVisibility;
  flatBoardCertifications: BoardCertification[];
}): DerivedPublicProfile {
  const { specialties, education, toggles, flatBoardCertifications } = input;

  const verifiedPrimary = specialties.find(
    (s) => s.role === 'primary' && isVerified(s.verification_status)
  );
  const primarySpecialty = toggles.specialty && verifiedPrimary ? verifiedPrimary.name : null;
  const subSpecialties = toggles.subspecialties
    ? specialties
        .filter((s) => s.role === 'subspecialty' && isVerified(s.verification_status))
        .map((s) => s.name)
    : [];

  const verifiedSchool = education.find(
    (e) => e.kind === 'medical_school' && isVerified(e.verification_status)
  );
  const showSchool = toggles.medicalSchool && !!verifiedSchool;

  const mapTraining = (kind: string, toggleOn: boolean): TrainingEntry[] =>
    toggleOn
      ? education
          .filter((e) => e.kind === kind && isVerified(e.verification_status))
          .map((e) => ({
            institution: e.institution,
            specialty: e.specialty || '',
            startYear: e.start_year || 0,
            endYear: e.end_year || 0,
          }))
      : [];

  return {
    primarySpecialty,
    subSpecialties,
    medicalSchool: showSchool ? verifiedSchool!.institution : null,
    medicalSchoolCountry: showSchool ? verifiedSchool!.country || null : null,
    graduationYear: showSchool ? verifiedSchool!.end_year || null : null,
    residency: mapTraining('residency', toggles.residency),
    fellowships: mapTraining('fellowship', toggles.fellowships),
    boardCertifications: toggles.certifications ? flatBoardCertifications : [],
  };
}

/**
 * Derive the public Location & Contact block (Annotation #9).
 *
 * Source-of-truth split (decided with Hector 2026-06-28): office address +
 * phone are canonical in Credentials (physicians.practice_address_* /
 * phone_number, edited in ContactInfoSection); office email + appointment URL
 * are booking/presentation and stay in the website store (physician_website).
 * Contact is self-declared, NOT a verified credential, so every field is gated
 * by its visibility toggle alone — no verification gate (unlike specialty/
 * education above).
 */
export function deriveContact(input: {
  practiceAddressLine1: string | null;
  practiceAddressCity: string | null;
  practiceAddressCountry: string | null;
  phoneNumber: string | null;
  officeEmail: string | null;
  appointmentUrl: string | null;
  toggles: ProfileVisibility;
}): DerivedContact {
  const { toggles } = input;
  const showAddress = toggles.officeAddress;
  return {
    officeAddress: showAddress ? input.practiceAddressLine1 || null : null,
    officeCity: showAddress ? input.practiceAddressCity || null : null,
    officeCountry: showAddress ? input.practiceAddressCountry || null : null,
    officePhone: toggles.phone ? input.phoneNumber || null : null,
    officeEmail: toggles.officeEmail ? input.officeEmail || null : null,
    appointmentUrl: toggles.appointmentUrl ? input.appointmentUrl || null : null,
  };
}
