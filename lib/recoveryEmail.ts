/**
 * Workspace recovery email utilities — Phase 18 (AUTH-07 / FLOW-05)
 *
 * Sends the Práctikah-branded bilingual magic-link recovery email.
 *
 * Security contract (D-03 / D-05 / T-18-05-01):
 *   - Raw recovery tokens are NEVER console-logged.
 *   - Email is sent ONLY to the address already on file for the physician
 *     (physicians.email) — never to a caller-supplied address.
 *   - Sender is PRACTIKAH_EMAIL_FROM (official monitored Práctikah address).
 *   - Brand-surface routing: physician workspace surface → Práctikah brand.
 *
 * Analog: lib/activationEmail.ts (same Resend + emailChrome pattern,
 * different content — no TOTP section, password-only recovery).
 */

import { tokens, emailHead, emailHeader, emailFooter } from './emailChrome';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

export interface RecoveryEmailOptions {
  to: string;
  fullName: string;
  recoveryUrl: string;
  lang?: 'en' | 'es';
}

// ---------------------------------------------------------------------------
// sendEmail — internal Resend helper (mirrors activationEmail.ts pattern)
// ---------------------------------------------------------------------------

async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail =
    process.env.PRACTIKAH_EMAIL_FROM || 'activacion@medikah.health';

  if (!apiKey) {
    console.warn('[recoveryEmail] RESEND_API_KEY not configured. Email not sent.');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Práctikah · Medikah <${fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    });

    if (!response.ok) {
      const errBody = await response.json();
      console.error('[recoveryEmail] Resend error:', errBody);
      return { success: false, error: errBody.message || 'Failed to send email' };
    }

    const result = await response.json();
    return { success: true, id: result.id };
  } catch (err) {
    console.error('[recoveryEmail] sendEmail exception:', err);
    return { success: false, error: 'Failed to send email' };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getLastName(fullName: string): string {
  const parts = fullName.trim().split(' ');
  return parts.length > 1 ? (parts[parts.length - 1] ?? parts[0] ?? fullName) : (parts[0] ?? fullName);
}

// ---------------------------------------------------------------------------
// sendRecoveryEmail — Práctikah-branded bilingual recovery magic-link email
// ---------------------------------------------------------------------------

/**
 * Send the Práctikah workspace password-recovery magic-link email.
 *
 * Uses the navy variant header with wordmark:'practikah'.
 * Content branches on lang='es' | 'en'.
 * Does NOT mention TOTP — recovery resets password only (D-04).
 * Includes 30-minute validity note and sign-in redirect after recovery.
 *
 * D-05: This function is called with the email address on file (physicians.email),
 * never with a caller-supplied address. The caller (request-link.ts) enforces this.
 */
export async function sendRecoveryEmail(
  opts: RecoveryEmailOptions
): Promise<SendEmailResult> {
  const { to, fullName, recoveryUrl, lang = 'en' } = opts;
  const lastName = getLastName(fullName);

  const content =
    lang === 'es'
      ? {
          subject: `Recupera el acceso a tu espacio Práctikah`,
          eyebrow: 'Red de Médicos · Práctikah',
          greeting: `Dr. ${lastName}, restablecer tu contraseña`,
          intro:
            'Recibimos una solicitud para restablecer la contraseña de tu espacio de trabajo Práctikah. Usa el enlace de abajo para establecer una nueva contraseña.',
          ctaHeading: 'Restablecer contraseña',
          ctaBody:
            'El enlace es válido por 30 minutos. Si no solicitaste esto, ignora este mensaje — tu cuenta permanece segura.',
          ctaButton: 'Restablecer contraseña',
          expiryNote:
            'Este enlace caduca en 30 minutos. Después de restablecer tu contraseña, inicia sesión en Práctikah con tus credenciales de Medikah. Se te solicitará tu código de autenticación de dos factores como de costumbre.',
          securityNote:
            'Por seguridad, este enlace solo puede usarse una vez. Si no solicitaste este restablecimiento de contraseña, contacta a soporte inmediatamente.',
          questions: '¿Preguntas? Escríbenos a',
          closing: 'Tu 2FA no cambia — solo la contraseña se restablece.',
          team: '— El Equipo de Práctikah · Medikah',
        }
      : {
          subject: `Recover your Práctikah workspace access`,
          eyebrow: 'Physician Network · Práctikah',
          greeting: `Dr. ${lastName}, reset your password`,
          intro:
            'We received a request to reset the password for your Práctikah workspace. Use the link below to set a new password.',
          ctaHeading: 'Reset your password',
          ctaBody:
            'The link is valid for 30 minutes. If you did not request this, please ignore this message — your account remains secure.',
          ctaButton: 'Reset password',
          expiryNote:
            'This link expires in 30 minutes. After resetting your password, sign in to Práctikah with your Medikah credentials. You will be prompted for your two-factor authentication code as usual.',
          securityNote:
            'For security, this link can only be used once. If you did not request this password reset, contact support immediately.',
          questions: 'Questions? Reach us at',
          closing: 'Your 2FA is unchanged — only the password is reset.',
          team: '— The Práctikah · Medikah Team',
        };

  const html = `<!DOCTYPE html>
<html lang="${lang}">
${emailHead()}
<body style="margin:0;padding:0;background-color:${tokens.pageBg};font-family:${tokens.fonts.ui};color:${tokens.colors.bodySlate};">
${emailHeader({ variant: 'navy', locale: lang, wordmark: 'practikah', eyebrow: content.eyebrow })}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${tokens.pageBg};padding:40px 20px;">
  <tr>
    <td align="center">
      <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" style="background-color:${tokens.colors.white};border-radius:${tokens.radii.md};overflow:hidden;">

        <!-- Greeting -->
        <tr>
          <td class="email-pad" style="padding:40px 32px 24px 32px;">
            <p style="font-family:${tokens.fonts.ui};color:${tokens.colors.clinicalTeal};font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 12px 0;">
              ${lang === 'es' ? 'Red de Médicos' : 'Physician Network'}
            </p>
            <h1 style="font-family:${tokens.fonts.body};color:${tokens.colors.deepCharcoal};font-size:24px;font-weight:700;margin:0 0 16px 0;">${content.greeting}</h1>
            <p style="font-family:${tokens.fonts.ui};color:${tokens.colors.bodySlate};font-size:16px;line-height:1.7;margin:0;">
              ${content.intro}
            </p>
          </td>
        </tr>

        <!-- CTA Block -->
        <tr>
          <td class="email-pad" style="padding:0 32px 32px 32px;">
            <div style="background-color:${tokens.colors.instBlue};border-radius:${tokens.radii.md};padding:28px;text-align:center;">
              <h2 style="font-family:${tokens.fonts.body};color:${tokens.colors.white};font-size:18px;font-weight:700;margin:0 0 12px 0;">
                ${content.ctaHeading}
              </h2>
              <p style="font-family:${tokens.fonts.ui};color:${tokens.colors.creamOnDark};font-size:14px;line-height:1.6;margin:0 0 20px 0;">
                ${content.ctaBody}
              </p>
              <a href="${recoveryUrl}" style="display:inline-block;background-color:${tokens.colors.clinicalTeal};color:${tokens.colors.white};font-family:${tokens.fonts.ui};font-size:16px;font-weight:700;text-decoration:none;padding:16px 32px;border-radius:${tokens.radii.sm};">
                ${content.ctaButton}
              </a>
            </div>
          </td>
        </tr>

        <!-- Expiry + 2FA Note -->
        <tr>
          <td class="email-pad" style="padding:0 32px 24px 32px;">
            <div style="background-color:${tokens.colors.linen};border-radius:${tokens.radii.sm};padding:16px;border:1px solid ${tokens.colors.borderLine};">
              <p style="font-family:${tokens.fonts.ui};color:${tokens.colors.bodySlate};font-size:13px;line-height:1.5;margin:0 0 8px 0;">
                ${content.expiryNote}
              </p>
              <p style="font-family:${tokens.fonts.ui};color:${tokens.colors.bodySlate};font-size:13px;line-height:1.5;margin:0;font-style:italic;">
                ${content.securityNote}
              </p>
            </div>
          </td>
        </tr>

        <!-- Closing -->
        <tr>
          <td class="email-pad" style="padding:0 32px 32px 32px;">
            <p style="font-family:${tokens.fonts.ui};color:${tokens.colors.bodySlate};font-size:14px;line-height:1.6;margin:0 0 8px 0;">
              ${content.questions} <a href="mailto:activacion@medikah.health" style="color:${tokens.colors.clinicalTeal};text-decoration:none;font-weight:600;">activacion@medikah.health</a>
            </p>
            <p style="font-family:${tokens.fonts.ui};color:${tokens.colors.bodySlate};font-size:15px;margin:20px 0 4px 0;">${content.closing}</p>
            <p style="font-family:${tokens.fonts.ui};color:${tokens.colors.instBlue};font-size:15px;font-weight:700;margin:0;">${content.team}</p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
${emailFooter({ locale: lang })}
</body>
</html>`;

  const text = `
${content.greeting}

${content.intro}

---

${content.ctaHeading}

${content.ctaBody}

${content.ctaButton}: ${recoveryUrl}

---

${content.expiryNote}

${content.securityNote}

---

${content.questions} activacion@medikah.health

${content.closing}

${content.team}

---
Práctikah · Medikah Corporation
  `.trim();

  return sendEmail({
    to,
    subject: content.subject,
    html,
    text,
  });
}
