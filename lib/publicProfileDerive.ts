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
