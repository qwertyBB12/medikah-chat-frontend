/**
 * Physician email utilities
 * Handles welcome emails, password setup, and other physician communications
 */

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
  magicLink: string | null;
  lang?: 'en' | 'es';
}

/**
 * Send welcome email to newly onboarded physician
 */
export async function sendPhysicianWelcomeEmail(
  data: PhysicianWelcomeEmailData
): Promise<SendEmailResult> {
  const { physicianId, fullName, email, primarySpecialty, languages, magicLink, lang = 'en' } = data;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://medikah.health';
  const lastName = getLastName(fullName);
  const formattedLanguages = formatLanguages(languages);

  // Bilingual content
  const content =
    lang === 'es'
      ? {
          subject: `Bienvenido a Medikah, Dr. ${lastName} — Configure su cuenta`,
          greeting: `Bienvenido a Medikah, Dr. ${lastName}!`,
          intro: `Gracias por unirse a la red de Medikah. Su perfil ha sido creado exitosamente y está siendo preparado para verificación.`,
          profileCreated: `Su perfil de médico está activo`,
          specialty: 'Especialidad',
          languagesLabel: 'Idiomas',
          verificationNote:
            'Su licencia médica está siendo verificada. Este proceso típicamente toma 24-48 horas. Le notificaremos cuando su insignia de verificación esté activa.',
          setupPassword: 'Configure su contraseña',
          setupPasswordNote:
            'Use el botón de abajo para crear su contraseña y acceder a su panel de control de Medikah.',
          setupPasswordButton: 'Crear Contraseña y Acceder',
          noMagicLink:
            'Si necesita configurar su contraseña más tarde, puede usar la opción "Olvidé mi contraseña" en la página de inicio de sesión.',
          whatsNext: 'Qué sigue:',
          step1: 'Verificación de credenciales (24-48 horas)',
          step1Detail: 'Verificaremos su licencia con las autoridades correspondientes.',
          step2: 'Su perfil público',
          step2Detail:
            'Una vez verificado, los pacientes podrán encontrarlo en la red de Medikah.',
          step3: 'Comience a recibir pacientes',
          step3Detail:
            'Los pacientes podrán agendar consultas por video directamente con usted.',
          profileNote:
            'Su perfil de Medikah está siendo preparado. Le notificaremos cuando esté disponible públicamente.',
          questions: '¿Preguntas? Responda a este correo o escríbanos a',
          closing: 'Bienvenido al equipo.',
          team: '— El Equipo de Medikah',
        }
      : {
          subject: `Welcome to Medikah, Dr. ${lastName} — Set Up Your Account`,
          greeting: `Welcome to Medikah, Dr. ${lastName}!`,
          intro: `Thank you for joining the Medikah network. Your profile has been successfully created and is being prepared for verification.`,
          profileCreated: `Your physician profile is active`,
          specialty: 'Specialty',
          languagesLabel: 'Languages',
          verificationNote:
            'Your medical license is being verified. This process typically takes 24-48 hours. We\'ll notify you when your verification badge is active.',
          setupPassword: 'Set up your password',
          setupPasswordNote:
            'Use the button below to create your password and access your Medikah dashboard.',
          setupPasswordButton: 'Create Password & Sign In',
          noMagicLink:
            'If you need to set up your password later, you can use the "Forgot password" option on the login page.',
          whatsNext: "What's next:",
          step1: 'Credential verification (24-48 hours)',
          step1Detail: "We'll verify your license with the appropriate authorities.",
          step2: 'Your public profile',
          step2Detail:
            'Once verified, patients will be able to find you on the Medikah network.',
          step3: 'Start seeing patients',
          step3Detail:
            'Patients will be able to book video consultations directly with you.',
          profileNote:
            "Your Medikah profile is being prepared. We'll notify you when it's publicly available.",
          questions: 'Questions? Reply to this email or reach us at',
          closing: 'Welcome to the team.',
          team: '— The Medikah Team',
        };

  const html = `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${content.subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAFAFB; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FAFAFB; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">

          <!-- Header -->
          <tr>
            <td style="background-color: #FFFFFF; padding: 32px; text-align: center; border-bottom: 4px solid #1B2A41;">
              <p style="font-size: 32px; font-weight: 800; color: #1B2A41; letter-spacing: -0.01em; margin: 0;">medikah</p>
              <p style="font-size: 13px; color: #2C7A8C; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; margin: 12px 0 0 0;">
                ${lang === 'es' ? 'Red de Médicos' : 'Physician Network'}
              </p>
            </td>
          </tr>

          <!-- Welcome Message -->
          <tr>
            <td style="padding: 40px 32px 24px 32px;">
              <h1 style="color: #1B2A41; font-size: 24px; font-weight: 700; margin: 0 0 16px 0;">${content.greeting}</h1>
              <p style="color: #4A5568; font-size: 16px; line-height: 1.7; margin: 0;">
                ${content.intro}
              </p>
            </td>
          </tr>

          <!-- Profile Summary Card -->
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <div style="background: linear-gradient(135deg, #F8FAFB 0%, #F0F4F5 100%); border-left: 4px solid #1B2A41; padding: 20px 24px; border-radius: 0 8px 8px 0;">
                <p style="color: #1B2A41; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 12px 0;">
                  ${content.profileCreated}
                </p>
                <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 15px;">
                  <tr>
                    <td style="color: #6B7280; padding: 6px 0; width: 100px;">${content.specialty}</td>
                    <td style="color: #1B2A41; padding: 6px 0; font-weight: 600;">${primarySpecialty || '—'}</td>
                  </tr>
                  <tr>
                    <td style="color: #6B7280; padding: 6px 0;">${content.languagesLabel}</td>
                    <td style="color: #1B2A41; padding: 6px 0; font-weight: 600;">${formattedLanguages}</td>
                  </tr>
                </table>
                <p style="color: #6B7280; font-size: 13px; line-height: 1.5; margin: 16px 0 0 0; padding-top: 12px; border-top: 1px solid #E5E7EB;">
                  ${content.verificationNote}
                </p>
              </div>
            </td>
          </tr>

          <!-- Password Setup Section -->
          <tr>
            <td style="padding: 0 32px 32px 32px;">
              <div style="background-color: #1B2A41; border-radius: 12px; padding: 28px; text-align: center;">
                <h2 style="color: #ffffff; font-size: 18px; font-weight: 700; margin: 0 0 12px 0;">
                  ${content.setupPassword}
                </h2>
                <p style="color: rgba(255,255,255,0.8); font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
                  ${content.setupPasswordNote}
                </p>
                ${
                  magicLink
                    ? `
                <a href="${magicLink}" style="display: inline-block; background-color: #2C7A8C; color: #ffffff; font-size: 16px; font-weight: 700; text-decoration: none; padding: 16px 32px; border-radius: 8px; box-shadow: 0 4px 12px rgba(44,122,140,0.4);">
                  ${content.setupPasswordButton}
                </a>
                `
                    : `
                <p style="color: rgba(255,255,255,0.7); font-size: 13px; margin: 0;">
                  ${content.noMagicLink}
                </p>
                `
                }
              </div>
            </td>
          </tr>

          <!-- What's Next Section -->
          <tr>
            <td style="padding: 0 32px 32px 32px;">
              <h3 style="color: #1B2A41; font-size: 18px; font-weight: 700; margin: 0 0 20px 0;">${content.whatsNext}</h3>

              <div style="margin-bottom: 16px;">
                <p style="color: #1B2A41; font-size: 15px; font-weight: 600; margin: 0 0 4px 0;">1. ${content.step1}</p>
                <p style="color: #6B7280; font-size: 14px; line-height: 1.5; margin: 0; padding-left: 20px;">${content.step1Detail}</p>
              </div>

              <div style="margin-bottom: 16px;">
                <p style="color: #1B2A41; font-size: 15px; font-weight: 600; margin: 0 0 4px 0;">2. ${content.step2}</p>
                <p style="color: #6B7280; font-size: 14px; line-height: 1.5; margin: 0; padding-left: 20px;">${content.step2Detail}</p>
              </div>

              <div>
                <p style="color: #1B2A41; font-size: 15px; font-weight: 600; margin: 0 0 4px 0;">3. ${content.step3}</p>
                <p style="color: #6B7280; font-size: 14px; line-height: 1.5; margin: 0; padding-left: 20px;">${content.step3Detail}</p>
              </div>
            </td>
          </tr>

          <!-- Profile Note -->
          <tr>
            <td style="padding: 0 32px 32px 32px;">
              <div style="background-color: #F0FDF4; border-radius: 8px; padding: 16px; border: 1px solid #BBF7D0;">
                <p style="color: #166534; font-size: 14px; line-height: 1.5; margin: 0;">
                  ${content.profileNote}
                </p>
              </div>
            </td>
          </tr>

          <!-- Closing -->
          <tr>
            <td style="padding: 0 32px 32px 32px;">
              <p style="color: #6B7280; font-size: 14px; line-height: 1.6; margin: 0 0 8px 0;">
                ${content.questions} <a href="mailto:doctors@medikah.health" style="color: #2C7A8C; text-decoration: none; font-weight: 600;">doctors@medikah.health</a>
              </p>
              <p style="color: #4A5568; font-size: 15px; margin: 20px 0 4px 0;">${content.closing}</p>
              <p style="color: #1B2A41; font-size: 15px; font-weight: 700; margin: 0;">${content.team}</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F5F7F8; padding: 24px 32px; text-align: center; border-top: 4px solid #1B2A41;">
              <p style="color: #9CA3AF; font-size: 12px; line-height: 1.5; margin: 0 0 12px 0;">
                Medikah Corporation · Incorporated in Delaware, USA
              </p>
              <p style="font-size: 12px; margin: 0;">
                <a href="${baseUrl}/privacy" style="color: #1B2A41; text-decoration: none; font-weight: 600;">Privacy Policy</a>
                <span style="color: #D1D5DB; margin: 0 8px;">|</span>
                <a href="${baseUrl}/terms" style="color: #1B2A41; text-decoration: none; font-weight: 600;">Terms of Service</a>
                <span style="color: #D1D5DB; margin: 0 8px;">|</span>
                <a href="mailto:doctors@medikah.health" style="color: #1B2A41; text-decoration: none; font-weight: 600;">Contact</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
${content.greeting}

${content.intro}

---

${content.profileCreated}

${content.specialty}: ${primarySpecialty || '—'}
${content.languagesLabel}: ${formattedLanguages}

${content.verificationNote}

---

${content.setupPassword}

${content.setupPasswordNote}

${magicLink ? `${content.setupPasswordButton}: ${magicLink}` : content.noMagicLink}

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
