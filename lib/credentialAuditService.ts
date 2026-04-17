/**
 * Phase 8 VERF-05: Append-only field-level audit for credential changes.
 * Every INSERT/UPDATE/DELETE on physician_licenses or physician_certifications
 * should call one of these helpers BEFORE or AFTER the underlying write
 * (prefer AFTER for UPDATE — you need the pre-image to diff).
 *
 * Writes are best-effort. DB-side append-only RLS (migration 016) is the security guarantee;
 * these helpers are a convenience for standardizing the call sites.
 */

import { supabaseAdmin } from './supabaseServer';
import type {
  ActorRole,
  CredentialAuditEntry,
  CredentialTable,
} from './verificationTypes';

/** Insert one credential_audit_log row. Never throws. */
export async function logChange(entry: CredentialAuditEntry): Promise<void> {
  if (!supabaseAdmin) {
    console.error(
      '[credentialAuditService] supabaseAdmin not configured — audit skipped',
      {
        physicianId: entry.physicianId,
        field: entry.fieldName,
      },
    );
    return;
  }

  try {
    const { error } = await supabaseAdmin.from('credential_audit_log').insert({
      physician_id: entry.physicianId,
      actor_email: entry.actorEmail,
      actor_role: entry.actorRole,
      target_table: entry.targetTable,
      target_id: entry.targetId,
      field_name: entry.fieldName,
      old_value: entry.oldValue === undefined ? null : entry.oldValue,
      new_value: entry.newValue === undefined ? null : entry.newValue,
      change_type: entry.changeType,
    });

    if (error) {
      console.error('[credentialAuditService.logChange] insert failed', {
        physicianId: entry.physicianId,
        field: entry.fieldName,
        error: error.message,
      });
    }
  } catch (err) {
    console.error('[credentialAuditService.logChange] exception', err);
  }
}

/**
 * Compare two row snapshots and return the list of changed fields.
 * Only fields in `watchFields` are considered. Returns empty array if no changes.
 * undefined is normalized to null so a DB-returned-null doesn't spuriously diff
 * against a client-side-undefined.
 */
export function diffFields<T extends Record<string, unknown>>(
  before: T | null | undefined,
  after: T | null | undefined,
  watchFields: (keyof T)[],
): Array<{ field: string; oldValue: unknown; newValue: unknown }> {
  const diffs: Array<{ field: string; oldValue: unknown; newValue: unknown }> = [];
  for (const f of watchFields) {
    const oldV = before ? before[f] : undefined;
    const newV = after ? after[f] : undefined;
    // Coerce undefined to null for comparison symmetry with DB
    const normOld = oldV === undefined ? null : oldV;
    const normNew = newV === undefined ? null : newV;
    if (JSON.stringify(normOld) !== JSON.stringify(normNew)) {
      diffs.push({ field: String(f), oldValue: normOld, newValue: normNew });
    }
  }
  return diffs;
}

/** Convenience: log one row per changed field for an UPDATE. */
export async function logUpdateDiff<T extends Record<string, unknown>>(opts: {
  physicianId: string;
  actorEmail: string;
  actorRole: ActorRole;
  targetTable: CredentialTable;
  targetId: string;
  before: T | null | undefined;
  after: T | null | undefined;
  watchFields: (keyof T)[];
}): Promise<void> {
  const diffs = diffFields(opts.before, opts.after, opts.watchFields);
  for (const d of diffs) {
    await logChange({
      physicianId: opts.physicianId,
      actorEmail: opts.actorEmail,
      actorRole: opts.actorRole,
      targetTable: opts.targetTable,
      targetId: opts.targetId,
      fieldName: d.field,
      oldValue: d.oldValue,
      newValue: d.newValue,
      changeType: 'update',
    });
  }
}

/** Convenience: log a single create with the full new row snapshot. */
export async function logCreate(opts: {
  physicianId: string;
  actorEmail: string;
  actorRole: ActorRole;
  targetTable: CredentialTable;
  targetId: string;
  snapshot: Record<string, unknown>;
}): Promise<void> {
  await logChange({
    physicianId: opts.physicianId,
    actorEmail: opts.actorEmail,
    actorRole: opts.actorRole,
    targetTable: opts.targetTable,
    targetId: opts.targetId,
    fieldName: '_row',
    oldValue: null,
    newValue: opts.snapshot,
    changeType: 'create',
  });
}

/** Convenience: log a delete with the last-known row snapshot. */
export async function logDelete(opts: {
  physicianId: string;
  actorEmail: string;
  actorRole: ActorRole;
  targetTable: CredentialTable;
  targetId: string;
  snapshot: Record<string, unknown>;
}): Promise<void> {
  await logChange({
    physicianId: opts.physicianId,
    actorEmail: opts.actorEmail,
    actorRole: opts.actorRole,
    targetTable: opts.targetTable,
    targetId: opts.targetId,
    fieldName: '_row',
    oldValue: opts.snapshot,
    newValue: null,
    changeType: 'delete',
  });
}
