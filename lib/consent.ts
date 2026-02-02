import { supabase } from './supabase';
import { CONSENT_FORM_VERSION } from './consentContent';

export interface ConsentFormData {
  userId: string;
  language: string;
  checkboxes: Record<string, boolean>;
  recordingConsent: boolean | null;
}

export interface ConsentRecord extends ConsentFormData {
  id: string;
  formType: string;
  formVersion: string;
  ipAddress: string | null;
  userAgent: string | null;
  signedAt: string;
}

export async function saveConsentRecord(
  data: ConsentFormData,
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    // Graceful degradation when Supabase is not configured
    console.warn('Supabase not configured — consent record not persisted.');
    return { success: true };
  }

  const { error } = await supabase.from('consent_records').insert({
    user_id: data.userId,
    form_type: 'cross_border_ack',
    form_version: CONSENT_FORM_VERSION,
    language: data.language,
    checkboxes: data.checkboxes,
    recording_consent: data.recordingConsent,
    ip_address: null, // populated server-side or via header if needed
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
  });

  if (error) {
    console.error('Failed to save consent record:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function hasValidConsent(userId: string): Promise<boolean> {
  if (!supabase) {
    // If Supabase is not configured, skip consent check
    return false;
  }

  const { data, error } = await supabase
    .from('consent_records')
    .select('id')
    .eq('user_id', userId)
    .eq('form_type', 'cross_border_ack')
    .eq('form_version', CONSENT_FORM_VERSION)
    .limit(1);

  if (error) {
    console.error('Failed to check consent:', error);
    return false;
  }

  return Array.isArray(data) && data.length > 0;
}
