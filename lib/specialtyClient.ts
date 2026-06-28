import type {
  SpecialtiesResponse,
  SaveSpecialtyPayload,
} from './specialtyTypes';

/**
 * Canonical specialty client (Phase B1). Calls /api/physicians/[id]/specialties.
 * Mirrors the mxCredentialClient fetch-wrapper conventions.
 */
export async function getSpecialties(
  physicianId: string
): Promise<{ success: boolean; data?: SpecialtiesResponse; error?: string }> {
  try {
    const response = await fetch(`/api/physicians/${physicianId}/specialties`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const json = await response.json();
    if (!response.ok) {
      return { success: false, error: json.error || 'Failed to fetch specialties' };
    }
    return { success: true, data: json as SpecialtiesResponse };
  } catch (err) {
    console.error('getSpecialties error:', err);
    return { success: false, error: 'Network error.' };
  }
}

export async function saveSpecialty(
  physicianId: string,
  payload: SaveSpecialtyPayload
): Promise<{ success: boolean; credentialId?: string; error?: string }> {
  try {
    const response = await fetch(`/api/physicians/${physicianId}/specialties`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await response.json();
    if (!response.ok) {
      return { success: false, error: json.error || 'Failed to save specialty' };
    }
    return { success: true, credentialId: json.credentialId };
  } catch (err) {
    console.error('saveSpecialty error:', err);
    return { success: false, error: 'Network error.' };
  }
}

export async function deleteSpecialty(
  physicianId: string,
  credentialId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/physicians/${physicianId}/specialties`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credentialId }),
    });
    const json = await response.json();
    if (!response.ok) {
      return { success: false, error: json.error || 'Failed to delete specialty' };
    }
    return { success: true };
  } catch (err) {
    console.error('deleteSpecialty error:', err);
    return { success: false, error: 'Network error.' };
  }
}
