import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { supabaseAdmin } from '../../../../lib/supabaseServer';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Allowed document types (T-06-06: whitelist validation)
const ALLOWED_DOCUMENT_TYPES = ['ine_front', 'ine_back', 'diploma_front', 'diploma_back'] as const;
type AllowedDocumentType = typeof ALLOWED_DOCUMENT_TYPES[number];

function isAllowedDocumentType(type: string): type is AllowedDocumentType {
  return ALLOWED_DOCUMENT_TYPES.includes(type as AllowedDocumentType);
}

// 5MB max file size (T-06-09)
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Method guard
  if (!['POST', 'DELETE'].includes(req.method || '')) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth guard
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Database null check
  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  // Extract physician ID from route params
  const { id: physicianId } = req.query;
  if (!physicianId || typeof physicianId !== 'string' || !UUID_REGEX.test(physicianId)) {
    return res.status(400).json({ error: 'Invalid physician ID' });
  }

  // Ownership check: authenticated user must own this physician record
  const { data: physician, error: lookupError } = await supabaseAdmin
    .from('physicians')
    .select('id, email')
    .eq('id', physicianId)
    .single();

  if (lookupError || !physician) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (physician.email !== session.user.email.toLowerCase()) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    // ----------------------------------------------------------------
    // POST — upload a document to Supabase Storage
    // ----------------------------------------------------------------
    if (req.method === 'POST') {
      const { dataUrl, documentType, relatedCredentialId, fileName } = req.body as {
        dataUrl: string;
        documentType: string;
        relatedCredentialId?: string;
        fileName?: string;
      };

      // Validate documentType against whitelist (T-06-06)
      if (!documentType || !isAllowedDocumentType(documentType)) {
        return res.status(400).json({
          error: `documentType must be one of: ${ALLOWED_DOCUMENT_TYPES.join(', ')}`,
        });
      }

      // Validate dataUrl format (T-06-06)
      if (!dataUrl || typeof dataUrl !== 'string') {
        return res.status(400).json({ error: 'dataUrl is required' });
      }

      const match = dataUrl.match(
        /^data:(image\/(?:jpeg|png|webp)|application\/pdf);base64,(.+)$/
      );
      if (!match) {
        return res.status(400).json({
          error: 'Invalid dataUrl format. Supported: image/jpeg, image/png, image/webp, application/pdf',
        });
      }

      const mimeType = match[1];
      const base64Data = match[2];
      const buffer = Buffer.from(base64Data, 'base64');

      // Validate file size (T-06-09 — 5MB server-side check)
      if (buffer.length > MAX_FILE_SIZE_BYTES) {
        return res.status(400).json({
          error: `File too large. Maximum size is 5MB. Received: ${(buffer.length / 1024 / 1024).toFixed(2)}MB`,
        });
      }

      // Validate relatedCredentialId if provided
      if (relatedCredentialId && !UUID_REGEX.test(relatedCredentialId)) {
        return res.status(400).json({ error: 'relatedCredentialId must be a valid UUID' });
      }

      // Build storage path
      const safeFileName = fileName ? fileName.replace(/[^a-zA-Z0-9._-]/g, '_') : 'document';
      const storagePath = `${physicianId}/${documentType}/${Date.now()}_${safeFileName}`;

      // Check for existing document to delete (replace pattern)
      // For diploma docs, match by physician + documentType + relatedCredentialId
      // For INE docs, match by physician + documentType only
      let existingStoragePath: string | null = null;
      let existingDocId: string | null = null;

      if (documentType === 'diploma_front' || documentType === 'diploma_back') {
        if (relatedCredentialId) {
          const { data: existing } = await supabaseAdmin
            .from('physician_documents')
            .select('id, storage_path')
            .eq('physician_id', physicianId)
            .eq('document_type', documentType)
            .eq('related_credential_id', relatedCredentialId)
            .maybeSingle();

          if (existing) {
            existingStoragePath = existing.storage_path;
            existingDocId = existing.id;
          }
        }
      } else {
        // INE front/back — one per physician
        const { data: existing } = await supabaseAdmin
          .from('physician_documents')
          .select('id, storage_path')
          .eq('physician_id', physicianId)
          .eq('document_type', documentType)
          .maybeSingle();

        if (existing) {
          existingStoragePath = existing.storage_path;
          existingDocId = existing.id;
        }
      }

      // Delete old file from Storage if replacing
      if (existingStoragePath) {
        const { error: deleteStorageError } = await supabaseAdmin.storage
          .from('physician-docs')
          .remove([existingStoragePath]);

        if (deleteStorageError) {
          // Non-fatal — log and continue (storage may have already been cleaned)
          console.error('Failed to delete old document from storage:', deleteStorageError);
        }
      }

      // Upload new file to physician-docs bucket (T-06-07: private bucket, no public URL)
      const { error: uploadError } = await supabaseAdmin.storage
        .from('physician-docs')
        .upload(storagePath, buffer, { contentType: mimeType, upsert: true });

      if (uploadError) {
        console.error('Document upload failed:', uploadError);
        return res.status(500).json({ error: 'Failed to upload document' });
      }

      // Upsert physician_documents row
      let documentId: string;

      if (existingDocId) {
        // Update existing row
        const { data: updated, error: updateError } = await supabaseAdmin
          .from('physician_documents')
          .update({
            file_name: safeFileName,
            storage_path: storagePath,
            mime_type: mimeType,
            uploaded_at: new Date().toISOString(),
            verified: false,
            verified_at: null,
          })
          .eq('id', existingDocId)
          .select('id')
          .single();

        if (updateError || !updated) {
          console.error('physician_documents update failed:', updateError);
          return res.status(500).json({ error: 'Document uploaded but failed to record in database' });
        }

        documentId = updated.id;
      } else {
        // Insert new row
        const { data: inserted, error: insertError } = await supabaseAdmin
          .from('physician_documents')
          .insert({
            physician_id: physicianId,
            document_type: documentType,
            related_credential_id: relatedCredentialId || null,
            related_credential_table: relatedCredentialId ? 'physician_licenses' : null,
            file_name: safeFileName,
            storage_path: storagePath,
            mime_type: mimeType,
          })
          .select('id')
          .single();

        if (insertError || !inserted) {
          console.error('physician_documents insert failed:', insertError);
          return res.status(500).json({ error: 'Document uploaded but failed to record in database' });
        }

        documentId = inserted.id;
      }

      return res.status(201).json({ success: true, documentId });
    }

    // ----------------------------------------------------------------
    // DELETE — remove a document from Storage and physician_documents
    // ----------------------------------------------------------------
    if (req.method === 'DELETE') {
      const { documentId } = req.body as { documentId: string };

      if (!documentId || typeof documentId !== 'string' || !UUID_REGEX.test(documentId)) {
        return res.status(400).json({ error: 'documentId must be a valid UUID' });
      }

      // Verify document belongs to this physician
      const { data: doc, error: fetchError } = await supabaseAdmin
        .from('physician_documents')
        .select('id, physician_id, storage_path')
        .eq('id', documentId)
        .eq('physician_id', physicianId)
        .single();

      if (fetchError || !doc) {
        return res.status(403).json({ error: 'Document not found or forbidden' });
      }

      // Delete from Supabase Storage (T-06-07: private PHI storage)
      const { error: storageDeleteError } = await supabaseAdmin.storage
        .from('physician-docs')
        .remove([doc.storage_path]);

      if (storageDeleteError) {
        console.error('Failed to delete from storage:', storageDeleteError);
        // Non-fatal — continue to delete DB row
      }

      // Delete physician_documents row
      const { error: dbDeleteError } = await supabaseAdmin
        .from('physician_documents')
        .delete()
        .eq('id', documentId)
        .eq('physician_id', physicianId);

      if (dbDeleteError) {
        console.error('physician_documents delete failed:', dbDeleteError);
        return res.status(500).json({ error: 'Failed to delete document record' });
      }

      return res.status(200).json({ success: true });
    }
  } catch (err) {
    console.error('Documents handler exception:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Allow larger body for base64-encoded files (T-06-09: 5MB file + base64 overhead)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '6mb',
    },
  },
};
