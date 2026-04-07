import type { ContactInfo, SaveContactPayload } from './contactTypes';

/**
 * Fetch all contact info for a physician.
 * Calls GET /api/physicians/[physicianId]/contact
 */
export async function getContactInfo(
  physicianId: string
): Promise<{ success: boolean; data?: Partial<ContactInfo>; error?: string }> {
  try {
    const response = await fetch(`/api/physicians/${physicianId}/contact`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const json = await response.json();

    if (!response.ok) {
      return { success: false, error: json.error || 'Failed to fetch contact info' };
    }

    return { success: true, data: json as Partial<ContactInfo> };
  } catch (err) {
    console.error('getContactInfo error:', err);
    return { success: false, error: 'Network error.' };
  }
}

/**
 * Save a single contact field for a physician.
 * Calls PUT /api/physicians/[physicianId]/contact
 */
export async function saveContactField(
  physicianId: string,
  payload: SaveContactPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/physicians/${physicianId}/contact`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = await response.json();

    if (!response.ok) {
      return { success: false, error: json.error || 'Failed to save contact info' };
    }

    return { success: true };
  } catch (err) {
    console.error('saveContactField error:', err);
    return { success: false, error: 'Network error.' };
  }
}
