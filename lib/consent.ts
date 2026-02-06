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
  try {
    const response = await fetch('/api/consent/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: data.userId,
        language: data.language,
        checkboxes: data.checkboxes,
        recordingConsent: data.recordingConsent,
        formVersion: CONSENT_FORM_VERSION,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Failed to save consent record:', result.error);
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (err) {
    console.error('Consent save network error:', err);
    return { success: false, error: 'Network error saving consent.' };
  }
}

export async function hasValidConsent(userId: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`/api/consent/check?userId=${encodeURIComponent(userId)}`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return false;
    }

    const result = await response.json();
    return result.hasConsent === true;
  } catch (err) {
    console.error('Consent check error:', err);
    return false;
  }
}
