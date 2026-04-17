import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminUser } from '../../../../lib/adminAuth';
import { supabaseAdmin } from '../../../../lib/supabaseServer';
import { listRecordsForPhysician } from '../../../../lib/verificationRecordService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await getAdminUser(req, res);
  if (!admin) {
    return res.status(401).json({ error: 'Admin access required' });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const physicianId = req.query.id as string;
  if (!physicianId) {
    return res.status(400).json({ error: 'Physician ID is required' });
  }

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabaseAdmin
        .from('physicians')
        .select('*')
        .eq('id', physicianId)
        .single();

      if (error || !data) {
        return res.status(404).json({ error: 'Physician not found' });
      }

      // Also fetch verification results
      const { data: verificationResults } = await supabaseAdmin
        .from('physician_verification_results')
        .select('*')
        .eq('physician_id', physicianId)
        .order('created_at', { ascending: false });

      // Fetch manual review history
      const { data: reviewHistory } = await supabaseAdmin
        .from('physician_manual_review_queue')
        .select('*')
        .eq('physician_id', physicianId)
        .order('created_at', { ascending: false });

      // Phase 8 evidence + credentials + documents — 5 parallel reads.
      // listRecordsForPhysician comes from the Phase 8 service layer (do NOT
      // requery verification_records directly here).
      const [verRecords, auditLog, licenses, certs, documents] = await Promise.all([
        listRecordsForPhysician(physicianId),
        supabaseAdmin
          .from('credential_audit_log')
          .select(
            'id, actor_email, actor_role, target_table, target_id, field_name, old_value, new_value, change_type, changed_at',
          )
          .eq('physician_id', physicianId)
          .order('changed_at', { ascending: false })
          .limit(200),
        supabaseAdmin
          .from('physician_licenses')
          .select('*')
          .eq('physician_id', physicianId)
          .order('created_at', { ascending: false }),
        supabaseAdmin
          .from('physician_certifications')
          .select('*')
          .eq('physician_id', physicianId)
          .order('created_at', { ascending: false }),
        supabaseAdmin
          .from('physician_documents')
          .select(
            'id, document_type, related_credential_id, related_credential_table, file_name, storage_path, mime_type, uploaded_at, verified, verified_at',
          )
          .eq('physician_id', physicianId)
          .order('uploaded_at', { ascending: false }),
      ]);

      // Generate signed URLs for each document (10-minute TTL, T-09-03).
      // Sequential per-document signing — admin views are low-volume.
      // Failures degrade to signed_url: null + signed_url_error rather than
      // failing the whole request.
      type DocRow = {
        id: string;
        document_type: string;
        related_credential_id: string | null;
        related_credential_table: string | null;
        file_name: string | null;
        storage_path: string;
        mime_type: string | null;
        uploaded_at: string;
        verified: boolean | null;
        verified_at: string | null;
      };
      const documentsWithSignedUrls: Array<
        DocRow & { signed_url: string | null; signed_url_error?: string }
      > = [];
      for (const doc of (documents.data ?? []) as DocRow[]) {
        try {
          const { data: signed, error: signErr } = await supabaseAdmin.storage
            .from('physician-docs')
            .createSignedUrl(doc.storage_path, 60 * 10);
          if (signErr || !signed) {
            documentsWithSignedUrls.push({
              ...doc,
              signed_url: null,
              signed_url_error: signErr?.message ?? 'unknown signing error',
            });
          } else {
            documentsWithSignedUrls.push({ ...doc, signed_url: signed.signedUrl });
          }
        } catch (e) {
          documentsWithSignedUrls.push({
            ...doc,
            signed_url: null,
            signed_url_error: e instanceof Error ? e.message : String(e),
          });
        }
      }

      return res.status(200).json({
        physician: data,
        verificationResults: verificationResults || [],   // existing — Phase 5 tier results
        reviewHistory: reviewHistory || [],               // existing — older review queue
        verificationRecords: verRecords || [],            // NEW — Phase 8 raw API audit (VERF-01)
        credentialAuditLog: auditLog.data || [],          // NEW — Phase 8 field-level changes (VERF-05)
        licenses: licenses.data || [],                    // NEW — full license rows incl. expiration_flag + manual_review_required
        certifications: certs.data || [],                 // NEW — full cert rows incl. expiration_flag + manual_review_required
        documents: documentsWithSignedUrls,               // NEW — docs with 10-min signed URLs
      });
    } catch (err) {
      console.error('Error fetching physician:', err);
      return res.status(500).json({ error: 'Failed to fetch physician' });
    }
  }

  if (req.method === 'PUT') {
    if (admin.role !== 'admin' && admin.role !== 'super_admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    try {
      const body = req.body;
      if (!body || typeof body !== 'object') {
        return res.status(400).json({ error: 'Request body is required' });
      }

      // Whitelist: only allow admin-editable fields
      const ALLOWED_FIELDS = [
        'verification_status', 'verified_at', 'full_name', 'bio',
        'primary_specialty', 'sub_specialties', 'board_certifications',
        'medical_school', 'medical_school_country', 'graduation_year',
        'residency', 'fellowships', 'publications', 'current_institutions',
        'languages', 'licenses', 'honors',
      ];
      const updates: Record<string, unknown> = {};
      for (const field of ALLOWED_FIELDS) {
        if (body[field] !== undefined) updates[field] = body[field];
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      const { data, error } = await supabaseAdmin
        .from('physicians')
        .update(updates)
        .eq('id', physicianId)
        .select()
        .single();

      if (error) {
        console.error('Error updating physician:', error);
        return res.status(500).json({ error: 'Failed to update physician' });
      }

      return res.status(200).json({ physician: data });
    } catch (err) {
      console.error('Exception updating physician:', err);
      return res.status(500).json({ error: 'Internal error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
