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
    console.warn('Supabase not configured — consent record not persisted.');
    return { success: true };
  }

  try {
    const { error } = await supabase.from('consent_records').insert({
      user_id: data.userId,
      form_type: 'cross_border_ack',
      form_version: CONSENT_FORM_VERSION,
      language: data.language,
      checkboxes: data.checkboxes,
      recording_consent: data.recordingConsent,
      ip_address: null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    });

    if (error) {
      console.error('Failed to save consent record:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Consent save network error:', err);
    return { success: false, error: 'Network error saving consent.' };
  }
}

export async function hasValidConsent(userId: string): Promise<boolean> {
  if (!supabase) {
    return false;
  }

  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Consent check timed out')), 5000),
    );

    const query = supabase
      .from('consent_records')
      .select('id')
      .eq('user_id', userId)
      .eq('form_type', 'cross_border_ack')
      .eq('form_version', CONSENT_FORM_VERSION)
      .limit(1);

    const { data, error } = await Promise.race([query, timeout]);

    if (error) {
      console.error('Failed to check consent:', error);
      return false;
    }

    return Array.isArray(data) && data.length > 0;
  } catch (err) {
    console.error('Consent check network error:', err);
    return false;
  }
}
