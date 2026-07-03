/**
 * Verification clerk — packet builder + reviewer digest email (task #27).
 *
 * The clerk is a STANDING agent on the Sovereign Staff ladder: channel = the
 * reviewer's mailbox, docket = the pending-verification queue, human gate =
 * Dr. Aguirre's one-tap (clinical authority — the agent only clerks, per the
 * COO charter authority matrix). This module is deliberately DETERMINISTIC:
 * it assembles what a 30-second review needs; it never decides.
 *
 * One-tap eligibility (approve link included) requires ALL of:
 *   - honorific on file (physicians.title Dr/Dra — mailbox provisioning needs
 *     it and it is never guessed), AND
 *   - at least one MX license carrying a cédula number, AND
 *   - at least one uploaded document to review.
 * Everything else gets a cockpit link only — depth review stays in the cockpit.
 */

import { randomUUID } from 'crypto';
import { tokens, emailHead, emailHeader, emailFooter } from '../emailChrome';
import { signClerkApprovalToken } from './clerkApprovalTokens';

export interface ClerkPacket {
  physicianId: string;
  fullName: string;
  title: 'Dr' | 'Dra' | null;
  email: string;
  specialty: string | null;
  submittedAt: string | null;
  cedulas: Array<{ number: string; type: string; status: string }>;
  documentCount: number;
  oneTapEligible: boolean;
  /** Human-readable reasons the packet is cockpit-only (empty when eligible). */
  blockers: string[];
}

// Minimal HTML escape for DB-sourced strings interpolated into the digest.
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

