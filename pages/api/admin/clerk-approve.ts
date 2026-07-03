/**
 * GET /api/admin/clerk-approve?token=<signed clerk_verify_approval JWT>
 *
 * The verification clerk's one-tap approve leg (task #27). Tapped from the
 * reviewer digest email; performs the SAME body as the admin cockpit's
 * "Verify & provision mailbox" flow: flip verified → provision the gendered
 * @medikah.health mailbox → fire the activation email — then renders a small
 * phone-friendly result page.
 *
 * Security contract (mirrors /api/admin/totp-reset-approve, Phase-18 D-14):
 *   - Admin-gated via getAdminUser — a stolen email link without a signed-in
 *     admin session gets 401 BEFORE any state change.
 *   - Token is type-isolated ('clerk_verify_approval'), 72h, bound to one
 *     physician_id.
 *   - Single-use at consume: requires verification_status still
 *     'pending'|'in_review'. A replayed link finds the doctor verified →
 *     "already verified" page, no state change.
 *   - Honorific is NEVER guessed: provisioning reads physicians.title; the
 *     digest only offers one-tap when a title is on file.
 *   - Every approval is audit-logged with the admin actor.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminUser } from '../../../lib/adminAuth';
import { supabaseAdmin } from '../../../lib/supabaseServer';
import { verifyClerkApprovalToken } from '../../../lib/verification/clerkApprovalTokens';
import { provisionWorkspaceMailbox } from '../../../lib/mailcowProvisioner';
import { triggerWorkspaceActivation } from '../../../lib/activationEmail';

function page(res: NextApiResponse, status: number, title: string, body: string): void {
  res.status(status).setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — Medikah</title></head>
<body style="margin:0;padding:40px 20px;background:#F5F6F8;font-family:Mulish,system-ui,sans-serif;color:#4A5568;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;">
    <p style="color:#2C7A8C;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin:0 0 12px;">Clerk de Verificación</p>
    <h1 style="color:#1C1C1E;font-size:20px;margin:0 0 12px;">${title}</h1>
    <div style="font-size:14px;line-height:1.7;">${body}</div>
  </div>
</body></html>`);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return void res.status(405).json({ error: 'Method not allowed' });
  }

  // Admin gate FIRST — 401 precedes any token processing (Phase-18 posture).
  const admin = await getAdminUser(req, res);
  if (!admin) {
    return page(
      res, 401, 'Se requiere sesión de administrador',
      'Inicie sesión como administrador en este dispositivo y vuelva a tocar el enlace del correo.',
    );
  }

  if (!supabaseAdmin) {
    return page(res, 500, 'Base de datos no configurada', 'Contacte al equipo técnico.');
  }

  const token = typeof req.query.token === 'string' ? req.query.token : '';
  const payload = token ? await verifyClerkApprovalToken(token) : null;
  if (!payload) {
    return page(
      res, 400, 'Enlace inválido o expirado',
      'El enlace de aprobación expiró (72 h) o no es válido. Abra el cockpit para verificar manualmente.',
    );
  }

  const { data: physician, error: physErr } = await supabaseAdmin
    .from('physicians')
    .select('id, full_name, title, email, verification_status')
    .eq('id', payload.physician_id)
    .single();

  if (physErr || !physician) {
    return page(res, 404, 'Médico no encontrado', 'El registro ya no existe.');
  }

  const status = (physician.verification_status as string) || 'pending';
  if (status === 'verified') {
    return page(
      res, 200, 'Ya estaba verificado',
      `${physician.full_name} ya fue verificado — el enlace es de un solo uso y no se aplicó ningún cambio.`,
    );
  }
  if (status !== 'pending' && status !== 'in_review') {
    return page(
      res, 409, 'Estado inesperado',
      `El médico está en estado «${status}». Revise el caso en el cockpit.`,
    );
  }

  // Flip verified — same authoritative body as the cockpit PUT.
  const { error: updErr } = await supabaseAdmin
    .from('physicians')
    .update({
      verification_status: 'verified',
      verified_at: new Date().toISOString(),
      verified_by: `clerk-one-tap:${admin.id}`,
    })
    .eq('id', physician.id);

  if (updErr) {
    return page(res, 500, 'No se pudo verificar', 'Error al actualizar el registro. Intente desde el cockpit.');
  }

  // Field-level audit in the credential-decision ledger (VERF-05), mirroring
  // the cockpit's cedula-verify insert so clerk taps share the same timeline.
  try {
    await supabaseAdmin.from('credential_audit_log').insert({
      physician_id: physician.id as string,
      actor_email: admin.email,
      actor_role: 'admin',
      target_table: 'physicians',
      target_id: physician.id as string,
      field_name: 'verification_status',
      old_value: status,
      new_value: 'verified',
      change_type: 'clerk_one_tap',
    });
  } catch (auditErr) {
    console.error('[clerk-approve] audit log insert failed (non-fatal):', auditErr);
  }

  // Provision + activate — identical sequence to the cockpit path. Failures
  // here must NOT undo the verify: the cockpit's "Resend activation link"
  // and provisioning retry cover the tail.
  const provisioning = await provisionWorkspaceMailbox({
    physicianId: physician.id as string,
    title: physician.title === 'Dr' || physician.title === 'Dra' ? physician.title : null,
    localPartOverride: null,
  });

  const display = physician.title ? `${physician.title}. ${physician.full_name}` : (physician.full_name as string);

  if (provisioning.status !== 'provisioned' && provisioning.status !== 'already_provisioned') {
    return page(
      res, 200, `${display} verificado — buzón pendiente`,
      `La verificación quedó aplicada, pero el buzón no pudo aprovisionarse (${'reason' in provisioning ? provisioning.reason : 'desconocido'}). ` +
      `Complete el aprovisionamiento desde el cockpit («Provision &amp; activate»).`,
    );
  }

  const activation = await triggerWorkspaceActivation(physician.id as string);
  const mailboxLine = `Buzón: <strong>${provisioning.mailboxAddress}</strong>.`;
  if (activation.status === 'sent') {
    return page(
      res, 200, `${display} verificado y activado`,
      `${mailboxLine} El correo de activación ya va en camino al médico. Nada más que hacer.`,
    );
  }
  if (activation.status === 'skipped') {
    return page(
      res, 200, `${display} verificado`,
      `${mailboxLine} No se envió un nuevo enlace de activación (${activation.reason}).`,
    );
  }
  return page(
    res, 200, `${display} verificado — activación pendiente`,
    `${mailboxLine} El correo de activación no pudo enviarse; use «Resend activation link» en el cockpit.`,
  );
}
