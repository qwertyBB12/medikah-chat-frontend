/**
 * Cédula Verification Cockpit — admin API (slice 3).
 *
 * MX cédula auto-verify is retired (SEP endpoint dead / RNP reCAPTCHA-gated — see
 * project_sep_cedula_verification_decision). A human admin runs the official RNP
 * lookup, downloads the "Constancia de Situación Profesional", and uses this
 * endpoint to (1) PREVIEW — parse the Constancia + name-match it against the
 * doctor's profile, then (2) COMMIT — file the evidence and record their
 * confirm/reject decision. The AI only recommends; a human commits. No reCAPTCHA
 * bypass, no registry mirror.
 *
 *   POST { action: 'preview', constanciaText?, imageDataUrl? }
 *     → { fields, source, ok, found, match }            (no writes)
 *   POST { action: 'commit', licenseId, decision, cedula, pais,
 *          constanciaText?, imageDataUrl?, evidenceDataUrl? }
 *     → { success, recordId, license }                  (evidence + audit + flip)
 *
 * Evidence is filed in the existing private `physician-docs` bucket (reused — no
 * new bucket needed) and surfaced in the admin detail view via the shared
 * physician_documents signed-URL path.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminUser } from '../../../../../lib/adminAuth';
import { supabaseAdmin } from '../../../../../lib/supabaseServer';
import { parseConstancia, type ConstanciaImage } from '../../../../../lib/verification/constanciaParse';
import { openaiConstanciaVision } from '../../../../../lib/verification/constanciaVision';
import { matchCedulaName } from '../../../../../lib/verification/cedulaNameMatch';
import { buildCedulaWrites, type CedulaDecision } from '../../../../../lib/verification/cedulaVerify';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EVIDENCE_BUCKET = 'physician-docs';
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
// image/* for the vision fallback; PDF or image for the filed evidence.
const IMAGE_DATAURL = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/;
const EVIDENCE_DATAURL = /^data:(image\/(?:jpeg|png|webp)|application\/pdf);base64,(.+)$/;

function decodeImage(dataUrl: unknown): ConstanciaImage | undefined {
  if (typeof dataUrl !== 'string') return undefined;
  const m = dataUrl.match(IMAGE_DATAURL);
  if (!m) return undefined;
  return { mime: m[1], base64: m[2] };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Admin gate — any admin_users member (reviewer/admin/super_admin) may verify
  // cédulas. Dr. Aguirre is the clinical approver, so this must not require the
  // higher admin/super_admin tier (which would lock out a 'reviewer').
  const admin = await getAdminUser(req, res);
  if (!admin) {
    return res.status(401).json({ error: 'Admin access required' });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const physicianId = req.query.id as string;
  if (!physicianId || !UUID_REGEX.test(physicianId)) {
    return res.status(400).json({ error: 'Invalid physician ID' });
  }

  // Canonical profile name comes from the DB, never the client — the match must
  // be against the record of truth.
  const { data: physician, error: physErr } = await supabaseAdmin
    .from('physicians')
    .select('id, full_name')
    .eq('id', physicianId)
    .single();
  if (physErr || !physician) {
    return res.status(404).json({ error: 'Physician not found' });
  }
  const profileName: string = physician.full_name ?? '';

  const action = (req.body?.action as string) ?? '';
  const constanciaText =
    typeof req.body?.constanciaText === 'string' ? req.body.constanciaText : '';
  const image = decodeImage(req.body?.imageDataUrl);

  try {
    // Parse (deterministic text first, vision fallback) + name match. Shared by
    // both actions — commit re-parses server-side rather than trusting client fields.
    const parsed = await parseConstancia(
      { text: constanciaText, image },
      { visionExtract: openaiConstanciaVision },
    );
    const match = matchCedulaName(parsed.fields.nombre ?? '', profileName);

    if (action === 'preview') {
      return res.status(200).json({
        fields: parsed.fields,
        source: parsed.source,
        ok: parsed.ok,
        found: parsed.found,
        profileName,
        match,
      });
    }

    if (action !== 'commit') {
      return res.status(400).json({ error: "action must be 'preview' or 'commit'" });
    }

    // ---- COMMIT: validate the human's decision + target license ----
    const decision = req.body?.decision as CedulaDecision;
    if (decision !== 'verified' && decision !== 'rejected') {
      return res.status(400).json({ error: "decision must be 'verified' or 'rejected'" });
    }

    const licenseId = req.body?.licenseId as string;
    if (!licenseId || !UUID_REGEX.test(licenseId)) {
      return res.status(400).json({ error: 'Invalid licenseId' });
    }
    const cedula = typeof req.body?.cedula === 'string' ? req.body.cedula.trim() : '';
    const pais = typeof req.body?.pais === 'string' ? req.body.pais.trim() : 'MX';
    if (!cedula) {
      return res.status(400).json({ error: 'cedula is required to commit' });
    }

    // The license must belong to this physician.
    const { data: license, error: licErr } = await supabaseAdmin
      .from('physician_licenses')
      .select('id, physician_id, license_type, verification_status')
      .eq('id', licenseId)
      .eq('physician_id', physicianId)
      .maybeSingle();
    if (licErr || !license) {
      return res.status(404).json({ error: 'License not found for this physician' });
    }

    // ---- File the Constancia evidence (best-effort; never blocks the record) ----
    let evidencePath: string | null = null;
    const evidenceDataUrl = req.body?.evidenceDataUrl;
    if (typeof evidenceDataUrl === 'string') {
      const m = evidenceDataUrl.match(EVIDENCE_DATAURL);
      if (!m) {
        return res.status(400).json({ error: 'evidenceDataUrl must be a PDF or image data URL' });
      }
      const mime = m[1];
      const buffer = Buffer.from(m[2], 'base64');
      if (buffer.length > MAX_FILE_SIZE_BYTES) {
        return res.status(400).json({ error: 'Evidence too large (max 5MB)' });
      }
      const ext = mime === 'application/pdf' ? 'pdf' : mime.split('/')[1];
      const storagePath = `${physicianId}/cedula_constancia/${Date.now()}_constancia.${ext}`;
      const { error: uploadErr } = await supabaseAdmin.storage
        .from(EVIDENCE_BUCKET)
        .upload(storagePath, buffer, { contentType: mime, upsert: true });
      if (uploadErr) {
        console.error('[cedula-verify] evidence upload failed:', uploadErr.message);
        return res.status(500).json({ error: 'Failed to file Constancia evidence' });
      }
      evidencePath = storagePath;

      // Surface the evidence in the shared admin detail view (signed-URL path).
      const { error: docErr } = await supabaseAdmin.from('physician_documents').insert({
        physician_id: physicianId,
        document_type: 'cedula_constancia',
        related_credential_id: licenseId,
        related_credential_table: 'physician_licenses',
        file_name: `constancia.${ext}`,
        storage_path: storagePath,
        mime_type: mime,
      });
      if (docErr) {
        // Non-fatal: the file is stored and the audit row will carry the path.
        console.error('[cedula-verify] physician_documents insert failed:', docErr.message);
      }
    }

    // ---- Record the decision + flip the badge (verified live schema) ----
    const now = new Date().toISOString();
    const { record, licenseUpdate } = buildCedulaWrites(
      {
        physicianId,
        licenseId,
        decision,
        cedula,
        pais,
        reviewerEmail: admin.email,
        fields: parsed.fields,
        match,
        evidencePath,
        source: parsed.source,
      },
      now,
    );

    const { data: inserted, error: recErr } = await supabaseAdmin
      .from('verification_records')
      .insert(record)
      .select('id')
      .single();
    if (recErr) {
      console.error('[cedula-verify] verification_records insert failed:', recErr.message);
      return res.status(500).json({ error: 'Failed to record verification' });
    }

    const { data: updatedLicense, error: updErr } = await supabaseAdmin
      .from('physician_licenses')
      .update(licenseUpdate)
      .eq('id', licenseId)
      .eq('physician_id', physicianId)
      .select('id, verification_status, verified_at, verification_source')
      .single();
    if (updErr) {
      console.error('[cedula-verify] license update failed:', updErr.message);
      return res
        .status(500)
        .json({ error: 'Verification recorded but license update failed', recordId: inserted?.id });
    }

    // Best-effort field-level audit (VERF-05), mirroring credential-decision.ts so
    // the cédula flip shares the same admin audit timeline. Non-fatal.
    try {
      await supabaseAdmin.from('credential_audit_log').insert({
        physician_id: physicianId,
        actor_email: admin.email,
        actor_role: 'admin',
        target_table: 'physician_licenses',
        target_id: licenseId,
        field_name: 'verification_status',
        old_value: license.verification_status ?? null,
        new_value: licenseUpdate.verification_status,
        change_type: 'update',
      });
    } catch (auditErr) {
      console.error('[cedula-verify] audit log insert failed (non-fatal):', auditErr);
    }

    return res.status(200).json({
      success: true,
      recordId: inserted?.id ?? null,
      decision,
      match,
      evidencePath,
      license: updatedLicense,
    });
  } catch (err) {
    console.error('[cedula-verify] exception:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Constancia PDFs/images arrive base64-encoded in the JSON body.
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};
