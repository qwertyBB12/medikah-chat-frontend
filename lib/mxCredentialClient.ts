import type {
  SaveMXCredentialPayload,
  DeleteMXCredentialPayload,
  MXCredentialResponse,
} from './mxCredentialTypes';

/**
 * Fetch all MX credentials for a physician.
 * Calls GET /api/physicians/[physicianId]/mx-credentials
 */
export async function getMXCredentials(
  physicianId: string
): Promise<{ success: boolean; data?: MXCredentialResponse; error?: string }> {
  try {
    const response = await fetch(`/api/physicians/${physicianId}/mx-credentials`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const json = await response.json();

    if (!response.ok) {
      return { success: false, error: json.error || 'Failed to fetch MX credentials' };
    }

    return { success: true, data: json as MXCredentialResponse };
  } catch (err) {
    console.error('getMXCredentials error:', err);
    return { success: false, error: 'Network error.' };
  }
}

/**
 * Save (insert or update) a MX credential entry.
 * Calls POST /api/physicians/[physicianId]/mx-credentials
 */
export async function saveMXCredential(
  physicianId: string,
  payload: SaveMXCredentialPayload
): Promise<{ success: boolean; credentialId?: string; error?: string }> {
  try {
    const response = await fetch(`/api/physicians/${physicianId}/mx-credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = await response.json();

    if (!response.ok) {
      return { success: false, error: json.error || 'Failed to save MX credential' };
    }

    return { success: true, credentialId: json.credentialId };
  } catch (err) {
    console.error('saveMXCredential error:', err);
    return { success: false, error: 'Network error.' };
  }
}

/**
 * Delete a MX credential entry by ID.
 * Calls DELETE /api/physicians/[physicianId]/mx-credentials
 */
export async function deleteMXCredential(
  physicianId: string,
  payload: DeleteMXCredentialPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/physicians/${physicianId}/mx-credentials`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = await response.json();

    if (!response.ok) {
      return { success: false, error: json.error || 'Failed to delete MX credential' };
    }

    return { success: true };
  } catch (err) {
    console.error('deleteMXCredential error:', err);
    return { success: false, error: 'Network error.' };
  }
}

/**
 * Save the physician's CURP number (identity section).
 * Calls POST /api/physicians/[physicianId]/mx-credentials with section='identity'
 */
export async function saveCURP(
  physicianId: string,
  curp: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/physicians/${physicianId}/mx-credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section: 'identity', data: { curp } }),
    });

    const json = await response.json();

    if (!response.ok) {
      return { success: false, error: json.error || 'Failed to save CURP' };
    }

    return { success: true };
  } catch (err) {
    console.error('saveCURP error:', err);
    return { success: false, error: 'Network error.' };
  }
}

/**
 * Upload a physician document (INE front/back, diploma front/back).
 * Calls POST /api/physicians/[physicianId]/documents
 *
 * @param physicianId - The physician's UUID
 * @param params.dataUrl - Base64 data URL (e.g., data:image/jpeg;base64,...)
 * @param params.documentType - One of: 'ine_front' | 'ine_back' | 'diploma_front' | 'diploma_back'
 * @param params.relatedCredentialId - UUID of the related credential (for diplomas, links to physician_licenses.id)
 * @param params.fileName - Original filename for storage metadata
 */
export async function uploadDocument(
  physicianId: string,
  params: {
    dataUrl: string;
    documentType: 'ine_front' | 'ine_back' | 'diploma_front' | 'diploma_back';
    relatedCredentialId?: string;
    fileName?: string;
  }
): Promise<{ success: boolean; documentId?: string; error?: string }> {
  try {
    const response = await fetch(`/api/physicians/${physicianId}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const json = await response.json();

    if (!response.ok) {
      return { success: false, error: json.error || 'Failed to upload document' };
    }

    return { success: true, documentId: json.documentId };
  } catch (err) {
    console.error('uploadDocument error:', err);
    return { success: false, error: 'Network error.' };
  }
}

/**
 * Delete a physician document by ID.
 * Calls DELETE /api/physicians/[physicianId]/documents
 */
export async function deleteDocument(
  physicianId: string,
  documentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/physicians/${physicianId}/documents`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId }),
    });

    const json = await response.json();

    if (!response.ok) {
      return { success: false, error: json.error || 'Failed to delete document' };
    }

    return { success: true };
  } catch (err) {
    console.error('deleteDocument error:', err);
    return { success: false, error: 'Network error.' };
  }
}

/**
 * Trigger a SEP cédula lookup for a physician's credential.
 * Calls POST /api/physicians/[physicianId]/sep-lookup
 *
 * @param physicianId - The physician's UUID
 * @param cedulaNumber - The cédula number to look up
 * @param cedulaType - 'cedula_profesional' or 'cedula_especialidad'
 */
export async function triggerSEPLookup(
  physicianId: string,
  cedulaNumber: string,
  cedulaType: 'cedula_profesional' | 'cedula_especialidad'
): Promise<{
  success: boolean;
  data?: {
    verificationStatus: string;
    sepData?: {
      fullName?: string;
      titulo?: string;
      institucion?: string;
      anioRegistro?: string;
    };
  };
  error?: string;
}> {
  try {
    const response = await fetch(`/api/physicians/${physicianId}/sep-lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cedulaNumber, cedulaType }),
    });

    const json = await response.json();

    if (!response.ok) {
      return { success: false, error: json.error || 'SEP lookup failed' };
    }

    return { success: true, data: json };
  } catch (err) {
    console.error('triggerSEPLookup error:', err);
    return { success: false, error: 'Network error.' };
  }
}
