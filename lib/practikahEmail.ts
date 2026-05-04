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

// ---------------------------------------------------------------------------
// Phase 13-09 — Pro lifecycle transactional emails (PRO-13 / OPS-12 / PRO-11)
// ---------------------------------------------------------------------------

/**
 * Shared bilingual layout for the simpler 13-09 transactional emails.
 *
 * Brand-color HTML (inst-blue header, body-slate body, clinical-teal CTA).
 * Inline styles only — most email clients strip <style> blocks.
 */
function renderBrandedEmail(opts: {
  preheader: string;
  heading: string;
  bodyHtml: string;
  cta?: { label: string; url: string };
  footer: string;
}): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://medikah.health';
  const ctaBlock = opts.cta
    ? `<p style="margin: 24px 0;"><a href="${opts.cta.url}" style="display: inline-block; background-color: #2C7A8C; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 16px; font-family: 'DM Sans', Arial, sans-serif; font-weight: 500;">${opts.cta.label}</a></p>`
    : '';
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${opts.heading}</title></head>
<body style="margin:0;padding:0;background-color:#F5F6F8;font-family:'Mulish',Arial,sans-serif;color:#4A5568;">
<span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;">${opts.preheader}</span>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#F5F6F8;padding:32px 0;"><tr><td align="center">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
<tr><td style="background-color:#1B2A41;padding:24px 40px;"><h1 style="color:#ffffff;font-family:'Oswald',Arial,sans-serif;font-size:22px;letter-spacing:0.08em;text-transform:uppercase;margin:0;">Práctikah by Medikah</h1></td></tr>
<tr><td style="padding:32px 40px;">
<h2 style="color:#1C1C1E;font-family:'Oswald',Arial,sans-serif;font-size:24px;letter-spacing:0.04em;margin:0 0 16px 0;">${opts.heading}</h2>
<div style="color:#4A5568;font-size:15px;line-height:1.6;">${opts.bodyHtml}</div>
${ctaBlock}
</td></tr>
<tr><td style="background-color:#1B2A41;padding:24px 40px;text-align:center;">
<p style="color:rgba(255,255,255,0.9);font-size:13px;font-weight:700;letter-spacing:0.06em;margin:0 0 8px 0;">${opts.footer}</p>
<p style="font-size:12px;margin:0;"><a href="${baseUrl}/privacy" style="color:rgba(255,255,255,0.6);text-decoration:none;">Privacy</a><span style="color:rgba(255,255,255,0.3);margin:0 8px;">|</span><a href="${baseUrl}/terms" style="color:rgba(255,255,255,0.6);text-decoration:none;">Terms</a><span style="color:rgba(255,255,255,0.3);margin:0 8px;">|</span><a href="mailto:practikah@medikah.health" style="color:rgba(255,255,255,0.6);text-decoration:none;">Contact</a></p>
</td></tr></table></td></tr></table></body></html>`;
}

// ---------- Pro live (PRO-13) ----------

export interface SendProLiveEmailParams {
  to: string;
  lang: 'en' | 'es';
  domain: string;
  firstName?: string;
  lastName?: string;
}

/**
 * PRO-13: bilingual "Your custom domain is live" email — fired by saga step 7
 * via the practikah-email-trigger BFF.
 */
export async function sendProLiveEmail(params: SendProLiveEmailParams): Promise<SendEmailResult> {
  const { to, lang, domain, lastName } = params;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://medikah.health';
  const dashboardUrl = `${baseUrl}/physicians/dashboard/workspace`;
  const greeting = lastName ? (lang === 'es' ? `Dr. ${lastName}` : `Dr. ${lastName}`) : (lang === 'es' ? 'Doctor' : 'Doctor');

  const content = lang === 'es' ? {
    subject: `Tu dominio ${domain} está activo`,
    preheader: `Tu sitio Práctikah ya está en ${domain}.`,
    heading: `${domain} ya está activo`,
    body: `<p>${greeting}, tu nuevo dominio Pro está en línea.</p>
      <p>Tu sitio Práctikah ahora se sirve directamente desde <strong>${domain}</strong>, y tu correo profesional ya recibe mensajes en este dominio. Los visitantes que lleguen a tu vista previa Try Pro serán redirigidos aquí automáticamente.</p>
      <p>Configura preferencias, revisa registros DNS o gestiona tu suscripción desde tu panel.</p>`,
    cta: 'Abrir mi panel',
    footer: 'Práctikah • Care Without Distance',
  } : {
    subject: `Your custom domain ${domain} is live`,
    preheader: `Your Práctikah site is now at ${domain}.`,
    heading: `${domain} is live`,
    body: `<p>${greeting}, your new Pro domain is online.</p>
      <p>Your Práctikah site is now served directly from <strong>${domain}</strong>, and your professional mailbox is receiving mail at this domain. Visitors hitting your Try Pro preview will be redirected here automatically.</p>
      <p>Adjust settings, review DNS records, or manage your subscription from your dashboard.</p>`,
    cta: 'Open my dashboard',
    footer: 'Práctikah • Care Without Distance',
  };

  const html = renderBrandedEmail({
    preheader: content.preheader,
    heading: content.heading,
    bodyHtml: content.body,
    cta: { label: content.cta, url: dashboardUrl },
    footer: content.footer,
  });
  return sendEmail({ to, subject: content.subject, html });
}

// ---------- Dunning supplement (D-27) ----------

export interface SendDunningSupplementEmailParams {
  to: string;
  lang: 'en' | 'es';
  graceDays: number;
}

/**
 * Bilingual supplement to Stripe Smart Retries' canonical retry emails. Sent
 * once on grace-period start (after the 3rd Smart Retries attempt fails).
 * Points the doctor to the Stripe Customer Portal to update their card.
 */
export async function sendDunningSupplementEmail(
  params: SendDunningSupplementEmailParams,
): Promise<SendEmailResult> {
  const { to, lang, graceDays } = params;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://medikah.health';
  const billingUrl = `${baseUrl}/physicians/dashboard/workspace/billing`;

  const content = lang === 'es' ? {
    subject: 'Tu Pro entra en período de gracia',
    preheader: `Tienes ${graceDays} días para actualizar tu tarjeta y mantener Pro.`,
    heading: 'Tu Pro entra en período de gracia',
    body: `<p>Stripe intentó cobrar tu suscripción Pro tres veces sin éxito. Comenzamos un período de gracia de <strong>${graceDays} días</strong> — durante este tiempo tu dominio personalizado, tu correo profesional y tu sitio siguen activos.</p>
      <p>Para evitar el cambio automático a tu plan gratis, actualiza tu método de pago. Toma menos de un minuto desde el portal de facturación.</p>
      <p>Tu dominio sigue siendo tuyo — siempre. Si decides salir, te enviaremos el código EPP de transferencia.</p>`,
    cta: 'Actualizar pago',
    footer: 'Práctikah • Care Without Distance',
  } : {
    subject: 'Your Pro is entering grace period',
    preheader: `You have ${graceDays} days to update your card and keep Pro active.`,
    heading: 'Your Pro is entering grace period',
    body: `<p>Stripe attempted to charge your Pro subscription three times without success. We're starting a <strong>${graceDays}-day grace period</strong> — during this window your custom domain, your professional mailbox, and your site stay active.</p>
      <p>To avoid the automatic switch back to your free plan, update your payment method. It takes under a minute from the billing portal.</p>
      <p>Your domain stays yours — always. If you decide to leave, we'll send your EPP transfer code.</p>`,
    cta: 'Update payment',
    footer: 'Práctikah • Care Without Distance',
  };

  const html = renderBrandedEmail({
    preheader: content.preheader,
    heading: content.heading,
    bodyHtml: content.body,
    cta: { label: content.cta, url: billingUrl },
    footer: content.footer,
  });
  return sendEmail({ to, subject: content.subject, html });
}

