/**
 * POST /api/admin/physicians/[id]/credential-decision
 *
 * B3 admin review: approve or reject a single canonical specialty/education row,
 * flipping its verification_status. Approve -> 'verified' (becomes publicly
 * visible via the B2 derive-at-read gate); reject -> 'rejected' (stays hidden).
 *
 * Authz mirrors the physician PUT on this resource: an admin/super_admin only
 * (a 'reviewer' cannot flip credentials). Writes a best-effort credential_audit_log
 * row — that insert is non-fatal so the decision still applies even before
 * migration 038 widens the audit-log target_table CHECK.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminUser } from '../../../../../lib/adminAuth';
import { supabaseAdmin } from '../../../../../lib/supabaseServer';
import {
  isReviewableTable,
  decisionToStatus,
} from '../../../../../lib/adminCredentialDecision';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const admin = await getAdminUser(req, res);
  if (!admin) {
    return res.status(401).json({ error: 'Admin access required' });
  }
  if (admin.role !== 'admin' && admin.role !== 'super_admin') {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const physicianId = req.query.id as string;
  if (!physicianId || !UUID_REGEX.test(physicianId)) {
    return res.status(400).json({ error: 'Invalid physician ID' });
  }

  const { table, credentialId, action } = (req.body ?? {}) as {
    table?: unknown;
    credentialId?: unknown;
    action?: unknown;
  };

  if (!isReviewableTable(table)) {
    return res.status(400).json({ error: 'Invalid credential table' });
  }
  if (typeof credentialId !== 'string' || !UUID_REGEX.test(credentialId)) {
    return res.status(400).json({ error: 'Invalid credential ID' });
  }
  const newStatus = decisionToStatus(action);
  if (!newStatus) {
    return res.status(400).json({ error: 'Invalid action (expected approve or reject)' });
  }

  try {
    // Read the row first: confirm it exists AND belongs to this physician (so an
    // admin can't flip a row id from another physician via this physician's URL).
    const { data: existing, error: readErr } = await supabaseAdmin
      .from(table)
      .select('id, physician_id, verification_status')
      .eq('id', credentialId)
      .maybeSingle();

    if (readErr || !existing) {
      return res.status(404).json({ error: 'Credential not found' });
    }
    if (existing.physician_id !== physicianId) {
      return res.status(400).json({ error: 'Credential does not belong to this physician' });
    }

    const { error: updateErr } = await supabaseAdmin
      .from(table)
      .update({
        verification_status: newStatus,
        verification_source: 'admin',
        verified_at: newStatus === 'verified' ? new Date().toISOString() : null,
      })
      .eq('id', credentialId);

    if (updateErr) {
      console.error('[credential-decision] update failed:', updateErr);
      return res.status(500).json({ error: 'Failed to update credential' });
    }

    // Best-effort audit trail (non-fatal — see migration 038 for the constraint
    // that allows these target_table values; until applied this insert no-ops).
    try {
      await supabaseAdmin.from('credential_audit_log').insert({
        physician_id: physicianId,
        actor_email: admin.email,
        actor_role: 'admin',
        target_table: table,
        target_id: credentialId,
        field_name: 'verification_status',
        old_value: existing.verification_status ?? null,
        new_value: newStatus,
        change_type: 'update',
      });
    } catch (auditErr) {
      console.error('[credential-decision] audit log insert failed (non-fatal):', auditErr);
    }

    return res.status(200).json({ success: true, status: newStatus });
  } catch (err) {
    console.error('[credential-decision] exception:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