type SupabaseLike = {
  from: (table: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

/** Assemble the packet for one pending physician. Read-only. */
export async function buildClerkPacket(
  db: SupabaseLike,
  physician: {
    id: string;
    full_name: string;
    title: string | null;
    email: string;
    primary_specialty: string | null;
    onboarding_completed_at: string | null;
  },
): Promise<ClerkPacket> {
  const [licRes, docRes] = await Promise.all([
    db
      .from('physician_licenses')
      .select('license_number, license_type, country_code, verification_status')
      .eq('physician_id', physician.id),
    db
      .from('physician_documents')
      .select('id', { count: 'exact', head: true })
      .eq('physician_id', physician.id),
  ]);

  const licenses = (licRes.data ?? []) as Array<{
    license_number: string | null;
    license_type: string;
    country_code: string;
    verification_status: string;
  }>;
  const cedulas = licenses
    .filter((l) => l.country_code === 'MX' && (l.license_number ?? '').trim().length > 0)
    .map((l) => ({
      number: (l.license_number as string).trim(),
      type: l.license_type,
      status: l.verification_status,
    }));
  const documentCount = docRes.count ?? 0;
  const title = physician.title === 'Dr' || physician.title === 'Dra' ? physician.title : null;

  const blockers: string[] = [];
  if (!title) blockers.push('Sin honorífico (Dr/Dra) registrado — el buzón no puede aprovisionarse');
  if (cedulas.length === 0) blockers.push('Sin cédula MX capturada');
  if (documentCount === 0) blockers.push('Sin documentos subidos');

  return {
    physicianId: physician.id,
    fullName: physician.full_name,
    title,
    email: physician.email,
    specialty: physician.primary_specialty,
    submittedAt: physician.onboarding_completed_at,
    cedulas,
    documentCount,
    oneTapEligible: blockers.length === 0,
    blockers,
  };
}

/** Render the reviewer digest email (Spanish — the reviewer is Dr. Aguirre). */
export async function renderClerkDigestEmail(
  packets: ClerkPacket[],
): Promise<{ subject: string; html: string; text: string }> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://medikah.health';
  const subject = `Cola de verificación — ${packets.length} médico${packets.length === 1 ? '' : 's'} pendiente${packets.length === 1 ? '' : 's'}`;

  const rows: string[] = [];
  const textRows: string[] = [];
  for (const p of packets) {
    const display = p.title ? `${p.title}. ${p.fullName}` : p.fullName;
    const cockpitUrl = `${baseUrl}/admin/physicians/${p.physicianId}`;
    let approveBlock = '';
    let approveText = '';
    if (p.oneTapEligible) {
      const token = await signClerkApprovalToken({ physician_id: p.physicianId, jti: randomUUID() });
      const approveUrl = `${baseUrl}/api/admin/clerk-approve?token=${encodeURIComponent(token)}`;
      approveBlock = `
        <a href="${approveUrl}" style="display:inline-block;background-color:${tokens.colors.clinicalTeal};color:${tokens.colors.white};font-family:${tokens.fonts.ui};font-size:13px;font-weight:700;text-decoration:none;padding:10px 18px;border-radius:${tokens.radii.sm};margin-right:8px;">
          Aprobar y activar
        </a>`;
      approveText = `  APROBAR (un toque): ${approveUrl}\n`;
    } else {
      approveBlock = `<p style="font-family:${tokens.fonts.ui};color:${tokens.colors.bodySlate};font-size:12px;margin:0 0 8px 0;">Solo cockpit: ${esc(p.blockers.join(' · '))}</p>`;
      approveText = `  Solo cockpit: ${p.blockers.join(' / ')}\n`;
    }
    const cedulaLine = p.cedulas.length
      ? p.cedulas.map((c) => `${esc(c.number)} (${esc(c.type)})`).join(', ')
      : '—';
    rows.push(`
      <div style="background-color:${tokens.colors.linen};border-left:4px solid ${tokens.colors.instBlue};padding:16px 20px;border-radius:${tokens.radii.sm};margin-bottom:14px;">
        <p style="font-family:${tokens.fonts.ui};color:${tokens.colors.instBlue};font-size:15px;font-weight:700;margin:0 0 4px 0;">${esc(display)}</p>
        <p style="font-family:${tokens.fonts.ui};color:${tokens.colors.bodySlate};font-size:13px;margin:0 0 10px 0;">
          ${esc(p.specialty || 'Sin especialidad')} · Cédula(s): ${cedulaLine} · ${p.documentCount} documento(s)
        </p>
        ${approveBlock}
        <a href="${cockpitUrl}" style="display:inline-block;color:${tokens.colors.clinicalTeal};font-family:${tokens.fonts.ui};font-size:13px;font-weight:600;text-decoration:none;padding:10px 4px;">
          Abrir cockpit →
        </a>
      </div>`);
    textRows.push(
      `- ${display} · ${p.specialty || 'Sin especialidad'} · Cédulas: ${p.cedulas.map((c) => c.number).join(', ') || '—'} · ${p.documentCount} doc(s)\n${approveText}  Cockpit: ${cockpitUrl}\n`,
    );
  }

  const html = `<!DOCTYPE html>
<html lang="es">
${emailHead()}
<body style="margin:0;padding:0;background-color:${tokens.pageBg};font-family:${tokens.fonts.ui};color:${tokens.colors.bodySlate};">
${emailHeader({ variant: 'linen', locale: 'es', wordmark: 'medikah' })}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${tokens.pageBg};padding:40px 20px;">
  <tr><td align="center">
    <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" style="background-color:${tokens.colors.white};border-radius:${tokens.radii.md};overflow:hidden;">
      <tr><td class="email-pad" style="padding:36px 32px 8px 32px;">
        <p style="font-family:${tokens.fonts.ui};color:${tokens.colors.clinicalTeal};font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 12px 0;">
          Clerk de Verificación
        </p>
        <h1 style="font-family:${tokens.fonts.body};color:${tokens.colors.deepCharcoal};font-size:22px;font-weight:700;margin:0 0 8px 0;">${subject}</h1>
        <p style="font-family:${tokens.fonts.ui};color:${tokens.colors.bodySlate};font-size:14px;line-height:1.6;margin:0 0 20px 0;">
          "Aprobar y activar" verifica al médico, aprovisiona su buzón @medikah.health y
          dispara su correo de activación — un toque. El enlace requiere su sesión de
          administrador y expira en 72 horas. Los casos con pendientes se revisan en el cockpit.
        </p>
      </td></tr>
      <tr><td class="email-pad" style="padding:0 32px 28px 32px;">
        ${rows.join('\n')}
      </td></tr>
    </table>
  </td></tr>
</table>
${emailFooter({ locale: 'es' })}
</body>
</html>`;

  const text = `${subject}\n\n${textRows.join('\n')}`;
  return { subject, html, text };
}
