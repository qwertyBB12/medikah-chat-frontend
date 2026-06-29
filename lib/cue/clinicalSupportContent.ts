/**
 * lib/cue/clinicalSupportContent.ts — bilingual presentation copy for the Cue
 * clinical DECISION-SUPPORT card + the input-side PHI/anonymization notice.
 *
 * NAMING / LEGAL (Hector, 2026-06-29): this surface is NEVER named or framed as a
 * "diagnosis" — it is a doctor decision-SUPPORT tool presenting ranked clinical
 * CONSIDERATIONS to weigh. The on-card DISCLAIMER text is intentionally NOT here:
 * it travels IN the card payload from the backend (single source of truth, so
 * counsel reviews/localizes one string). This module holds only the static labels
 * + the always-visible PHI notice that trains physicians to de-identify input.
 *
 * NOT in lib/legal/* (that tree is generated, do-not-hand-edit).
 */

export type CueLocale = 'en' | 'es';

export interface ClinicalSupportCopy {
  /** Card eyebrow/title — NEVER "diagnosis". */
  title: string;
  /** Section heading for the ranked list of considerations. */
  considerations: string;
  /** Section heading for the red-flags list. */
  redFlags: string;
  /** Inline labels for each consideration. */
  rationale: string;
  distinguishing: string;
  /** Confidence chip labels keyed by the backend's HIGH/MODERATE/LOW token. */
  confidence: Record<'HIGH' | 'MODERATE' | 'LOW', string>;
  /** Always-visible input notice — trains de-identification (PHI hygiene). */
  phiNotice: string;
  /** Slice-3 export actions + transient states. */
  emailAction: string;
  pdfAction: string;
  emailSending: string;
  emailSent: string;
  emailFailed: string;
  popupBlocked: string;
}

export const CLINICAL_SUPPORT_COPY: Record<CueLocale, ClinicalSupportCopy> = {
  en: {
    title: 'Clinical decision support',
    considerations: 'Considerations to weigh',
    redFlags: 'Red flags',
    rationale: 'Rationale',
    distinguishing: 'Distinguishing',
    confidence: { HIGH: 'High', MODERATE: 'Moderate', LOW: 'Low' },
    phiNotice:
      'De-identified information only — no names or identifiers. You’re responsible for anonymizing before sending.',
    emailAction: 'Email to me',
    pdfAction: 'Save as PDF',
    emailSending: 'Sending…',
    emailSent: 'Sent to your Medikah inbox',
    emailFailed: 'Couldn’t send — try again',
    popupBlocked: 'Allow pop-ups to save as PDF',
  },
  es: {
    title: 'Apoyo a la decisión clínica',
    considerations: 'Consideraciones a evaluar',
    redFlags: 'Señales de alarma',
    rationale: 'Fundamento',
    distinguishing: 'Distinción',
    confidence: { HIGH: 'Alta', MODERATE: 'Moderada', LOW: 'Baja' },
    phiNotice:
      'Solo información anonimizada — sin nombres ni identificadores. Usted es responsable de anonimizar antes de enviar.',
    emailAction: 'Enviar a mi correo',
    pdfAction: 'Guardar PDF',
    emailSending: 'Enviando…',
    emailSent: 'Enviado a tu bandeja Medikah',
    emailFailed: 'No se pudo enviar — inténtalo de nuevo',
    popupBlocked: 'Permite ventanas emergentes para guardar el PDF',
  },
};

/** Map a backend confidence token to its localized chip label (fallback: as-is). */
export function confidenceLabel(locale: CueLocale, confidence: string): string {
  const key = (confidence?.toUpperCase?.() ?? '') as 'HIGH' | 'MODERATE' | 'LOW';
  return CLINICAL_SUPPORT_COPY[locale].confidence[key] ?? confidence;
}
