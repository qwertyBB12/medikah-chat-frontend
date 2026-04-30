/**
 * practikahDisclaimer.ts
 *
 * WEB-16: State-licensure disclaimer auto-generated from physician credentials.
 *
 * Tone reference: components/landing/RegulatoryDisclosure.tsx (FROZEN — DO NOT MODIFY).
 * This file follows the same tone: bilingual, fact-stating, no medical claims, no
 * marketing language. Legal-safe.
 *
 * COUNSEL REVIEW FLAG (T-12-06-08):
 * The disclaimer copy in this file is implementation-shape correct and tone-consistent
 * with existing counsel-reviewed disclosure patterns. However, this specific copy has
 * NOT yet been reviewed by counsel. A legal sign-off review is required before public
 * launch. Copy may be edited post-counsel without re-architecting — the function
 * signature and branching logic are stable.
 *
 * Branches:
 *  - country = 'US' → lists licensed states (array or primary_state fallback)
 *  - country = 'MX' → references SEP Cédula Profesional, optional cédula state
 *  - default → generic LatAm/other
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PhysicianDisclaimerInput {
  country?: string | null;
  /** US: array of 2-letter state codes e.g. ['CA', 'TX'] */
  licensedStates?: string[] | null;
  primaryState?: string | null;
  /** MX: state where Cédula Profesional is registered */
  cedulaState?: string | null;
}

// ---------------------------------------------------------------------------
// buildLicensureDisclaimer — WEB-16
// ---------------------------------------------------------------------------

/**
 * Generate a bilingual state-licensure disclaimer from physician credentials.
 *
 * Returns a single string suitable for rendering in StateLicensureDisclaimer.tsx.
 * All copy is fact-stating and avoids medical advice language per governance.
 */
export function buildLicensureDisclaimer(
  input: PhysicianDisclaimerInput,
  lang: 'en' | 'es',
): string {
  const country = (input.country || '').toUpperCase().trim();

  // ── United States ─────────────────────────────────────────────────────────
  if (country === 'US') {
    const stateList =
      input.licensedStates && input.licensedStates.length > 0
        ? input.licensedStates.join(', ')
        : (input.primaryState || '');

    if (lang === 'es') {
      return stateList
        ? `Este profesional está autorizado para ejercer la medicina en los siguientes estados de EE. UU.: ${stateList}. Esta información no constituye consejo médico ni establece una relación médico-paciente.`
        : `Este profesional está autorizado para ejercer la medicina en los Estados Unidos. Esta información no constituye consejo médico ni establece una relación médico-paciente.`;
    }
    return stateList
      ? `This physician is licensed to practice medicine in the following U.S. states: ${stateList}. This information does not constitute medical advice nor establish a doctor-patient relationship.`
      : `This physician is licensed to practice medicine in the United States. This information does not constitute medical advice nor establish a doctor-patient relationship.`;
  }

  // ── Mexico ────────────────────────────────────────────────────────────────
  if (country === 'MX') {
    const cedulaState = input.cedulaState || input.primaryState || '';

    if (lang === 'es') {
      return cedulaState
        ? `Este profesional está registrado ante la Secretaría de Educación Pública (SEP) y autorizado para ejercer la medicina en México (Cédula Profesional vigente en ${cedulaState}). Esta información no constituye consejo médico ni establece una relación médico-paciente.`
        : `Este profesional está registrado ante la SEP y autorizado para ejercer la medicina en México. Esta información no constituye consejo médico ni establece una relación médico-paciente.`;
    }
    return cedulaState
      ? `This physician is registered with Mexico's Secretaría de Educación Pública (SEP) and licensed to practice medicine in Mexico (Cédula Profesional registered in ${cedulaState}). This information does not constitute medical advice nor establish a doctor-patient relationship.`
      : `This physician is registered with Mexico's SEP and licensed to practice medicine in Mexico. This information does not constitute medical advice nor establish a doctor-patient relationship.`;
  }

  // ── Default: generic LatAm / other Americas ───────────────────────────────
  return lang === 'es'
    ? `Este profesional está autorizado para ejercer la medicina en su país de práctica. Esta información no constituye consejo médico ni establece una relación médico-paciente.`
    : `This physician is licensed to practice medicine in their country of practice. This information does not constitute medical advice nor establish a doctor-patient relationship.`;
}
