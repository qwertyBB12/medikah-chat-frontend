/**
 * Physician email utilities
 * Handles welcome emails, password setup, and other physician communications.
 * Brand chrome (head/header/footer + tokens) comes from `./emailChrome`.
 */

import {
  tokens,
  emailHead,
  emailHeader,
  emailFooter,
} from './emailChrome';

interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

// Send email via Resend API
async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || 'welcome@medikah.health';

  if (!apiKey) {
    console.warn('RESEND_API_KEY not configured. Email not sent.');
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
        from: `Medikah <${fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Email send failed:', error);
      return { success: false, error: error.message || 'Failed to send email' };
    }

    const result = await response.json();
    return { success: true, id: result.id };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: 'Failed to send email' };
  }
}

// Helper to get last name from full name
function getLastName(fullName: string): string {
  const parts = fullName.trim().split(' ');
  return parts.length > 1 ? parts[parts.length - 1] : parts[0];
}

export type PhysicianEmailTitle = 'Dr' | 'Dra';

/**
 * Honorific-correct address line. The title comes from physicians.title
 * (captured at onboarding / confirmed by admin) and is NEVER guessed from
 * the name. When no title is on file we address by full name — no honorific.
 */
function addressedName(
  fullName: string,
  title: PhysicianEmailTitle | null | undefined
): string {
  if (title === 'Dr' || title === 'Dra') {
    return `${title}. ${getLastName(fullName)}`;
  }
  return fullName.trim();
}

// Minimal HTML escape for admin/free-text values interpolated into templates
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Helper to format languages
function formatLanguages(langs: string[]): string {
  const langNames: Record<string, string> = {
    en: 'English',
    es: 'Spanish',
    pt: 'Portuguese',
    fr: 'French',
    de: 'German',
    it: 'Italian',
    zh: 'Chinese',
    ja: 'Japanese',
    ko: 'Korean',
    ar: 'Arabic',
    hi: 'Hindi',
    ru: 'Russian',
  };
  return langs.map((l) => langNames[l] || l).join(', ') || '—';
}

export interface PhysicianWelcomeEmailData {
  physicianId: string;
  fullName: string;
  email: string;
  primarySpecialty?: string;
  languages: string[];
  /** Honorific from physicians.title — never guessed (feedback_dr_dra_title_mexico). */
  title?: PhysicianEmailTitle | null;
  lang?: 'en' | 'es';
}

/**
 * Send welcome email to newly onboarded physician.
 *
 * 2026-07 refresh (doctor-journey fix wave):
 * - Honorific-correct greeting (Dr./Dra. from captured title; full name when absent).
 * - Honest verification timeline (manual credential review, 2-5 business days) —
 *   the old "24-48 hours" promise predated manual cédula review.
 * - No magic-link/password block: Option A doctors already sign in via /chat
 *   with the method they signed up with; the @medikah.health activation email
 *   arrives separately once verified.
 */
export async function sendPhysicianWelcomeEmail(
  data: PhysicianWelcomeEmailData
): Promise<SendEmailResult> {
  const { fullName, email, primarySpecialty, languages, title, lang = 'en' } = data;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://medikah.health';
  const name = addressedName(fullName, title);
  const hasTitle = title === 'Dr' || title === 'Dra';
  const formattedLanguages = formatLanguages(languages);
  const dashboardUrl = `${baseUrl}${lang === 'es' ? '/es' : ''}/chat`;

  // Bilingual content
  const content =
    lang === 'es'
      ? {
          subject: hasTitle
            ? `${title === 'Dra' ? 'Bienvenida' : 'Bienvenido'} a Medikah, ${name} — Su perfil está en revisión`
            : `Le damos la bienvenida a Medikah — Su perfil está en revisión`,
          greeting: hasTitle
            ? `¡${title === 'Dra' ? 'Bienvenida' : 'Bienvenido'} a Medikah, ${name}!`
            : `¡Le damos la bienvenida a Medikah, ${name}!`,
          intro: `Gracias por unirse a la red de Medikah. Su perfil ha sido creado exitosamente y su expediente está listo para revisión.`,
          profileCreated: `Su perfil de médico está creado`,
          specialty: 'Especialidad',
          languagesLabel: 'Idiomas',
          verificationNote:
            'Nuestro equipo revisa sus credenciales de forma manual (cédula profesional o licencia médica). Este proceso típicamente toma de 2 a 5 días hábiles. Le notificaremos en cuanto la verificación esté completa.',
          dashboardHeading: 'Acceda a su panel',
          dashboardNote:
            'Mientras tanto, puede entrar a su panel de Medikah iniciando sesión de la misma forma en que creó su cuenta.',
          dashboardButton: 'Ir a mi panel',
          whatsNext: 'Qué sigue:',
          step1: 'Verificación de credenciales (2 a 5 días hábiles)',
          step1Detail:
            'Nuestro equipo verifica su cédula o licencia con las autoridades correspondientes.',
          step2: 'Su correo @medikah.health',
          step2Detail:
            'Al completarse la verificación, recibirá un correo de activación con su cuenta profesional @medikah.health y su espacio de trabajo.',
          step3: 'Su perfil público y sus primeros pacientes',
          step3Detail:
            'Una vez en línea, los pacientes podrán encontrar su perfil en la red de Medikah y agendar consultas por video.',
          profileNote:
            'Su perfil de Medikah está siendo preparado. Le notificaremos cuando esté disponible públicamente.',
          questions: '¿Preguntas? Responda a este correo o escríbanos a',
          closing: 'Gracias por su confianza.',
          team: '— El Equipo de Medikah',
        }
      : {
          subject: hasTitle
            ? `Welcome to Medikah, ${name} — Your profile is in review`
            : `Welcome to Medikah — Your profile is in review`,
          greeting: `Welcome to Medikah, ${name}!`,
          intro: `Thank you for joining the Medikah network. Your profile has been successfully created and your credentials are ready for review.`,
          profileCreated: `Your physician profile is created`,
          specialty: 'Specialty',
          languagesLabel: 'Languages',
          verificationNote:
            'Our team manually reviews your credentials (professional license or cédula). This typically takes 2 to 5 business days. We\'ll notify you as soon as verification is complete.',
          dashboardHeading: 'Access your dashboard',
          dashboardNote:
            'In the meantime, you can access your Medikah dashboard by signing in the same way you created your account.',
          dashboardButton: 'Go to my dashboard',
          whatsNext: "What's next:",
          step1: 'Credential verification (2 to 5 business days)',
          step1Detail:
            'Our team verifies your license or cédula with the appropriate authorities.',
          step2: 'Your @medikah.health email',
          step2Detail:
            'Once verified, you\'ll receive an activation email with your professional @medikah.health account and workspace.',
          step3: 'Your public profile and first patients',
          step3Detail:
            'Once live, patients will be able to find your profile on the Medikah network and book video consultations.',
          profileNote:
            "Your Medikah profile is being prepared. We'll notify you when it's publicly available.",
          questions: 'Questions? Reply to this email or reach us at',
          closing: 'Thank you for your trust.',
          team: '— The Medikah Team',
        };

  const html = `<!DOCTYPE html>
<html lang="${lang}">
${emailHead()}
<body style="margin:0;padding:0;background-color:${tokens.pageBg};font-family:${tokens.fonts.ui};color:${tokens.colors.bodySlate};">
${emailHeader({ variant: 'linen', locale: lang, wordmark: 'medikah' })}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${tokens.pageBg};padding:40px 20px;">
  <tr>
    <td align="center">
      <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" style="background-color:${tokens.colors.white};border-radius:${tokens.radii.md};overflow:hidden;">

        <!-- Welcome Message -->
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

        <!-- Profile Summary Card -->
        <tr>
          <td class="email-pad" style="padding:0 32px 24px 32px;">
            <div style="background-color:${tokens.colors.linen};border-left:4px solid ${tokens.colors.instBlue};padding:20px 24px;border-radius:${tokens.radii.sm};">
              <p style="font-family:${tokens.fonts.ui};color:${tokens.colors.instBlue};font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 12px 0;">
                ${content.profileCreated}
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:${tokens.fonts.ui};font-size:15px;">
                <tr>
                  <td style="color:${tokens.colors.bodySlate};padding:6px 0;width:100px;">${content.specialty}</td>
                  <td style="color:${tokens.colors.instBlue};padding:6px 0;font-weight:600;">${primarySpecialty || '—'}</td>
                </tr>
                <tr>
                  <td style="color:${tokens.colors.bodySlate};padding:6px 0;">${content.languagesLabel}</td>
                  <td style="color:${tokens.colors.instBlue};padding:6px 0;font-weight:600;">${formattedLanguages}</td>
                </tr>
              </table>
              <p style="font-family:${tokens.fonts.ui};color:${tokens.colors.bodySlate};font-size:13px;line-height:1.5;margin:16px 0 0 0;padding-top:12px;border-top:1px solid ${tokens.colors.borderLine};">
                ${content.verificationNote}
              </p>
            </div>
          </td>
        </tr>

        <!-- Dashboard Access Section -->
        <tr>
          <td class="email-pad" style="padding:0 32px 32px 32px;">
            <div style="background-color:${tokens.colors.instBlue};border-radius:${tokens.radii.md};padding:28px;text-align:center;">
              <h2 style="font-family:${tokens.fonts.body};color:${tokens.colors.white};font-size:18px;font-weight:700;margin:0 0 12px 0;">
                ${content.dashboardHeading}
              </h2>
              <p style="font-family:${tokens.fonts.ui};color:${tokens.colors.creamOnDark};font-size:14px;line-height:1.6;margin:0 0 20px 0;">
                ${content.dashboardNote}
              </p>
              <a href="${dashboardUrl}" style="display:inline-block;background-color:${tokens.colors.clinicalTeal};color:${tokens.colors.white};font-family:${tokens.fonts.ui};font-size:16px;font-weight:700;text-decoration:none;padding:16px 32px;border-radius:${tokens.radii.sm};">
                ${content.dashboardButton}
              </a>
            </div>
          </td>
        </tr>

        <!-- What's Next Section -->
        <tr>
          <td class="email-pad" style="padding:0 32px 32px 32px;">
            <h3 style="font-family:${tokens.fonts.body};color:${tokens.colors.instBlue};font-size:18px;font-weight:700;margin:0 0 20px 0;">${content.whatsNext}</h3>

            <div style="margin-bottom:16px;">
              <p style="font-family:${tokens.fonts.ui};color:${tokens.colors.instBlue};font-size:15px;font-weight:600;margin:0 0 4px 0;">1. ${content.step1}</p>
              <p style="font-family:${tokens.fonts.ui};color:${tokens.colors.bodySlate};font-size:14px;line-height:1.5;margin:0;padding-left:20px;">${content.step1Detail}</p>
            </div>

            <div style="margin-bottom:16px;">
              <p style="font-family:${tokens.fonts.ui};color:${tokens.colors.instBlue};font-size:15px;font-weight:600;margin:0 0 4px 0;">2. ${content.step2}</p>
              <p style="font-family:${tokens.fonts.ui};color:${tokens.colors.bodySlate};font-size:14px;line-height:1.5;margin:0;padding-left:20px;">${content.step2Detail}</p>
            </div>

            <div>
              <p style="font-family:${tokens.fonts.ui};color:${tokens.colors.instBlue};font-size:15px;font-weight:600;margin:0 0 4px 0;">3. ${content.step3}</p>
              <p style="font-family:${tokens.fonts.ui};color:${tokens.colors.bodySlate};font-size:14px;line-height:1.5;margin:0;padding-left:20px;">${content.step3Detail}</p>
            </div>
          </td>
        </tr>

        <!-- Profile Note -->
        <tr>
          <td class="email-pad" style="padding:0 32px 32px 32px;">
            <div style="background-color:${tokens.colors.linen};border-radius:${tokens.radii.sm};padding:16px;border:1px solid ${tokens.colors.borderLine};border-left:4px solid ${tokens.colors.success};">
              <p style="font-family:${tokens.fonts.ui};color:${tokens.colors.success};font-size:14px;line-height:1.5;margin:0;font-weight:600;">
                ${content.profileNote}
              </p>
            </div>
          </td>
        </tr>

        <!-- Closing -->
        <tr>
          <td class="email-pad" style="padding:0 32px 32px 32px;">
            <p style="font-family:${tokens.fonts.ui};color:${tokens.colors.bodySlate};font-size:14px;line-height:1.6;margin:0 0 8px 0;">
              ${content.questions} <a href="mailto:doctors@medikah.health" style="color:${tokens.colors.clinicalTeal};text-decoration:none;font-weight:600;">doctors@medikah.health</a>
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

${content.profileCreated}

${content.specialty}: ${primarySpecialty || '—'}
${content.languagesLabel}: ${formattedLanguages}

${content.verificationNote}

---

${content.dashboardHeading}

${content.dashboardNote}

${content.dashboardButton}: ${dashboardUrl}

---

${content.whatsNext}

1. ${content.step1}
   ${content.step1Detail}

2. ${content.step2}
   ${content.step2Detail}

3. ${content.step3}
   ${content.step3Detail}

---

${content.profileNote}

${content.questions} doctors@medikah.health

${content.closing}

${content.team}

---
Medikah Corporation
${baseUrl}
  `.trim();

  return sendEmail({
    to: email,
    subject: content.subject,
    html,
    text,
  });
}

export interface PhysicianRejectionEmailData {
  fullName: string;
  email: string;
  title?: PhysicianEmailTitle | null;
  /** Admin-provided reason, shown verbatim (HTML-escaped). Optional. */
  reason?: string | null;
  lang?: 'en' | 'es';
}

/**
 * Notify a physician that verification could not be completed.
 *
 * DRAFT COPY — pending Dr. Aguirre's review; sending is gated behind
 * REJECTION_EMAIL_ENABLED in the admin route, so this stays dark until the
 * copy is approved. Tone: this is a review outcome with a path forward,
 * not a door slammed shut — most rejections are missing/illegible documents.
 */
export async function sendPhysicianRejectionEmail(
  data: PhysicianRejectionEmailData
): Promise<SendEmailResult> {
  const { fullName, email, title, reason, lang = 'en' } = data;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://medikah.health';
  const name = addressedName(fullName, title);
  const greetingPrefix =
    lang === 'es'
      ? title === 'Dra'
        ? 'Estimada'
        : title === 'Dr'
          ? 'Estimado'
          : 'Estimado(a)'
      : 'Dear';
  const safeReason = reason && reason.trim() ? escapeHtml(reason.trim()) : null;

  const content =
    lang === 'es'
      ? {
          subject: 'Actualización sobre su solicitud en Medikah',
          greeting: `${greetingPrefix} ${name}:`,
          intro:
            'Gracias por su interés en formar parte de la red de Medikah. Después de revisar su expediente, no pudimos completar la verificación de sus credenciales en esta ocasión.',
          reasonLabel: 'Motivo de la revisión',
          pathHeading: 'Esto no es definitivo',
          pathBody:
            'En la mayoría de los casos se trata de información incompleta o documentos ilegibles. Puede responder a este correo con documentación adicional o corregida, y nuestro equipo revisará su caso nuevamente.',
          contact: '¿Preguntas? Responda a este correo o escríbanos a',
          closing: 'Agradecemos su interés en Medikah.',
          team: '— El Equipo de Medikah',
        }
      : {
          subject: 'An update on your Medikah application',
          greeting: `${greetingPrefix} ${name}:`,
          intro:
            'Thank you for your interest in joining the Medikah network. After reviewing your file, we were unable to complete the verification of your credentials at this time.',
          reasonLabel: 'Review notes',
          pathHeading: 'This is not final',
          pathBody:
            'In most cases this is due to incomplete information or illegible documents. You can reply to this email with additional or corrected documentation, and our team will review your case again.',
          contact: 'Questions? Reply to this email or reach us at',
          closing: 'We appreciate your interest in Medikah.',
          team: '— The Medikah Team',
        };

  const html = `<!DOCTYPE html>
<html lang="${lang}">
${emailHead()}
<body style="margin:0;padding:0;background-color:${tokens.pageBg};font-family:${tokens.fonts.ui};color:${tokens.colors.bodySlate};">
${emailHeader({ variant: 'linen', locale: lang, wordmark: 'medikah' })}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${tokens.pageBg};padding:40px 20px;">
  <tr>
    <td align="center">
      <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" style="background-color:${tokens.colors.white};border-radius:${tokens.radii.md};overflow:hidden;">

        <tr>
          <td class="email-pad" style="padding:40px 32px 24px 32px;">
            <p style="font-family:${tokens.fonts.ui};color:${tokens.colors.clinicalTeal};font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 12px 0;">
              ${lang === 'es' ? 'Red de Médicos' : 'Physician Network'}
            </p>
            <h1 style="font-family:${tokens.fonts.body};color:${tokens.colors.deepCharcoal};font-size:22px;font-weight:700;margin:0 0 16px 0;">${content.greeting}</h1>
            <p style="font-family:${tokens.fonts.ui};color:${tokens.colors.bodySlate};font-size:16px;line-height:1.7;margin:0;">
              ${content.intro}
            </p>
          </td>
        </tr>

        ${
          safeReason
            ? `
        <tr>
          <td class="email-pad" style="padding:0 32px 24px 32px;">
            <div style="background-color:${tokens.colors.linen};border-left:4px solid ${tokens.colors.instBlue};padding:20px 24px;border-radius:${tokens.radii.sm};">
              <p style="font-family:${tokens.fonts.ui};color:${tokens.colors.instBlue};font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 8px 0;">
                ${content.reasonLabel}
              </p>
              <p style="font-family:${tokens.fonts.ui};color:${tokens.colors.bodySlate};font-size:15px;line-height:1.6;margin:0;">
                ${safeReason}
              </p>
            </div>
          </td>
        </tr>
        `
            : ''
        }

        <tr>
          <td class="email-pad" style="padding:0 32px 32px 32px;">
            <h3 style="font-family:${tokens.fonts.body};color:${tokens.colors.instBlue};font-size:17px;font-weight:700;margin:0 0 8px 0;">${content.pathHeading}</h3>
            <p style="font-family:${tokens.fonts.ui};color:${tokens.colors.bodySlate};font-size:15px;line-height:1.7;margin:0;">
              ${content.pathBody}
            </p>
          </td>
        </tr>

        <tr>
          <td class="email-pad" style="padding:0 32px 32px 32px;">
            <p style="font-family:${tokens.fonts.ui};color:${tokens.colors.bodySlate};font-size:14px;line-height:1.6;margin:0 0 8px 0;">
              ${content.contact} <a href="mailto:doctors@medikah.health" style="color:${tokens.colors.clinicalTeal};text-decoration:none;font-weight:600;">doctors@medikah.health</a>
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
${safeReason ? `\n${content.reasonLabel}: ${reason?.trim()}\n` : ''}
${content.pathHeading}

${content.pathBody}

${content.contact} doctors@medikah.health

${content.closing}

${content.team}

---
Medikah Corporation
${baseUrl}
  `.trim();

  return sendEmail({
    to: email,
    subject: content.subject,
    html,
    text,
  });
}

export interface OnboardingNudgeEmailData {
  email: string;
  lang?: 'en' | 'es';
}

/**
 * Gentle reminder to a doctor who started onboarding (email captured) but
 * never completed the profile. At the 'started' audit point we only have the
 * email address — no name, no title — so the greeting is deliberately generic.
 * Sending is gated behind STALLED_NUDGE_ENABLED (dark until Hector flips it).
 */
export async function sendOnboardingNudgeEmail(
  data: OnboardingNudgeEmailData
): Promise<SendEmailResult> {
  const { email, lang = 'es' } = data;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://medikah.health';
  const onboardUrl = `${baseUrl}${lang === 'es' ? '/es' : ''}/physicians/onboard`;

  const content =
    lang === 'es'
      ? {
          subject: 'Su registro en Medikah está casi listo',
          greeting: 'Hola:',
          intro:
            'Notamos que comenzó su registro como médico en la red de Medikah, pero quedó pendiente. Completarlo toma alrededor de 10 minutos.',
          benefit:
            'Al completar su perfil, nuestro equipo verifica sus credenciales y usted recibe su cuenta profesional @medikah.health, su perfil público y acceso a pacientes de toda América.',
          button: 'Completar mi registro',
          help: 'Si tuvo algún problema durante el registro, responda a este correo — con gusto le ayudamos.',
          team: '— El Equipo de Medikah',
        }
      : {
          subject: 'Your Medikah registration is almost complete',
          greeting: 'Hello:',
          intro:
            'We noticed you started your physician registration on the Medikah network but didn\'t get to finish. Completing it takes about 10 minutes.',
          benefit:
            'Once your profile is complete, our team verifies your credentials and you receive your professional @medikah.health account, your public profile, and access to patients across the Americas.',
          button: 'Complete my registration',
          help: 'If you ran into any trouble during registration, reply to this email — we\'re happy to help.',
          team: '— The Medikah Team',
        };

  const html = `<!DOCTYPE html>
<html lang="${lang}">
${emailHead()}
<body style="margin:0;padding:0;background-color:${tokens.pageBg};font-family:${tokens.fonts.ui};color:${tokens.colors.bodySlate};">
${emailHeader({ variant: 'linen', locale: lang, wordmark: 'medikah' })}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${tokens.pageBg};padding:40px 20px;">
  <tr>
    <td align="center">
      <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" style="background-color:${tokens.colors.white};border-radius:${tokens.radii.md};overflow:hidden;">

        <tr>
          <td class="email-pad" style="padding:40px 32px 24px 32px;">
            <p style="font-family:${tokens.fonts.ui};color:${tokens.colors.clinicalTeal};font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 12px 0;">
              ${lang === 'es' ? 'Red de Médicos' : 'Physician Network'}
            </p>
            <h1 style="font-family:${tokens.fonts.body};color:${tokens.colors.deepCharcoal};font-size:22px;font-weight:700;margin:0 0 16px 0;">${content.greeting}</h1>
            <p style="font-family:${tokens.fonts.ui};color:${tokens.colors.bodySlate};font-size:16px;line-height:1.7;margin:0 0 16px 0;">
              ${content.intro}
            </p>
            <p style="font-family:${tokens.fonts.ui};color:${tokens.colors.bodySlate};font-size:15px;line-height:1.7;margin:0;">
              ${content.benefit}
            </p>
          </td>
        </tr>

        <tr>
          <td class="email-pad" style="padding:0 32px 32px 32px;" align="center">
            <a href="${onboardUrl}" style="display:inline-block;background-color:${tokens.colors.clinicalTeal};color:${tokens.colors.white};font-family:${tokens.fonts.ui};font-size:16px;font-weight:700;text-decoration:none;padding:16px 32px;border-radius:${tokens.radii.sm};">
              ${content.button}
            </a>
          </td>
        </tr>

        <tr>
          <td class="email-pad" style="padding:0 32px 32px 32px;">
            <p style="font-family:${tokens.fonts.ui};color:${tokens.colors.bodySlate};font-size:14px;line-height:1.6;margin:0 0 16px 0;">
              ${content.help}
            </p>
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

${content.benefit}

${content.button}: ${onboardUrl}

${content.help}

${content.team}

---
Medikah Corporation
${baseUrl}
  `.trim();

  return sendEmail({
    to: email,
    subject: content.subject,
    html,
    text,
  });
}
