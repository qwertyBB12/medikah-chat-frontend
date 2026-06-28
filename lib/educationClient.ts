import type {
  EducationResponse,
  SaveEducationPayload,
} from './educationTypes';

/**
 * Canonical education client (Phase B2). Calls /api/physicians/[id]/education.
 * Mirrors the specialtyClient / mxCredentialClient fetch-wrapper conventions.
 */
export async function getEducation(
  physicianId: string
): Promise<{ success: boolean; data?: EducationResponse; error?: string }> {
  try {
    const response = await fetch(`/api/physicians/${physicianId}/education`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const json = await response.json();
    if (!response.ok) {
      return { success: false, error: json.error || 'Failed to fetch education' };
    }
    return { success: true, data: json as EducationResponse };
  } catch (err) {
    console.error('getEducation error:', err);
    return { success: false, error: 'Network error.' };
  }
}

export async function saveEducation(
  physicianId: string,
  payload: SaveEducationPayload
): Promise<{ success: boolean; credentialId?: string; error?: string }> {
  try {
    const response = await fetch(`/api/physicians/${physicianId}/education`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await response.json();
    if (!response.ok) {
      return { success: false, error: json.error || 'Failed to save education' };
    }
    return { success: true, credentialId: json.credentialId };
  } catch (err) {
    console.error('saveEducation error:', err);
    return { success: false, error: 'Network error.' };
  }
}

export async function deleteEducation(
  physicianId: string,
  credentialId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/physicians/${physicianId}/education`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credentialId }),
    });
    const json = await response.json();
    if (!response.ok) {
      return { success: false, error: json.error || 'Failed to delete education' };
    }
    return { success: true };
  } catch (err) {
    console.error('deleteEducation error:', err);
    return { success: false, error: 'Network error.' };
  }
}