// ---------- Downgrade notice (D-28) ----------

export interface SendDowngradeNoticeEmailParams {
  to: string;
  lang: 'en' | 'es';
  domain: string;
  frozenHoldDays: number;
}

/**
 * Bilingual auto-downgrade notice sent when grace expires (or
 * customer.subscription.deleted). Explains what stays (free @medikah.health
 * mailbox and Try Pro preview), what's frozen (Pro custom-domain mailbox),
 * and the 30-day window to transfer the domain out (PRO-11).
 */
export async function sendDowngradeNoticeEmail(
  params: SendDowngradeNoticeEmailParams,
): Promise<SendEmailResult> {
  const { to, lang, domain, frozenHoldDays } = params;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://medikah.health';
  const billingUrl = `${baseUrl}/physicians/dashboard/workspace/billing`;

  const content = lang === 'es' ? {
    subject: `Volviste al plan gratis — tu dominio ${domain} sigue siendo tuyo`,
    preheader: 'Lo que sigue activo, lo que cambia y cómo recuperar Pro.',
    heading: 'Cambio a plan gratis',
    body: `<p>Tu suscripción Pro terminó. Aquí está exactamente lo que cambia:</p>
      <p><strong>Lo que sigue activo:</strong></p>
      <ul><li>Tu correo gratis en <strong>@medikah.health</strong> (siempre).</li>
      <li>Tu sitio Try Pro en <strong>tu-slug.medikah.health</strong> reanuda servicio directo.</li>
      <li>Tu dominio personalizado <strong>${domain}</strong> sigue siendo tuyo.</li></ul>
      <p><strong>Lo que cambia:</strong></p>
      <ul><li>Tu buzón en <strong>${domain}</strong> entra en modo de solo lectura — puedes leer mensajes y exportar tu archivo, pero no enviar ni recibir nuevos.</li>
      <li>El sitio Pro en <strong>${domain}</strong> deja de servirse desde Práctikah; el redirect 301 desaparece en 60 segundos.</li>
      <li>Tienes <strong>${frozenHoldDays} días</strong> para transferir tu dominio a otro registrador o reactivar Pro.</li></ul>
      <p>Si quieres regresar, actualiza tu pago desde el portal de facturación.</p>`,
    cta: 'Ir a facturación',
    footer: 'Práctikah • Care Without Distance',
  } : {
    subject: `You're back on free — your domain ${domain} is still yours`,
    preheader: 'What stays, what changes, and how to bring Pro back.',
    heading: 'Switched to free plan',
    body: `<p>Your Pro subscription ended. Here's exactly what changes:</p>
      <p><strong>What stays active:</strong></p>
      <ul><li>Your free <strong>@medikah.health</strong> mailbox (always).</li>
      <li>Your Try Pro site at <strong>your-slug.medikah.health</strong> resumes serving directly.</li>
      <li>Your custom domain <strong>${domain}</strong> stays yours.</li></ul>
      <p><strong>What changes:</strong></p>
      <ul><li>Your mailbox at <strong>${domain}</strong> goes read-only — you can read messages and export your archive, but cannot send or receive new mail.</li>
      <li>The Pro site at <strong>${domain}</strong> stops serving from Práctikah; the 301 redirect disappears within 60 seconds.</li>
      <li>You have <strong>${frozenHoldDays} days</strong> to transfer your domain out or reactivate Pro.</li></ul>
      <p>If you'd like to come back, update your payment from the billing portal.</p>`,
    cta: 'Open billing',
    footer: 'Práctikah • Care Without Distance',
  };

  const html = renderBrandedEmail({
    preheader: content.preheader,
    heading: content.heading,
    bodyHtml: content.body,
    cta: { label: content.cta, url: billingUrl },
    footer: content.footer,
  });
  return sendEmail({ to, subject: content.subject, html });
}

