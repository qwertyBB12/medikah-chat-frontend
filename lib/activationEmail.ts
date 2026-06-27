/**
 * Workspace activation email utilities — Phase 17 (FLOW-03)
 *
 * Sends the Práctikah-branded bilingual magic-link activation email and
 * implements the idempotent triggerWorkspaceActivation helper that is wired
 * into both verification-flip code paths in verificationService.ts.
 *
 * Security contract (T-17-02-01 / T-17-02-05):
 *   - Raw activation tokens are NEVER console-logged.
 *   - Activation email is sent at most once per non-consumed, non-expired token
 *     window (idempotent — D-02 / FLOW-03).
 *   - Sender is PRACTIKAH_EMAIL_FROM (official monitored Práctikah address).
 */

import crypto from 'crypto';
import { tokens, emailHead, emailHeader, emailFooter } from './emailChrome';
import { signActivationToken, hashToken, ACTIVATION_TTL_MINUTES } from './auth/activationTokens';
import { supabaseAdmin } from './supabaseServer';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

export interface ActivationEmailOptions {
  to: string;
  fullName: string;
  activationUrl: string;
  lang?: 'en' | 'es';
}

/**
 * Outcome of triggerWorkspaceActivation. Lets callers (admin verify / resend
 * endpoints) surface the truth instead of a silent no-op that always reads
 * "sent". 'mailbox_not_provisioned' is the Option B gate — see the function doc.
 */
export type ActivationTriggerResult =
  | { status: 'sent' }
  | {
      status: 'skipped';
      reason:
        | 'not_configured'
        | 'physician_not_found'
        | 'lookup_error'
        | 'mailbox_not_provisioned'
        | 'token_active';
    }
  | { status: 'failed'; reason: 'token_insert_error' | 'send_error' };

// ---------------------------------------------------------------------------
// sendEmail — internal Resend helper (mirrors physicianEmail.ts pattern)
// ---------------------------------------------------------------------------

