/**
 * Physician Onboarding Utilities
 *
 * Phase definitions, validation helpers, and translation references
 * for the /doctor/onboard conversational onboarding flow.
 */

import { SupportedLang } from './i18n';

/**
 * The 7 phases of physician onboarding.
 * Maps to the phases in PhysicianOnboardingAgent.
 */
export const ONBOARDING_PHASE_ORDER = [
  'briefing',
  'identity',
  'licensing',
  'specialty',
  'education',
  'intellectual',
  'presence',
  'confirmation',
] as const;

export type OnboardingPhase = (typeof ONBOARDING_PHASE_ORDER)[number];

/**
 * Page-level translations for the /doctor/onboard page.
 * Agent-level translations are in physicianOnboardingContent.ts.
 */
export const pageTranslations: Record<
  SupportedLang,
  {
    pageTitle: string;
    headerTitle: string;
    headerSubtitle: string;
    inputPlaceholder: string;
    inputPlaceholderDisabled: string;
    sendButton: string;
    enterHint: string;
    loadingMessage: string;
    completionTitle: string;
    completionRefId: string;
    completionMessage: string;
    dashboardButton: string;
    homeButton: string;
    langToggle: string;
  }
> = {
  en: {
    pageTitle: 'Join the Physician Network — Medikah',
    headerTitle: 'Physician Network',
    headerSubtitle: 'Join the first credentialed physician network across the Americas',
    inputPlaceholder: 'Type your response...',
    inputPlaceholderDisabled: '',
    sendButton: 'Send',
    enterHint: 'Press Enter to send. Shift+Enter for a new line.',
    loadingMessage: 'Starting your onboarding conversation...',
    completionTitle: 'Registration Complete',
    completionRefId: 'Reference ID: ',
    completionMessage: 'Our team will review your credentials and be in touch within 48-72 hours.',
    dashboardButton: 'Go to Dashboard',
    homeButton: 'Return to Homepage',
    langToggle: 'ES',
  },
  es: {
    pageTitle: 'Únete a la Red de Médicos — Medikah',
    headerTitle: 'Red de Médicos',
    headerSubtitle: 'Únase a la primera red de médicos acreditados de las Américas',
    inputPlaceholder: 'Escriba su respuesta...',
    inputPlaceholderDisabled: '',
    sendButton: 'Enviar',
    enterHint: 'Presione Enter para enviar. Shift+Enter para nueva línea.',
    loadingMessage: 'Iniciando su conversación de registro...',
    completionTitle: 'Registro Completo',
    completionRefId: 'ID de Referencia: ',
    completionMessage: 'Nuestro equipo revisará sus credenciales y se pondrá en contacto dentro de 48-72 horas.',
    dashboardButton: 'Ir al Panel',
    homeButton: 'Volver al Inicio',
    langToggle: 'EN',
  },
};

/**
 * Validate required fields before submission.
 * Returns an array of missing field names.
 */
export function validateOnboardingData(data: {
  fullName?: string;
  email?: string;
  licenses?: unknown[];
}): string[] {
  const missing: string[] = [];
  if (!data.fullName || data.fullName.length < 3) missing.push('fullName');
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
    missing.push('email');
  if (!data.licenses || data.licenses.length === 0) missing.push('licenses');
  return missing;
}