// ---------- EPP code delivery (PRO-11) ----------

export interface SendEppCodeDeliveryEmailParams {
  to: string;
  lang: 'en' | 'es';
  domain: string;
  eppCode: string;
}

/**
 * PRO-11: bilingual EPP/auth-code delivery email. Doctor receives this
 * synchronously upon requesting transfer-out from the dashboard. The code
 * is also returned in the BFF response body for instant copy-to-clipboard.
 *
 * The transfer-out flow requires the doctor to paste this code at the
 * gaining registrar to authorize the transfer.
 */
export async function sendEppCodeDeliveryEmail(
  params: SendEppCodeDeliveryEmailParams,
): Promise<SendEmailResult> {
  const { to, lang, domain, eppCode } = params;

  const content = lang === 'es' ? {
    subject: `Tu código EPP para transferir ${domain}`,
    preheader: 'Tu código de autorización de transferencia de dominio.',
    heading: `Código EPP para ${domain}`,
    body: `<p>Aquí está el código de autorización (EPP) para transferir <strong>${domain}</strong> a otro registrador:</p>
      <p style="background-color:#F0EAE0;padding:16px 20px;border-radius:16px;font-family:'Courier New',monospace;font-size:18px;letter-spacing:0.04em;color:#1C1C1E;word-break:break-all;"><strong>${eppCode}</strong></p>
      <p>Pégalo en tu nuevo registrador para autorizar la transferencia. El código expira generalmente en 30 días.</p>
      <p>Mientras la transferencia se completa, tu buzón en <strong>${domain}</strong> queda en modo de solo lectura. Puedes exportar tu archivo desde tu panel.</p>
      <p>Cuando la transferencia llegue al registrador receptor, eliminamos los registros de Práctikah para ${domain}.</p>`,
    footer: 'Práctikah • Care Without Distance',
  } : {
    subject: `Your EPP code to transfer ${domain}`,
    preheader: 'Your domain transfer authorization code.',
    heading: `EPP code for ${domain}`,
    body: `<p>Here is your transfer authorization (EPP) code for <strong>${domain}</strong>:</p>
      <p style="background-color:#F0EAE0;padding:16px 20px;border-radius:16px;font-family:'Courier New',monospace;font-size:18px;letter-spacing:0.04em;color:#1C1C1E;word-break:break-all;"><strong>${eppCode}</strong></p>
      <p>Paste it at your new registrar to authorize the transfer. The code typically expires in 30 days.</p>
      <p>While the transfer completes, your mailbox at <strong>${domain}</strong> stays in read-only mode. You can export your archive from your dashboard.</p>
      <p>Once the gaining registrar finalizes the transfer, we'll remove our Práctikah records for ${domain}.</p>`,
    footer: 'Práctikah • Care Without Distance',
  };

  const html = renderBrandedEmail({
    preheader: content.preheader,
    heading: content.heading,
    bodyHtml: content.body,
    footer: content.footer,
  });
  return sendEmail({ to, subject: content.subject, html });
}
