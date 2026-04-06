import type {
  SaveCredentialPayload,
  DeleteCredentialPayload,
  CredentialResponse,
} from './credentialTypes';

/**
 * Fetch all US credentials for a physician.
 * Calls GET /api/physicians/[physicianId]/credentials
 */
export async function getCredentials(
  physicianId: string
): Promise<{ success: boolean; data?: CredentialResponse; error?: string }> {
  try {
    const response = await fetch(`/api/physicians/${physicianId}/credentials`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const json = await response.json();

    if (!response.ok) {
      return { success: false, error: json.error || 'Failed to fetch credentials' };
    }

    return { success: true, data: json as CredentialResponse };
  } catch (err) {
    console.error('getCredentials error:', err);
    return { success: false, error: 'Network error.' };
  }
}

/**
 * Save (insert or update) a US credential entry.
 * Calls POST /api/physicians/[physicianId]/credentials
 */
export async function saveCredential(
  physicianId: string,
  payload: SaveCredentialPayload
): Promise<{ success: boolean; credentialId?: string; error?: string }> {
  try {
    const response = await fetch(`/api/physicians/${physicianId}/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = await response.json();

    if (!response.ok) {
      return { success: false, error: json.error || 'Failed to save credential' };
    }

    return { success: true, credentialId: json.credentialId };
  } catch (err) {
    console.error('saveCredential error:', err);
    return { success: false, error: 'Network error.' };
  }
}

/**
 * Delete a US credential entry by ID.
 * Calls DELETE /api/physicians/[physicianId]/credentials
 */
export async function deleteCredential(
  physicianId: string,
  payload: DeleteCredentialPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/physicians/${physicianId}/credentials`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = await response.json();

    if (!response.ok) {
      return { success: false, error: json.error || 'Failed to delete credential' };
    }

    return { success: true };
  } catch (err) {
    console.error('deleteCredential error:', err);
    return { success: false, error: 'Network error.' };
  }
}
