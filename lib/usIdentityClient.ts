/**
 * US identity client — Aguirre credentialing change 4.
 * Calls /api/physicians/[id]/us-identity for the State ID / Driver License scalars.
 * Document uploads reuse uploadDocument/deleteDocument (mxCredentialClient) with
 * the us_id_front / us_id_back document types.
 */
import type { USIdentity, SaveUSIdentityField } from './usIdentityTypes';

export async function getUSIdentity(
  physicianId: string
): Promise<{ success: boolean; data?: USIdentity; error?: string }> {
  try {
    const response = await fetch(`/api/physicians/${physicianId}/us-identity`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const json = await response.json();
    if (!response.ok) {
      return { success: false, error: json.error || 'Failed to fetch US identity' };
    }
    return { success: true, data: json as USIdentity };
  } catch (err) {
    console.error('getUSIdentity error:', err);
    return { success: false, error: 'Network error.' };
  }
}

export async function saveUSIdentityField(
  physicianId: string,
  payload: SaveUSIdentityField
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/physicians/${physicianId}/us-identity`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await response.json();
    if (!response.ok) {
      return { success: false, error: json.error || 'Failed to save US identity' };
    }
    return { success: true };
  } catch (err) {
    console.error('saveUSIdentityField error:', err);
    return { success: false, error: 'Network error.' };
  }
}
