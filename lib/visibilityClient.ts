import type { ProfileVisibility, VisibilityResponse } from './visibilityTypes';

/**
 * Profile-visibility client (Phase B2). Calls /api/physicians/[id]/profile-visibility.
 */
export async function getVisibility(
  physicianId: string
): Promise<{ success: boolean; data?: VisibilityResponse; error?: string }> {
  try {
    const response = await fetch(
      `/api/physicians/${physicianId}/profile-visibility`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } }
    );
    const json = await response.json();
    if (!response.ok) {
      return { success: false, error: json.error || 'Failed to fetch visibility' };
    }
    return { success: true, data: json as VisibilityResponse };
  } catch (err) {
    console.error('getVisibility error:', err);
    return { success: false, error: 'Network error.' };
  }
}

export async function saveVisibility(
  physicianId: string,
  toggles: ProfileVisibility
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `/api/physicians/${physicianId}/profile-visibility`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toggles }),
      }
    );
    const json = await response.json();
    if (!response.ok) {
      return { success: false, error: json.error || 'Failed to save visibility' };
    }
    return { success: true };
  } catch (err) {
    console.error('saveVisibility error:', err);
    return { success: false, error: 'Network error.' };
  }
}