async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  // D-03 / D-04: official monitored Práctikah sender — replies must not bounce
  const fromEmail =
    process.env.PRACTIKAH_EMAIL_FROM || 'activacion@medikah.health';

  if (!apiKey) {
    console.warn('[activationEmail] RESEND_API_KEY not configured. Email not sent.');
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
      console.error('[activationEmail] Resend error:', errBody);
      return { success: false, error: errBody.message || 'Failed to send email' };
    }

    const result = await response.json();
    return { success: true, id: result.id };
  } catch (err) {
    console.error('[activationEmail] sendEmail exception:', err);
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
// sendActivationEmail — Práctikah-branded bilingual activation email
// ---------------------------------------------------------------------------

/**
 * Send the Práctikah workspace activation magic-link email.
 *
 * Uses the navy variant header with wordmark:'practikah'.
 * Content branches on lang='es' | 'en' — both subject lines and body copy.
 * Includes TOTP recommentation copy: Duo Mobile recommended, Authy / Google
 * Authenticator listed as alternatives.
 */
export async function sendActivationEmail(
  opts: ActivationEmailOptions
): Promise<SendEmailResult> {
  const { to, fullName, activationUrl, lang = 'en' } = opts;
  const lastName = getLastName(fullName);

  // Bilingual content — institutional/system tone (Práctikah brand voice)
  const content =
    lang === 'es'
      ? {
          subject: `Configure su espacio de trabajo — Práctikah`,
          eyebrow: 'Red de Médicos · Práctikah',
          greeting: `Dr. ${lastName}, su espacio de trabajo está listo`,
          intro:
            'Su cuenta de médico ha sido verificada. Complete la configuración inicial para acceder a su espacio de trabajo clínico de Práctikah.',
          ctaHeading: 'Configure su acceso',
          ctaBody:
            'Use el enlace de abajo para establecer su contraseña y activar la verificación en dos pasos. El enlace es válido por 24 horas.',
          ctaButton: 'Activar espacio de trabajo',
          expiryNote: 'Este enlace caduca en 24 horas. Si ya no es válido, puede solicitar uno nuevo desde la página de activación.',
          totpHeading: 'Verificación en dos pasos',
          totpBody:
            'Durante la activación configurará una aplicación de autenticación para proteger su cuenta. Se recomienda Duo Mobile; Authy y Google Authenticator también son compatibles.',
          questions: '¿Preguntas? Escríbanos a',
          closing: 'Bienvenido a Práctikah.',
          team: '— El Equipo de Práctikah · Medikah',
        }
      : {
          subject: `Set up your Práctikah workspace`,
          eyebrow: 'Physician Network · Práctikah',
          greeting: `Dr. ${lastName}, your workspace is ready`,
          intro:
            'Your physician account has been verified. Complete the initial setup to access your Práctikah clinical workspace.',
          ctaHeading: 'Configure your access',
          ctaBody:
            'Use the link below to set your password and activate two-step verification. The link is valid for 24 hours.',
          ctaButton: 'Activate workspace',
          expiryNote: 'This link expires in 24 hours. If it is no longer valid, you can request a new one from the activation page.',
          totpHeading: 'Two-step verification',
          totpBody:
            'During activation you will set up an authenticator app to secure your account. Duo Mobile is recommended; Authy and Google Authenticator are also supported.',
          questions: 'Questions? Reach us at',
          closing: 'Welcome to Práctikah.',
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
              <a href="${activationUrl}" style="display:inline-block;background-color:${tokens.colors.clinicalTeal};color:${tokens.colors.white};font-family:${tokens.fonts.ui};font-size:16px;font-weight:700;text-decoration:none;padding:16px 32px;border-radius:${tokens.radii.sm};">
                ${content.ctaButton}
              </a>
            </div>
          </td>
        </tr>

        <!-- Expiry Note -->
        <tr>
          <td class="email-pad" style="padding:0 32px 24px 32px;">
            <div style="background-color:${tokens.colors.linen};border-radius:${tokens.radii.sm};padding:16px;border:1px solid ${tokens.colors.borderLine};">
              <p style="font-family:${tokens.fonts.ui};color:${tokens.colors.bodySlate};font-size:13px;line-height:1.5;margin:0;">
                ${content.expiryNote}
              </p>
            </div>
          </td>
        </tr>

        <!-- TOTP Section -->
        <tr>
          <td class="email-pad" style="padding:0 32px 32px 32px;">
            <h3 style="font-family:${tokens.fonts.body};color:${tokens.colors.instBlue};font-size:16px;font-weight:700;margin:0 0 12px 0;">${content.totpHeading}</h3>
            <p style="font-family:${tokens.fonts.ui};color:${tokens.colors.bodySlate};font-size:14px;line-height:1.6;margin:0;">
              ${content.totpBody}
            </p>
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

${content.ctaButton}: ${activationUrl}

---

${content.expiryNote}

---

${content.totpHeading}

${content.totpBody}

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

// ---------------------------------------------------------------------------
// triggerWorkspaceActivation — idempotent activation trigger (FLOW-03)
// ---------------------------------------------------------------------------

/**
 * Generate and send a workspace activation magic-link email for a physician.
 *
 * Idempotent by default: if a non-consumed, non-expired activation token already
 * exists, returns without sending a duplicate (D-02 / FLOW-03 — "at most once").
 *
 * Pass `{ force: true }` to expire any live token first and always issue a fresh
 * link. Use for admin resend — the email may have been lost and the doctor is
 * waiting. Auto-callers (verify flip, wizard complete) should NOT use force.
 *
 * Option B gate: activation email is blocked until the Mailcow mailbox exists.
 * set-password.ts resolves the mailbox via physician_workspace_accounts.mailbox_local_part;
 * sending before provisioning dead-ends (404 + burned token). The gate stands even
 * when force=true — force only bypasses the "token already active" guard.
 *
 * Security: raw token is never console-logged (T-17-02-05).
 */
export async function triggerWorkspaceActivation(
  physicianId: string,
  options?: { force?: boolean },
): Promise<ActivationTriggerResult> {
  const force = options?.force ?? false;
  if (!supabaseAdmin) {
    console.error('[activationEmail] supabaseAdmin not configured — cannot trigger activation');
    return { status: 'skipped', reason: 'not_configured' };
  }

  // Load physician record (email, name, preferred locale)
  const { data: physician, error: fetchError } = await supabaseAdmin
    .from('physicians')
    .select('id, email, full_name, onboarding_language')
    .eq('id', physicianId)
    .maybeSingle();

  if (fetchError || !physician) {
    console.error('[activationEmail] physician not found for activation trigger', { physicianId });
    return { status: 'skipped', reason: 'physician_not_found' };
  }

  // --- Option B gate: do NOT send until the Mailcow mailbox is provisioned ---
  // mailbox_local_part is the exact field set-password.ts requires; gating on the
  // same field means the activation link can never dead-end at set-password (404 +
  // burned token) for a not-yet-provisioned doctor.
  const { data: workspace, error: workspaceError } = await supabaseAdmin
    .from('physician_workspace_accounts')
    .select('mailbox_local_part')
    .eq('physician_id', physicianId)
    .maybeSingle();

  if (workspaceError) {
    console.error('[activationEmail] error querying workspace account for activation gate', { physicianId });
    return { status: 'skipped', reason: 'lookup_error' };
  }

  if (!workspace?.mailbox_local_part) {
    // Mailbox not provisioned yet — activation would dead-end. Caller surfaces this.
    console.info('[activationEmail] activation NOT sent — mailbox not provisioned yet', { physicianId });
    return { status: 'skipped', reason: 'mailbox_not_provisioned' };
  }

  // Idempotency check: is there already a valid non-consumed token?
  const now = new Date().toISOString();
  const { data: existingToken, error: tokenFetchError } = await supabaseAdmin
    .from('physician_activation_tokens')
    .select('id')
    .eq('physician_id', physicianId)
    .is('consumed_at', null)
    .gt('expires_at', now)
    .maybeSingle();

  if (tokenFetchError) {
    console.error('[activationEmail] error querying existing tokens', { physicianId });
    return { status: 'skipped', reason: 'lookup_error' };
  }

  if (existingToken) {
    if (!force) {
      // Valid non-consumed token already exists — do not send a duplicate
      return { status: 'skipped', reason: 'token_active' };
    }
    // force=true: expire the live token so a fresh link can be issued
    const { error: expireError } = await supabaseAdmin
      .from('physician_activation_tokens')
      .update({ expires_at: now })
      .eq('physician_id', physicianId)
      .is('consumed_at', null)
      .gt('expires_at', now);
    if (expireError) {
      console.error('[activationEmail] failed to expire live token for force-resend', { physicianId });
      return { status: 'skipped', reason: 'lookup_error' };
    }
  }

  // Generate a new single-use token
  const jti = crypto.randomUUID();
  const lang = (physician.onboarding_language as 'en' | 'es') || 'en';

  // signActivationToken returns the raw signed JWT (never log it)
  const token = await signActivationToken({
    physician_id: physicianId,
    email: physician.email,
    jti,
  });

  // Store only the hash in the DB (single-use enforcement). TTL is the shared
  // ACTIVATION_TTL_MINUTES so the DB row and the JWT exp never drift.
  const expiresAt = new Date(Date.now() + ACTIVATION_TTL_MINUTES * 60 * 1000).toISOString();
  const { error: insertError } = await supabaseAdmin
    .from('physician_activation_tokens')
    .insert({
      physician_id: physicianId,
      token_hash: hashToken(token),
      expires_at: expiresAt,
    });

  if (insertError) {
    console.error('[activationEmail] failed to insert activation token row', { physicianId });
    return { status: 'failed', reason: 'token_insert_error' };
  }

  // Build absolute activation URL — token embedded in path per 17-02 spec
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://medikah.health';
  const activationUrl = `${baseUrl}/auth/activate/${token}`;

  // Send the email
  const sendResult = await sendActivationEmail({
    to: physician.email,
    fullName: physician.full_name,
    activationUrl,
    lang,
  });

  if (!sendResult.success) {
    console.error('[activationEmail] activation email send failed', { physicianId });
    return { status: 'failed', reason: 'send_error' };
  }

  return { status: 'sent' };
}
