/**
 * Public-profile visibility toggles (Phase B2 — Dr. Aguirre annotations 7/9).
 *
 * Public Profile is a visibility layer: the physician chooses which canonical
 * credential/contact facts patients see on /dr/[slug]. Mirrors the jsonb shape
 * of physician_profile_visibility.toggles. A field is shown publicly iff its
 * toggle is on AND the underlying data is verified (see isPubliclyVisibleSpecialty).
 */
export interface ProfileVisibility {
  specialty: boolean;
  subspecialties: boolean;
  medicalSchool: boolean;
  residency: boolean;
  fellowships: boolean;
  certifications: boolean;
  officeAddress: boolean;
  phone: boolean;
  officeEmail: boolean;
  appointmentUrl: boolean;
}

export type VisibilityKey = keyof ProfileVisibility;

export const DEFAULT_VISIBILITY: ProfileVisibility = {
  specialty: true,
  subspecialties: true,
  medicalSchool: true,
  residency: true,
  fellowships: true,
  certifications: true,
  officeAddress: true,
  phone: true,
  officeEmail: true,
  appointmentUrl: true,
};

export interface VisibilityResponse {
  toggles: ProfileVisibility;
}

/** Merge a partial/unknown jsonb blob over the defaults (forward/backward safe). */
export function normalizeVisibility(raw: unknown): ProfileVisibility {
  const out: ProfileVisibility = { ...DEFAULT_VISIBILITY };
  if (raw && typeof raw === 'object') {
    for (const key of Object.keys(DEFAULT_VISIBILITY) as VisibilityKey[]) {
      const v = (raw as Record<string, unknown>)[key];
      if (typeof v === 'boolean') out[key] = v;
    }
  }
  return out;
}
