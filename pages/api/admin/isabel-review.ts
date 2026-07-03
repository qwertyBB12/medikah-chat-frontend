/**
 * GET /api/admin/isabel-review?token=<opaque draft token>
 *
 * Isabel standing agent (task #28) — the review leg of her one-tap approve.
 * Tapped from the draft-ready email/ntfy push; renders a phone-friendly page
 * showing the incoming message excerpt and Isabel's proposed reply, with
 * Aprobar/Rechazar buttons that POST to /api/admin/isabel-consume. This GET
 * never mutates (unlike clerk-approve, the payload here is an outward send to
 * an external party — it deserves eyes on the text before the tap).
 *
 * Security contract (Phase-18 D-14 posture, clerk-approve sibling):
 *   - Dark until ISABEL_AGENT_ENABLED=true.
 *   - Admin-gated via getAdminUser BEFORE token processing — a stolen link
 *     without a signed-in admin session gets 401.
 *   - Token is opaque, SHA-256-matched against isabel_drafts.token_hash,
 *     72h expiry, bound to one draft row, single-use at consume.
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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

const STATUS_PAGES: Record<Exclude<IsabelDraft['status'], 'pending'>, [string, string]> = {
  approved_sent: ['Ya enviado', 'Este borrador ya fue aprobado y enviado. El enlace es de un solo uso.'],
  rejected: ['Ya rechazado', 'Este borrador ya fue rechazado. No se envió nada.'],
  expired: ['Enlace expirado', 'El borrador expiró (72 h) sin decisión. Isabel no envió nada.'],
  send_failed: ['Envío fallido', 'La aprobación se registró pero el envío falló. Revise isabel_action_log o reintente desde el buzón.'],
};

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return void res.status(405).json({ error: 'Method not allowed' });
  }

  if (process.env.ISABEL_AGENT_ENABLED !== 'true') {
    return page(res, 404, 'Agente no habilitado', 'Isabel aún no está armada en este entorno.');
  }

  // Admin gate FIRST — 401 precedes any token processing (Phase-18 posture).
  const admin = await getAdminUser(req, res);
  if (!admin) {
    return page(
      res, 401, 'Se requiere sesión de administrador',
      'Inicie sesión como administrador en este dispositivo y vuelva a tocar el enlace.',
    );
  }

  if (!supabaseAdmin) {
    return page(res, 500, 'Base de datos no configurada', 'Contacte al equipo técnico.');
  }

  const token = req.query.token;
  if (!isPlausibleToken(token)) {
    return page(res, 400, 'Enlace inválido', 'El enlace no es válido. Revise el correo original.');
  }

  const { data: draft, error } = await supabaseAdmin
    .from('isabel_drafts')
    .select('id, source_from, source_subject, source_excerpt, recipient, reply_to_message_id, reply_subject, reply_body, confidence, status, token_expires_at, created_at')
    .eq('token_hash', hashDraftToken(token))
    .maybeSingle<IsabelDraft>();

  if (error || !draft) {
    return page(res, 400, 'Enlace inválido o expirado', 'No se encontró el borrador. El enlace pudo haber expirado.');
  }

  if (draft.status !== 'pending') {
    const [title, body] = STATUS_PAGES[draft.status];
    return page(res, 200, title, body);
  }

  if (isDraftExpired(draft)) {
    await supabaseAdmin
      .from('isabel_drafts')
      .update({ status: 'expired' })
      .eq('id', draft.id)
      .eq('status', 'pending');
    return page(res, 200, 'Enlace expirado', 'El borrador expiró (72 h) sin decisión. Isabel no envió nada.');
  }

  const excerpt = draft.source_excerpt ? escapeHtml(draft.source_excerpt) : '(sin contenido)';
  const buttons = `
    <form method="POST" action="/api/admin/isabel-consume" style="display:inline-block;margin:0 8px 0 0;">
      <input type="hidden" name="token" value="${escapeHtml(token)}">
      <input type="hidden" name="action" value="approve">
      <button type="submit" style="background:#2C7A8C;color:#fff;border:0;padding:12px 28px;border-radius:8px;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;">Aprobar y enviar</button>
    </form>
    <form method="POST" action="/api/admin/isabel-consume" style="display:inline-block;">
      <input type="hidden" name="token" value="${escapeHtml(token)}">
      <input type="hidden" name="action" value="reject">
      <button type="submit" style="background:#fff;color:#B83D3D;border:1px solid #B83D3D;padding:12px 28px;border-radius:8px;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;">Rechazar</button>
    </form>`;

  return page(
    res, 200, 'Borrador de Isabel — su aprobación',
    `<p style="margin:0 0 4px;"><strong>De:</strong> ${escapeHtml(draft.source_from)}<br>
     <strong>Asunto:</strong> ${escapeHtml(draft.source_subject || '(sin asunto)')}</p>
     <p style="margin:16px 0 6px;font-weight:700;">Mensaje recibido (extracto):</p>
     <div style="white-space:pre-wrap;background:#F5F6F8;border-radius:8px;padding:14px;font-size:13px;">${excerpt}</div>
     <p style="margin:20px 0 6px;font-weight:700;">Respuesta propuesta a ${escapeHtml(draft.recipient)}:</p>
     <p style="margin:0 0 4px;font-size:13px;color:#8A8D91;">Asunto: ${escapeHtml(draft.reply_subject)}</p>
     <div style="white-space:pre-wrap;background:#F5F6F8;border-radius:8px;padding:14px;">${escapeHtml(draft.reply_body)}</div>
     <p style="margin:24px 0 0;">${buttons}</p>
     <p style="margin:16px 0 0;font-size:12px;color:#8A8D91;">Un solo uso. Al aprobar, el correo sale como Isabel Castellanos con copia oculta a hector@medikah.health.</p>`,
  );
}
