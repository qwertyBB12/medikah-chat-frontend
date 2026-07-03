/**
 * POST /api/admin/isabel-consume   body: token=<opaque>&action=approve|reject
 *
 * Isabel standing agent (task #28) — the consume leg. Reached only from the
 * buttons on /api/admin/isabel-review. Single-use is enforced by a CONDITIONAL
 * status flip (`pending → decided` guarded by .eq('status','pending')) that
 * happens BEFORE the send — a double-tap or a second admin racing the first
 * finds zero rows updated and cannot double-send.
 *
 * On approve: sends the draft via Resend AS Isabel
 * (isabel.castellanos@medikah.health) with In-Reply-To/References threading
 * and founder BCC to hector@medikah.health (the LOCAL mailbox — the nxtglobal
 * address loops back through Resend inbound; 2026-06-19 CTO brief). The
 * kah-operations watcher files the Sent-folder copy on its next run.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminUser } from '../../../lib/adminAuth';
import { supabaseAdmin } from '../../../lib/supabaseServer';
import {
  hashDraftToken,
  isPlausibleToken,
  isDraftExpired,
  type IsabelDraft,
} from '../../../lib/isabel/draftTokens';

const ISABEL_FROM = process.env.ISABEL_FROM_EMAIL || 'isabel.castellanos@medikah.health';
const FOUNDER_BCC = process.env.ISABEL_FOUNDER_BCC || 'hector@medikah.health';

function page(res: NextApiResponse, status: number, title: string, body: string): void {
  res.status(status).setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — Medikah</title></head>
<body style="margin:0;padding:40px 20px;background:#F5F6F8;font-family:Mulish,system-ui,sans-serif;color:#4A5568;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;">
    <p style="color:#2C7A8C;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin:0 0 12px;">Isabel · Oficina del Fundador</p>
    <h1 style="color:#1C1C1E;font-size:20px;margin:0 0 12px;">${title}</h1>
    <div style="font-size:14px;line-height:1.7;">${body}</div>
  </div>
</body></html>`);
}

async function logAction(actorEmail: string, action: string, detail: Record<string, unknown>): Promise<void> {
  if (!supabaseAdmin) return;
  try {
    await supabaseAdmin.from('isabel_action_log').insert({ actor: actorEmail, action, detail });
  } catch (err) {
    console.error('[isabel-consume] action log insert failed (non-fatal):', err);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return void res.status(405).json({ error: 'Method not allowed' });
  }

  if (process.env.ISABEL_AGENT_ENABLED !== 'true') {
    return page(res, 404, 'Agente no habilitado', 'Isabel aún no está armada en este entorno.');
  }

  const admin = await getAdminUser(req, res);
  if (!admin) {
    return page(
      res, 401, 'Se requiere sesión de administrador',
      'Inicie sesión como administrador en este dispositivo y vuelva al enlace del correo.',
    );
  }

  if (!supabaseAdmin) {
    return page(res, 500, 'Base de datos no configurada', 'Contacte al equipo técnico.');
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const token = body.token;
  const action = body.action === 'approve' || body.action === 'reject' ? body.action : null;
  if (!isPlausibleToken(token) || !action) {
    return page(res, 400, 'Solicitud inválida', 'Faltan datos. Vuelva al enlace del correo.');
  }

  const { data: draft, error } = await supabaseAdmin
    .from('isabel_drafts')
    .select('id, source_from, source_subject, source_excerpt, recipient, reply_to_message_id, reply_subject, reply_body, confidence, status, token_expires_at, created_at')
    .eq('token_hash', hashDraftToken(token))
    .maybeSingle<IsabelDraft>();

  if (error || !draft) {
    return page(res, 400, 'Enlace inválido o expirado', 'No se encontró el borrador.');
  }
  if (draft.status !== 'pending') {
    return page(res, 200, 'Ya decidido', 'Este borrador ya fue decidido antes. No se aplicó ningún cambio.');
  }
  if (isDraftExpired(draft)) {
    await supabaseAdmin.from('isabel_drafts').update({ status: 'expired' }).eq('id', draft.id).eq('status', 'pending');
    return page(res, 200, 'Enlace expirado', 'El borrador expiró (72 h). Isabel no envió nada.');
  }

  const decidedAt = new Date().toISOString();

  if (action === 'reject') {
    const { data: flipped } = await supabaseAdmin
      .from('isabel_drafts')
      .update({ status: 'rejected', decided_at: decidedAt, decided_by: admin.email })
      .eq('id', draft.id)
      .eq('status', 'pending')
      .select('id');
    if (!flipped || flipped.length === 0) {
      return page(res, 200, 'Ya decidido', 'Otro dispositivo decidió este borrador primero.');
    }
    await logAction(admin.email, 'isabel_send_rejected', { draft_id: draft.id, recipient: draft.recipient });
    return page(res, 200, 'Borrador rechazado', `No se envió nada a ${draft.recipient}. Isabel lo registró.`);
  }

  // Approve: flip FIRST (single-use), send SECOND.
  const { data: flipped } = await supabaseAdmin
    .from('isabel_drafts')
    .update({ status: 'approved_sent', decided_at: decidedAt, decided_by: admin.email })
    .eq('id', draft.id)
    .eq('status', 'pending')
    .select('id');
  if (!flipped || flipped.length === 0) {
    return page(res, 200, 'Ya decidido', 'Otro dispositivo decidió este borrador primero. No se envió de nuevo.');
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    await supabaseAdmin.from('isabel_drafts')
      .update({ status: 'send_failed', send_error: 'RESEND_API_KEY not configured' })
      .eq('id', draft.id);
    return page(res, 500, 'No se pudo enviar', 'El servicio de correo no está configurado. La aprobación quedó registrada como fallida.');
  }

  const headers: Record<string, string> = {};
  if (draft.reply_to_message_id) {
    headers['In-Reply-To'] = draft.reply_to_message_id;
    headers['References'] = draft.reply_to_message_id;
  }

  let sendOk = false;
  let sendErrorText = '';
  let resendId: string | null = null;
  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `Isabel Castellanos <${ISABEL_FROM}>`,
        to: draft.recipient,
        bcc: FOUNDER_BCC,
        subject: draft.reply_subject,
        text: draft.reply_body,
        ...(Object.keys(headers).length ? { headers } : {}),
      }),
    });
    if (resp.ok) {
      const result = (await resp.json()) as { id?: string };
      resendId = result.id ?? null;
      sendOk = true;
    } else {
      sendErrorText = `HTTP ${resp.status}: ${(await resp.text()).slice(0, 300)}`;
    }
  } catch (err) {
    sendErrorText = err instanceof Error ? err.message : 'unknown send error';
  }

  if (!sendOk) {
    await supabaseAdmin.from('isabel_drafts')
      .update({ status: 'send_failed', send_error: sendErrorText })
      .eq('id', draft.id);
    await logAction(admin.email, 'isabel_send_failed', { draft_id: draft.id, recipient: draft.recipient, error: sendErrorText });
    return page(
      res, 500, 'Aprobado, pero el envío falló',
      `Su aprobación quedó registrada pero Resend no aceptó el correo. Isabel lo marcó <strong>send_failed</strong>; responda manualmente desde el buzón si urge.`,
    );
  }

  await supabaseAdmin.from('isabel_drafts')
    .update({ sent_email_id: resendId })
    .eq('id', draft.id);
  await logAction(admin.email, 'isabel_send_approved', {
    draft_id: draft.id, recipient: draft.recipient, resend_id: resendId,
  });

  return page(
    res, 200, 'Enviado',
    `La respuesta salió a <strong>${draft.recipient}</strong> como Isabel Castellanos, con copia oculta a ${FOUNDER_BCC}. ` +
    'La copia se archivará en su carpeta Enviados en la próxima pasada del watcher. Nada más que hacer.',
  );
}
