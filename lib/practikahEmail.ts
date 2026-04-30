/**
 * Práctikah workspace welcome email utilities (Phase 12-02)
 * Handles the bilingual EN/ES "Práctikah is live" transactional email sent when
 * a physician completes the free-tier workspace onboarding wizard (WSPC-08).
 *
 * Mirrors lib/physicianEmail.ts structure — same Resend API pattern, same
 * bilingual ternary content map, same inline-HTML template approach.
 *
 * Trust boundary: This file is a server-side lib. It MUST NOT be imported from
 * React components (would expose RESEND_API_KEY to the client bundle).
 * Only imported by pages/api/internal/practikah-email-trigger.ts (T-12-02-04).
 *
 * Deployment notes:
 *   From address: PRACTIKAH_EMAIL_FROM env var (default: practikah@medikah.health)
 *   Sent from the medikah.health verified domain in Resend.
 */

interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

export interface SendPracikahLiveEmailParams {
  to: string;
  lang: 'en' | 'es';
  mailboxAddress: string;
  slug: string;
  firstName: string;
  lastName: string;
}

// ---------------------------------------------------------------------------
// Internal Resend HTTP helper (mirrors physicianEmail.ts:sendEmail)
// ---------------------------------------------------------------------------

async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const configuredFrom = process.env.PRACTIKAH_EMAIL_FROM;
  if (!configuredFrom) {
    // T-12-07-05: Log operator action item — set up practikah@medikah.health alias post-deploy
    console.warn(
      '[practikahEmail] PRACTIKAH_EMAIL_FROM is not set — falling back to practikah@medikah.health. ' +
      'Set up the practikah@medikah.health sender alias in Resend or configure PRACTIKAH_EMAIL_FROM env var.',
    );
  }
  const defaultFrom = configuredFrom || 'practikah@medikah.health';
  const fromAddress = options.from || defaultFrom;

  if (!apiKey) {
    console.warn('[practikahEmail] RESEND_API_KEY not configured — email not sent.');
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
        from: `Práctikah by Medikah <${fromAddress}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[practikahEmail] send failed:', error);
      return { success: false, error: error.message || 'Failed to send email' };
    }

    const result = await response.json();
    return { success: true, id: result.id };
  } catch (error) {
    console.error('[practikahEmail] send error:', error);
    return { success: false, error: 'Failed to send email' };
  }
}

// ---------------------------------------------------------------------------
// "Práctikah is live" welcome email (WSPC-08)
// ---------------------------------------------------------------------------

/**
 * Send the bilingual EN/ES "Práctikah is live" transactional email.
 *
 * Triggered by POST /api/internal/practikah-email-trigger (called by FastAPI
 * services/practikah/notifications.py after a successful free-tier wizard completion).
 *
 * The email includes:
 *   - Celebratory headline: "You're on Práctikah, Dr. {lastName}!"
 *   - Mailbox address card with Open Mailbox CTA (→ mail.medikah.health)
 *   - IMAP setup link (→ dashboard Settings tab)
 *   - Try Pro preview site link (→ {slug}.medikah.health)
 *   - Bilingual footer with Care Without Distance tagline
 */
export async function sendPracikahLiveEmail(
  params: SendPracikahLiveEmailParams
): Promise<SendEmailResult> {
  const { to, lang, mailboxAddress, slug, firstName, lastName } = params;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://medikah.health';
  const previewUrl = `https://${slug}.medikah.health`;
  const settingsUrl = `${baseUrl}/physicians/dashboard/workspace?tab=settings`;
  const mailUrl = 'https://mail.medikah.health';

  // Bilingual content map (EN/ES)
  const content =
    lang === 'es'
      ? {
          subject: `Práctikah está en vivo, Dr. ${lastName}`,
          heading: `¡Estás en Práctikah, Dr. ${firstName}!`,
          subheading: 'Tu espacio de trabajo profesional ya está configurado.',
          mailboxLabel: 'Tu nuevo correo profesional:',
          mailboxHint: 'Este es tu buzón dedicado en Práctikah.',
          openMailboxBtn: 'Abrir Buzón',
          imapHeading: '¿Quieres usar Apple Mail / Outlook / Gmail?',
          imapHint: 'Configura el acceso IMAP desde tu panel de configuración.',
          imapBtn: 'Configurar IMAP',
          previewHeading: 'Tu sitio Práctikah (Try Pro):',
          previewHint: 'Comparte tu perfil profesional con pacientes.',
          previewBtn: 'Ver Sitio',
          upgradeNote:
            '¿Quieres este sitio en tu propio dominio? Descúbre Pro cuando estés listo.',
          questions: '¿Preguntas? Escríbenos a',
          closing: 'Bienvenido a Práctikah.',
          team: '— El equipo de Medikah',
          footer: 'Práctikah • Care Without Distance',
          footerDisclaimer:
            'Práctikah es el espacio de trabajo profesional para médicos de Medikah. ' +
            'Este correo es transaccional — se envió porque completaste el asistente de configuración.',
        }
      : {
          subject: `Práctikah is live, Dr. ${lastName}`,
          heading: `You're on Práctikah, Dr. ${firstName}!`,
          subheading: 'Your professional workspace is set up.',
          mailboxLabel: 'Your new professional mailbox:',
          mailboxHint: 'This is your dedicated Práctikah inbox.',
          openMailboxBtn: 'Open Mailbox',
          imapHeading: 'Want to use Apple Mail / Outlook / Gmail?',
          imapHint: 'Set up IMAP access from your workspace settings.',
          imapBtn: 'Configure IMAP',
          previewHeading: 'Your Práctikah site (Try Pro):',
          previewHint: 'Share your professional profile with patients.',
          previewBtn: 'View Site',
          upgradeNote:
            'Want this site at your own domain? Discover Pro when you\'re ready.',
          questions: 'Questions? Reach us at',
          closing: 'Welcome to Práctikah.',
          team: '— The Medikah team',
          footer: 'Práctikah • Care Without Distance',
          footerDisclaimer:
            'Práctikah is the professional workspace for Medikah physicians. ' +
            'This is a transactional email — sent because you completed the workspace setup wizard.',
        };

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${content.subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F0EAE0; font-family: 'Mulish', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F0EAE0; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(27,42,65,0.10);">

          <!-- Header: Wordmark + Práctikah subhead -->
          <tr>
            <td style="background-color: #1B2A41; padding: 32px; text-align: center;">
              <p style="font-size: 28px; font-weight: 800; color: #ffffff; letter-spacing: -0.01em; margin: 0; font-family: 'Mulish', sans-serif;">medikah</p>
              <p style="font-size: 14px; color: #2C7A8C; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; margin: 10px 0 0 0;">
                Práctikah
              </p>
            </td>
          </tr>

          <!-- Celebratory heading -->
          <tr>
            <td style="padding: 40px 40px 24px 40px; text-align: center;">
              <h1 style="color: #1B2A41; font-size: 26px; font-weight: 800; margin: 0 0 12px 0; line-height: 1.2;">
                ${content.heading}
              </h1>
              <p style="color: #4A5568; font-size: 16px; line-height: 1.7; margin: 0;">
                ${content.subheading}
              </p>
            </td>
          </tr>

          <!-- Mailbox address card -->
          <tr>
            <td style="padding: 0 40px 28px 40px;">
              <div style="background: linear-gradient(135deg, #1B2A41 0%, #243659 100%); border-radius: 16px; padding: 28px; text-align: center;">
                <p style="color: rgba(255,255,255,0.7); font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 10px 0;">
                  ${content.mailboxLabel}
                </p>
                <p style="color: #2C7A8C; font-size: 20px; font-weight: 800; margin: 0 0 8px 0; letter-spacing: -0.01em; word-break: break-all;">
                  ${mailboxAddress}
                </p>
                <p style="color: rgba(255,255,255,0.55); font-size: 13px; margin: 0 0 24px 0;">
                  ${content.mailboxHint}
                </p>
                <a href="${mailUrl}"
                   style="display: inline-block; background-color: #2C7A8C; color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 12px rgba(44,122,140,0.35);">
                  ${content.openMailboxBtn}
                </a>
              </div>
            </td>
          </tr>

          <!-- IMAP CTA -->
          <tr>
            <td style="padding: 0 40px 28px 40px;">
              <div style="background-color: #F5F6F8; border-radius: 12px; padding: 24px; border-left: 4px solid #2C7A8C;">
                <p style="color: #1B2A41; font-size: 15px; font-weight: 700; margin: 0 0 6px 0;">
                  ${content.imapHeading}
                </p>
                <p style="color: #4A5568; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
                  ${content.imapHint}
                </p>
                <a href="${settingsUrl}"
                   style="display: inline-block; background-color: #1B2A41; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 8px;">
                  ${content.imapBtn}
                </a>
              </div>
            </td>
          </tr>

          <!-- Try Pro preview site CTA -->
          <tr>
            <td style="padding: 0 40px 28px 40px;">
              <div style="background-color: #F0EAE0; border-radius: 12px; padding: 24px; border-left: 4px solid #1B2A41;">
                <p style="color: #1B2A41; font-size: 15px; font-weight: 700; margin: 0 0 6px 0;">
                  ${content.previewHeading}
                </p>
                <p style="color: #4A5568; font-size: 14px; line-height: 1.6; margin: 0 0 4px 0;">
                  ${content.previewHint}
                </p>
                <p style="color: #2C7A8C; font-size: 13px; margin: 0 0 16px 0; word-break: break-all;">
                  ${previewUrl}
                </p>
                <a href="${previewUrl}"
                   style="display: inline-block; background-color: #2C7A8C; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 8px;">
                  ${content.previewBtn}
                </a>
              </div>
            </td>
          </tr>

          <!-- Upgrade teaser (non-interstitial per D-20) -->
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <p style="color: #8A8D91; font-size: 13px; line-height: 1.6; margin: 0; font-style: italic;">
                ${content.upgradeNote}
              </p>
            </td>
          </tr>

          <!-- Closing -->
          <tr>
            <td style="padding: 0 40px 32px 40px; border-top: 1px solid #E5E7EB;">
              <p style="color: #4A5568; font-size: 14px; line-height: 1.6; margin: 24px 0 8px 0;">
                ${content.questions}
                <a href="mailto:practikah@medikah.health" style="color: #2C7A8C; text-decoration: none; font-weight: 600;">practikah@medikah.health</a>
              </p>
              <p style="color: #4A5568; font-size: 15px; margin: 16px 0 4px 0;">${content.closing}</p>
              <p style="color: #1B2A41; font-size: 15px; font-weight: 700; margin: 0;">${content.team}</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #1B2A41; padding: 24px 40px; text-align: center;">
              <p style="color: rgba(255,255,255,0.9); font-size: 13px; font-weight: 700; letter-spacing: 0.06em; margin: 0 0 10px 0;">
                ${content.footer}
              </p>
              <p style="color: rgba(255,255,255,0.45); font-size: 11px; line-height: 1.6; margin: 0 0 12px 0;">
                ${content.footerDisclaimer}
              </p>
              <p style="font-size: 12px; margin: 0;">
                <a href="${baseUrl}/privacy" style="color: rgba(255,255,255,0.6); text-decoration: none;">Privacy</a>
                <span style="color: rgba(255,255,255,0.3); margin: 0 8px;">|</span>
                <a href="${baseUrl}/terms" style="color: rgba(255,255,255,0.6); text-decoration: none;">Terms</a>
                <span style="color: rgba(255,255,255,0.3); margin: 0 8px;">|</span>
                <a href="mailto:practikah@medikah.health" style="color: rgba(255,255,255,0.6); text-decoration: none;">Contact</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    content.heading,
    '',
    content.subheading,
    '',
    `${content.mailboxLabel} ${mailboxAddress}`,
    `${content.openMailboxBtn}: ${mailUrl}`,
    '',
    `${content.imapHeading}`,
    `${content.imapBtn}: ${settingsUrl}`,
    '',
    `${content.previewHeading} ${previewUrl}`,
    `${content.previewBtn}: ${previewUrl}`,
    '',
    content.upgradeNote,
    '',
    `${content.questions} practikah@medikah.health`,
    '',
    content.closing,
    content.team,
    '',
    '---',
    content.footer,
  ].join('\n');

  return sendEmail({
    to,
    subject: content.subject,
    html,
    text,
  });
}
