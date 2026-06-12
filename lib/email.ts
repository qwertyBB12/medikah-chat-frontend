// Email service utility for Medikah
// Uses Resend for transactional emails. All HTML chrome (head/header/footer)
// comes from `./emailChrome` so brand tokens stay in one place.

import { PhysicianProfileData } from './physicianClient';
import {
  tokens,
  emailHead,
  emailHeader,
  emailFooter,
} from './emailChrome';
import { cdmxSessionLabel } from './cdmxSessions';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

// Send email via Resend API
export const sendEmail = async (options: EmailOptions): Promise<SendEmailResult> => {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || 'noreply@medikah.health';

  if (!apiKey) {
    console.warn('RESEND_API_KEY not configured. Email not sent.');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
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
};

// Email templates
export const templates = {
  waitlistConfirmation: (email: string) => ({
    subject: 'Welcome to the Medikah Waitlist',
    html: `<!DOCTYPE html>
<html lang="en">
${emailHead()}
<body style="margin:0;padding:0;background-color:${tokens.pageBg};font-family:${tokens.fonts.body};color:${tokens.colors.bodySlate};">
${emailHeader({ variant: 'linen', locale: 'en', wordmark: 'medikah' })}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${tokens.pageBg};padding:40px 20px;">
  <tr>
    <td align="center">
      <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" style="background-color:${tokens.colors.white};border-radius:${tokens.radii.md};overflow:hidden;">
        <tr>
          <td class="email-pad" style="padding:40px 32px;">
            <h2 style="font-family:${tokens.fonts.body};color:${tokens.colors.deepCharcoal};font-size:22px;font-weight:700;margin:0 0 16px 0;">You're on the list!</h2>
            <p style="font-family:${tokens.fonts.body};color:${tokens.colors.bodySlate};font-size:16px;line-height:1.6;margin:0 0 24px 0;">
              Thank you for joining the Medikah waitlist. We're building Care Without Distance — a platform that connects patients with their physicians, no matter where care lives.
            </p>
            <p style="font-family:${tokens.fonts.body};color:${tokens.colors.bodySlate};font-size:16px;line-height:1.6;margin:0 0 24px 0;">
              We'll notify you at <strong style="color:${tokens.colors.instBlue};">${email}</strong> when we're ready to welcome you to the platform.
            </p>
            <p style="font-family:${tokens.fonts.body};color:${tokens.colors.bodySlate};font-size:16px;line-height:1.6;margin:0;">
              Questions? Reach us at <a href="mailto:hello@medikah.health" style="color:${tokens.colors.clinicalTeal};text-decoration:none;font-weight:600;">hello@medikah.health</a>.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
${emailFooter({ locale: 'en' })}
</body>
</html>`,
    text: `You're on the Medikah waitlist!

Thank you for joining. We're building Care Without Distance — a platform that connects patients with their physicians, no matter where care lives.

We'll notify you at ${email} when we're ready to welcome you to the platform.

Questions? Contact us at hello@medikah.health

Medikah Health
https://medikah.health
`,
  }),

  // CDMX talk series RSVP confirmation (Spanish — Mexico City audience)
  cdmxRsvpConfirmation: (name: string, preferredSessions: string[] = []) => {
    const sessionLines = preferredSessions.map(
      (id, i) => `${i + 1}. ${cdmxSessionLabel(id, 'es')}`
    );
    const sessionsHtml = sessionLines.length
      ? `
            <p style="font-family:${tokens.fonts.body};color:${tokens.colors.bodySlate};font-size:16px;line-height:1.6;margin:0 0 8px 0;">
              <strong style="color:${tokens.colors.instBlue};">Tus sesiones, en orden de preferencia:</strong>
            </p>
            <p style="font-family:${tokens.fonts.body};color:${tokens.colors.bodySlate};font-size:16px;line-height:1.8;margin:0 0 24px 0;">
              ${sessionLines.join('<br/>')}
            </p>
            <p style="font-family:${tokens.fonts.body};color:${tokens.colors.bodySlate};font-size:16px;line-height:1.6;margin:0 0 24px 0;">
              Según la disponibilidad, te asignaremos tu lugar siguiendo tu orden de selección y te lo confirmaremos por WhatsApp y correo.
            </p>`
      : `
            <p style="font-family:${tokens.fonts.body};color:${tokens.colors.bodySlate};font-size:16px;line-height:1.6;margin:0 0 24px 0;">
              Te confirmaremos tu sesión por WhatsApp y correo conforme se acerque la fecha.
            </p>`;
    return {
      subject: 'Te esperamos en CDMX — Medikah Health',
      html: `<!DOCTYPE html>
<html lang="es">
${emailHead()}
<body style="margin:0;padding:0;background-color:${tokens.pageBg};font-family:${tokens.fonts.body};color:${tokens.colors.bodySlate};">
${emailHeader({ variant: 'navy', locale: 'es', wordmark: 'medikah', eyebrow: 'Ciudad de M&eacute;xico · 22–30 Junio 2026' })}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${tokens.pageBg};padding:40px 20px;">
  <tr>
    <td align="center">
      <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" style="background-color:${tokens.colors.white};border-radius:${tokens.radii.md};overflow:hidden;">
        <tr>
          <td class="email-pad" style="padding:40px 32px;">
            <h2 style="font-family:${tokens.fonts.body};color:${tokens.colors.deepCharcoal};font-size:22px;font-weight:700;margin:0 0 16px 0;">¡Quedó registrado, ${name}!</h2>
            <p style="font-family:${tokens.fonts.body};color:${tokens.colors.bodySlate};font-size:16px;line-height:1.6;margin:0 0 24px 0;">
              Gracias por tu interés. Medikah Health llega a la Ciudad de México con sesiones de capacitación en inteligencia artificial para médicos. La participación no tiene costo.
            </p>
            <p style="font-family:${tokens.fonts.body};color:${tokens.colors.bodySlate};font-size:16px;line-height:1.6;margin:0 0 24px 0;">
              <strong style="color:${tokens.colors.instBlue};">Cuándo:</strong> del 22 al 30 de junio de 2026 — tres sesiones por día (9:00, 13:00 y 17:00).<br/>
              <strong style="color:${tokens.colors.instBlue};">Dónde:</strong> Ciudad de México — sede por confirmar.
            </p>${sessionsHtml}
            <p style="font-family:${tokens.fonts.body};color:${tokens.colors.bodySlate};font-size:16px;line-height:1.6;margin:0;">
              ¿Preguntas? Escríbenos a <a href="mailto:hello@medikah.health" style="color:${tokens.colors.clinicalTeal};text-decoration:none;font-weight:600;">hello@medikah.health</a>.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
${emailFooter({ locale: 'es' })}
</body>
</html>`,
      text: `¡Quedó registrado, ${name}!

Gracias por tu interés. Medikah Health llega a la Ciudad de México con sesiones de capacitación en inteligencia artificial para médicos. La participación no tiene costo.

Cuándo: del 22 al 30 de junio de 2026 — tres sesiones por día (9:00, 13:00 y 17:00).
Dónde: Ciudad de México — sede por confirmar.
${sessionLines.length ? `
Tus sesiones, en orden de preferencia:
${sessionLines.join('\n')}

Según la disponibilidad, te asignaremos tu lugar siguiendo tu orden de selección y te lo confirmaremos por WhatsApp y correo.` : `
Te confirmaremos tu sesión por WhatsApp y correo conforme se acerque la fecha.`}

¿Preguntas? Escríbenos a hello@medikah.health

Medikah Health
https://medikah.health
`,
    };
  },
};

// Send waitlist confirmation
export const sendWaitlistConfirmation = async (email: string): Promise<SendEmailResult> => {
  const template = templates.waitlistConfirmation(email);
  return sendEmail({
    to: email,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
};

// Send CDMX launch event RSVP confirmation (Spanish)
export const sendCdmxRsvpConfirmation = async (
  email: string,
  name: string,
  preferredSessions: string[] = []
): Promise<SendEmailResult> => {
  const template = templates.cdmxRsvpConfirmation(name, preferredSessions);
  return sendEmail({
    to: email,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
};

// Physician onboarding confirmation email data
interface PhysicianEmailData {
  physicianId: string;
  profile: PhysicianProfileData;
  verificationStatus: 'pending' | 'verified';
  lang?: 'en' | 'es';
}

// Helper to get last name from full name
const getLastName = (fullName: string): string => {
  const parts = fullName.trim().split(' ');
  return parts.length > 1 ? parts[parts.length - 1] : parts[0];
};

// Helper to format list
const formatList = (items: string[] | undefined): string => {
  if (!items || items.length === 0) return '—';
  return items.join(', ');
};

// Helper to format availability
const formatAvailability = (
  days: string[] | undefined,
  start: string | undefined,
  end: string | undefined,
  timezone: string | undefined
): string => {
  if (!days || days.length === 0) return '—';
  const daysStr = days.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ');
  const timeStr = start && end ? `${start} - ${end}` : '';
  const tzStr = timezone || '';
  return [daysStr, timeStr, tzStr].filter(Boolean).join(' · ');
};

// Helper to format languages
const formatLanguages = (langs: string[]): string => {
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
  };
  return langs.map(l => langNames[l] || l).join(', ');
};

// Physician onboarding confirmation template
const physicianConfirmationTemplate = (data: PhysicianEmailData) => {
  const { physicianId, profile, verificationStatus, lang = 'en' } = data;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://medikah.health';
  const lastName = getLastName(profile.fullName);

  // Bilingual content
  const content = lang === 'es' ? {
    subject: `Bienvenido a Medikah, ${profile.fullName} — Tu Perfil está Activo`,
    greeting: `Hola Dr. ${lastName},`,
    thankYou: `Gracias por unirte a Medikah. Ahora eres parte de la red de médicos que está llevando la coordinación de salud a las Américas.`,
    profileSummary: `Así aparece tu perfil en la red:`,
    labels: {
      name: 'Nombre',
      specialty: 'Especialidad',
      subSpecialties: 'Sub-especialidades',
      credentials: 'Certificaciones',
      education: 'Educación',
      publications: 'Publicaciones',
      currentPractice: 'Práctica Actual',
      availability: 'Disponibilidad',
      languages: 'Idiomas',
      verificationStatus: 'Estado de Verificación',
    },
    verified: '✓ Verificado',
    pending: 'Verificación pendiente',
    nextSteps: 'Próximos pasos:',
    step1Title: '1. Verificación de Credenciales (48 horas)',
    step1Text: 'Estamos verificando tu licencia con COFEPRIS/juntas estatales. Recibirás una insignia ✓ Verificado una vez completado.',
    step2Title: '2. Tu Perfil Está Activo',
    step2Text: 'Los pacientes en la red te descubrirán por especialidad. Otros médicos podrán conectarse contigo.',
    step3Title: '3. Puedes Actualizar en Cualquier Momento',
    step3Text: 'Tu perfil siempre es editable desde tu panel de control.',
    step4Title: '4. Acceso Anticipado',
    step4Text: 'Mientras construimos nuevas funciones (herramientas de colaboración, insights de IA, coordinación de facturación), tendrás acceso prioritario como miembro fundador.',
    ctaViewProfile: 'Ver Tu Perfil',
    ctaUpdateAvailability: 'Actualizar Disponibilidad',
    ctaJoinCommunity: 'Unirte a la Comunidad',
    closing: 'Nos vemos en la red.',
    team: '— El Equipo de Medikah',
  } : {
    subject: `Welcome to Medikah, ${profile.fullName} — Your Profile is Live`,
    greeting: `Hi Dr. ${lastName},`,
    thankYou: `Thank you for joining Medikah. You're now part of the physician network bringing healthcare coordination to the Americas.`,
    profileSummary: `Here's your profile as it appears in the network:`,
    labels: {
      name: 'Name',
      specialty: 'Specialty',
      subSpecialties: 'Sub-specialties',
      credentials: 'Credentials',
      education: 'Education',
      publications: 'Publications',
      currentPractice: 'Current Practice',
      availability: 'Availability',
      languages: 'Languages',
      verificationStatus: 'Verification Status',
    },
    verified: '✓ Verified',
    pending: 'Pending verification',
    nextSteps: 'What happens next:',
    step1Title: '1. Credential Verification (48 hours)',
    step1Text: 'We\'re verifying your license with COFEPRIS/state boards. You\'ll get a ✓ Verified badge once complete.',
    step2Title: '2. Your Profile Goes Live',
    step2Text: 'Patients in the network will discover you by specialty. Other physicians can connect with you.',
    step3Title: '3. You Can Update Anytime',
    step3Text: 'Your profile is always editable via your dashboard.',
    step4Title: '4. Early Access',
    step4Text: 'As we build new features (collaboration tools, AI insights, billing coordination), you\'ll get first access as a founding member.',
    ctaViewProfile: 'View Your Profile',
    ctaUpdateAvailability: 'Update Availability',
    ctaJoinCommunity: 'Join Physician Community',
    closing: 'See you in the network.',
    team: '— The Medikah Team',
  };

  // Format profile data
  const subSpecialties = formatList(profile.subSpecialties);
  const certifications = profile.boardCertifications && profile.boardCertifications.length > 0
    ? profile.boardCertifications.map(c => `${c.certification} (${c.board})`).join(', ')
    : '—';
  const education = [
    profile.medicalSchool,
    profile.residency && profile.residency.length > 0 ? profile.residency.map(r => `${r.specialty} @ ${r.institution}`).join(', ') : null,
    profile.honors && profile.honors.length > 0 ? profile.honors.join(', ') : null,
  ].filter(Boolean).join(' · ') || '—';
  const publications = profile.publications && profile.publications.length > 0
    ? `${profile.publications.length} papers`
    : '—';
  const currentPractice = formatList(profile.currentInstitutions);
  const availability = formatAvailability(
    profile.availableDays,
    profile.availableHoursStart,
    profile.availableHoursEnd,
    profile.timezone
  );
  const languages = formatLanguages(profile.languages);
  const verificationBadge = verificationStatus === 'verified' ? content.verified : content.pending;
  const verificationColor = verificationStatus === 'verified' ? tokens.colors.success : tokens.colors.warning;

  const html = `<!DOCTYPE html>
<html lang="${lang}">
${emailHead()}
<body style="margin:0;padding:0;background-color:${tokens.pageBg};font-family:${tokens.fonts.ui};color:${tokens.colors.bodySlate};">
${emailHeader({ variant: 'linen', locale: lang, wordmark: 'medikah' })}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${tokens.pageBg};padding:40px 20px;">
  <tr>
    <td align="center">
      <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" style="background-color:${tokens.colors.white};border-radius:${tokens.radii.md};overflow:hidden;">

        <!-- Greeting -->
        <tr>
          <td class="email-pad" style="padding:40px 32px 24px 32px;">
            <h2 style="font-family:${tokens.fonts.accent};color:${tokens.colors.instBlue};font-size:24px;font-weight:400;margin:0 0 16px 0;">${content.greeting}</h2>
            <p style="font-family:${tokens.fonts.ui};color:${tokens.colors.bodySlate};font-size:16px;line-height:1.7;margin:0;">
              ${content.thankYou}
            </p>
          </td>
        </tr>

        <!-- Profile Summary -->
        <tr>
          <td class="email-pad" style="padding:0 32px 32px 32px;">
            <div style="background-color:${tokens.colors.linen};border-radius:${tokens.radii.sm};padding:24px;border-left:4px solid ${tokens.colors.clinicalTeal};">
              <p style="font-family:${tokens.fonts.ui};color:${tokens.colors.instBlue};font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 16px 0;">
                ${content.profileSummary}
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:${tokens.fonts.ui};font-size:14px;">
                <tr>
                  <td style="color:${tokens.colors.bodySlate};padding:8px 0;width:140px;vertical-align:top;">${content.labels.name}</td>
                  <td style="color:${tokens.colors.instBlue};padding:8px 0;font-weight:500;">${profile.fullName}</td>
                </tr>
                <tr>
                  <td style="color:${tokens.colors.bodySlate};padding:8px 0;vertical-align:top;">${content.labels.specialty}</td>
                  <td style="color:${tokens.colors.instBlue};padding:8px 0;font-weight:500;">${profile.primarySpecialty || '—'}</td>
                </tr>
                <tr>
                  <td style="color:${tokens.colors.bodySlate};padding:8px 0;vertical-align:top;">${content.labels.subSpecialties}</td>
                  <td style="color:${tokens.colors.instBlue};padding:8px 0;">${subSpecialties}</td>
                </tr>
                <tr>
                  <td style="color:${tokens.colors.bodySlate};padding:8px 0;vertical-align:top;">${content.labels.credentials}</td>
                  <td style="color:${tokens.colors.instBlue};padding:8px 0;">${certifications}</td>
                </tr>
                <tr>
                  <td style="color:${tokens.colors.bodySlate};padding:8px 0;vertical-align:top;">${content.labels.education}</td>
                  <td style="color:${tokens.colors.instBlue};padding:8px 0;">${education}</td>
                </tr>
                <tr>
                  <td style="color:${tokens.colors.bodySlate};padding:8px 0;vertical-align:top;">${content.labels.publications}</td>
                  <td style="color:${tokens.colors.instBlue};padding:8px 0;">${publications}</td>
                </tr>
                <tr>
                  <td style="color:${tokens.colors.bodySlate};padding:8px 0;vertical-align:top;">${content.labels.currentPractice}</td>
                  <td style="color:${tokens.colors.instBlue};padding:8px 0;">${currentPractice}</td>
                </tr>
                <tr>
                  <td style="color:${tokens.colors.bodySlate};padding:8px 0;vertical-align:top;">${content.labels.availability}</td>
                  <td style="color:${tokens.colors.instBlue};padding:8px 0;">${availability}</td>
                </tr>
                <tr>
                  <td style="color:${tokens.colors.bodySlate};padding:8px 0;vertical-align:top;">${content.labels.languages}</td>
                  <td style="color:${tokens.colors.instBlue};padding:8px 0;">${languages}</td>
                </tr>
                <tr>
                  <td style="color:${tokens.colors.bodySlate};padding:12px 0 0 0;vertical-align:top;">${content.labels.verificationStatus}</td>
                  <td style="padding:12px 0 0 0;">
                    <span style="display:inline-block;background-color:${tokens.colors.linen};color:${verificationColor};font-size:13px;font-weight:600;padding:4px 12px;border-radius:${tokens.radii.lg};border:1px solid ${verificationColor};">
                      ${verificationBadge}
                    </span>
                  </td>
                </tr>
              </table>
            </div>
          </td>
        </tr>

        <!-- Next Steps -->
        <tr>
          <td class="email-pad" style="padding:0 32px 32px 32px;">
            <h3 style="font-family:${tokens.fonts.accent};color:${tokens.colors.instBlue};font-size:20px;font-weight:400;margin:0 0 20px 0;">${content.nextSteps}</h3>

            <div style="margin-bottom:20px;">
              <p style="font-family:${tokens.fonts.ui};color:${tokens.colors.instBlue};font-size:15px;font-weight:600;margin:0 0 4px 0;">${content.step1Title}</p>
              <p style="font-family:${tokens.fonts.ui};color:${tokens.colors.bodySlate};font-size:14px;line-height:1.6;margin:0;">${content.step1Text}</p>
            </div>

            <div style="margin-bottom:20px;">
              <p style="font-family:${tokens.fonts.ui};color:${tokens.colors.instBlue};font-size:15px;font-weight:600;margin:0 0 4px 0;">${content.step2Title}</p>
              <p style="font-family:${tokens.fonts.ui};color:${tokens.colors.bodySlate};font-size:14px;line-height:1.6;margin:0;">${content.step2Text}</p>
            </div>

            <div style="margin-bottom:20px;">
              <p style="font-family:${tokens.fonts.ui};color:${tokens.colors.instBlue};font-size:15px;font-weight:600;margin:0 0 4px 0;">${content.step3Title}</p>
              <p style="font-family:${tokens.fonts.ui};color:${tokens.colors.bodySlate};font-size:14px;line-height:1.6;margin:0;">${content.step3Text}</p>
            </div>

            <div>
              <p style="font-family:${tokens.fonts.ui};color:${tokens.colors.instBlue};font-size:15px;font-weight:600;margin:0 0 4px 0;">${content.step4Title}</p>
              <p style="font-family:${tokens.fonts.ui};color:${tokens.colors.bodySlate};font-size:14px;line-height:1.6;margin:0;">${content.step4Text}</p>
            </div>
          </td>
        </tr>

        <!-- CTA Buttons -->
        <tr>
          <td class="email-pad" style="padding:0 32px 40px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding-bottom:12px;">
                  <a href="${baseUrl}/doctors/${physicianId}" style="display:inline-block;background-color:${tokens.colors.clinicalTeal};color:${tokens.colors.white};font-family:${tokens.fonts.ui};font-size:14px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:${tokens.radii.sm};">
                    ${content.ctaViewProfile}
                  </a>
                </td>
              </tr>
              <tr>
                <td align="center">
                  <a href="${baseUrl}/doctor/dashboard" style="display:inline-block;color:${tokens.colors.instBlue};font-family:${tokens.fonts.ui};font-size:14px;font-weight:500;text-decoration:none;padding:10px 24px;border:1px solid ${tokens.colors.borderLine};border-radius:${tokens.radii.sm};margin-right:8px;">
                    ${content.ctaUpdateAvailability}
                  </a>
                  <a href="${baseUrl}/doctor/network" style="display:inline-block;color:${tokens.colors.instBlue};font-family:${tokens.fonts.ui};font-size:14px;font-weight:500;text-decoration:none;padding:10px 24px;border:1px solid ${tokens.colors.borderLine};border-radius:${tokens.radii.sm};">
                    ${content.ctaJoinCommunity}
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Closing -->
        <tr>
          <td class="email-pad" style="padding:0 32px 32px 32px;">
            <p style="font-family:${tokens.fonts.ui};color:${tokens.colors.bodySlate};font-size:15px;line-height:1.6;margin:0 0 8px 0;">${content.closing}</p>
            <p style="font-family:${tokens.fonts.ui};color:${tokens.colors.instBlue};font-size:15px;font-weight:500;margin:0;">${content.team}</p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
${emailFooter({ locale: lang })}
</body>
</html>`;

  // Plain text version
  const text = `
${content.greeting}

${content.thankYou}

${content.profileSummary}

${content.labels.name}: ${profile.fullName}
${content.labels.specialty}: ${profile.primarySpecialty || '—'}
${content.labels.subSpecialties}: ${subSpecialties}
${content.labels.credentials}: ${certifications}
${content.labels.education}: ${education}
${content.labels.publications}: ${publications}
${content.labels.currentPractice}: ${currentPractice}
${content.labels.availability}: ${availability}
${content.labels.languages}: ${languages}
${content.labels.verificationStatus}: ${verificationBadge}

---

${content.nextSteps}

${content.step1Title}
${content.step1Text}

${content.step2Title}
${content.step2Text}

${content.step3Title}
${content.step3Text}

${content.step4Title}
${content.step4Text}

---

${content.ctaViewProfile}: ${baseUrl}/doctors/${physicianId}
${content.ctaUpdateAvailability}: ${baseUrl}/doctor/dashboard
${content.ctaJoinCommunity}: ${baseUrl}/doctor/network

${content.closing}

${content.team}

---
Medikah Corporation
${baseUrl}
  `.trim();

  return {
    subject: content.subject,
    html,
    text,
  };
};

// Send physician onboarding confirmation email
export const sendPhysicianConfirmation = async (
  data: PhysicianEmailData
): Promise<SendEmailResult> => {
  const template = physicianConfirmationTemplate(data);
  return sendEmail({
    to: data.profile.email,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
};

// Verification status update email
interface VerificationUpdateEmailData {
  physicianId: string;
  fullName: string;
  email: string;
  newStatus: 'verified' | 'rejected';
  rejectionReason?: string;
  lang?: 'en' | 'es';
}

const verificationUpdateTemplate = (data: VerificationUpdateEmailData) => {
  const { physicianId, fullName, newStatus, rejectionReason, lang = 'en' } = data;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://medikah.health';
  const lastName = getLastName(fullName);

  const content = lang === 'es' ? {
    verifiedSubject: `✓ Verificado — Dr. ${lastName}, sus credenciales han sido confirmadas`,
    rejectedSubject: `Actualización sobre su verificación — Medikah`,
    verifiedGreeting: `Felicidades, Dr. ${lastName}!`,
    rejectedGreeting: `Hola Dr. ${lastName},`,
    verifiedBody: `Sus credenciales médicas han sido verificadas exitosamente. Su perfil ahora muestra la insignia ✓ Verificado, lo que significa que los pacientes y colegas pueden confiar en sus credenciales.`,
    rejectedBody: `Hemos revisado sus credenciales enviadas y desafortunadamente no pudimos verificarlas en este momento.`,
    rejectedReason: `Motivo: ${rejectionReason || 'No se pudo confirmar la información proporcionada con los registros oficiales.'}`,
    rejectedNextSteps: `Si cree que esto es un error, puede:\n1. Actualizar su perfil con información corregida\n2. Contactarnos en support@medikah.health`,
    viewProfile: 'Ver Su Perfil',
    contactSupport: 'Contactar Soporte',
    closing: '— El Equipo de Medikah',
  } : {
    verifiedSubject: `✓ Verified — Dr. ${lastName}, your credentials have been confirmed`,
    rejectedSubject: `Update on your verification — Medikah`,
    verifiedGreeting: `Congratulations, Dr. ${lastName}!`,
    rejectedGreeting: `Hi Dr. ${lastName},`,
    verifiedBody: `Your medical credentials have been successfully verified. Your profile now displays the ✓ Verified badge, meaning patients and colleagues can trust your credentials.`,
    rejectedBody: `We've reviewed your submitted credentials and unfortunately were unable to verify them at this time.`,
    rejectedReason: `Reason: ${rejectionReason || 'Unable to confirm the provided information with official records.'}`,
    rejectedNextSteps: `If you believe this is an error, you can:\n1. Update your profile with corrected information\n2. Contact us at support@medikah.health`,
    viewProfile: 'View Your Profile',
    contactSupport: 'Contact Support',
    closing: '— The Medikah Team',
  };

  const isVerified = newStatus === 'verified';
  const subject = isVerified ? content.verifiedSubject : content.rejectedSubject;
  const greeting = isVerified ? content.verifiedGreeting : content.rejectedGreeting;
  const statusColor = isVerified ? tokens.colors.success : tokens.colors.error;
  const statusBadge = isVerified ? '✓ Verified' : '✗ Needs Review';

  const html = `<!DOCTYPE html>
<html lang="${lang}">
${emailHead()}
<body style="margin:0;padding:0;background-color:${tokens.pageBg};font-family:${tokens.fonts.ui};color:${tokens.colors.bodySlate};">
${emailHeader({ variant: 'linen', locale: lang, wordmark: 'medikah' })}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${tokens.pageBg};padding:40px 20px;">
  <tr>
    <td align="center">
      <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" style="background-color:${tokens.colors.white};border-radius:${tokens.radii.md};overflow:hidden;">

        <!-- Status Badge -->
        <tr>
          <td class="email-pad" style="padding:32px 32px 0 32px;text-align:center;">
            <span style="display:inline-block;background-color:${tokens.colors.linen};color:${statusColor};font-family:${tokens.fonts.ui};font-size:16px;font-weight:600;padding:8px 20px;border-radius:${tokens.radii.lg};border:1px solid ${statusColor};">
              ${statusBadge}
            </span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td class="email-pad" style="padding:24px 32px 32px 32px;">
            <h2 style="font-family:${tokens.fonts.accent};color:${tokens.colors.instBlue};font-size:24px;font-weight:400;margin:0 0 16px 0;text-align:center;">${greeting}</h2>
            <p style="font-family:${tokens.fonts.ui};color:${tokens.colors.bodySlate};font-size:16px;line-height:1.7;margin:0 0 16px 0;">
              ${isVerified ? content.verifiedBody : content.rejectedBody}
            </p>
            ${!isVerified ? `
            <div style="background-color:${tokens.colors.linen};border-radius:${tokens.radii.sm};padding:16px;margin-bottom:16px;border-left:4px solid ${tokens.colors.error};">
              <p style="font-family:${tokens.fonts.ui};color:${tokens.colors.error};font-size:14px;line-height:1.6;margin:0;">
                ${content.rejectedReason}
              </p>
            </div>
            <p style="font-family:${tokens.fonts.ui};color:${tokens.colors.bodySlate};font-size:14px;line-height:1.7;margin:0;white-space:pre-line;">
              ${content.rejectedNextSteps}
            </p>
            ` : ''}
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td class="email-pad" style="padding:0 32px 32px 32px;text-align:center;">
            <a href="${baseUrl}/doctors/${physicianId}" style="display:inline-block;background-color:${isVerified ? tokens.colors.clinicalTeal : tokens.colors.instBlue};color:${tokens.colors.white};font-family:${tokens.fonts.ui};font-size:14px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:${tokens.radii.sm};margin-right:8px;">
              ${content.viewProfile}
            </a>
            ${!isVerified ? `
            <a href="mailto:support@medikah.health" style="display:inline-block;color:${tokens.colors.instBlue};font-family:${tokens.fonts.ui};font-size:14px;font-weight:500;text-decoration:none;padding:14px 24px;border:1px solid ${tokens.colors.borderLine};border-radius:${tokens.radii.sm};">
              ${content.contactSupport}
            </a>
            ` : ''}
          </td>
        </tr>

        <!-- Closing -->
        <tr>
          <td class="email-pad" style="padding:0 32px 32px 32px;text-align:center;">
            <p style="font-family:${tokens.fonts.ui};color:${tokens.colors.bodySlate};font-size:14px;margin:0;">${content.closing}</p>
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
${greeting}

${isVerified ? content.verifiedBody : content.rejectedBody}

${!isVerified ? `
${content.rejectedReason}

${content.rejectedNextSteps}
` : ''}

${content.viewProfile}: ${baseUrl}/doctors/${physicianId}

${content.closing}

---
Medikah Corporation
${baseUrl}
  `.trim();

  return { subject, html, text };
};

// Send verification status update email
export const sendVerificationUpdate = async (
  data: VerificationUpdateEmailData
): Promise<SendEmailResult> => {
  const template = verificationUpdateTemplate(data);
  return sendEmail({
    to: data.email,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
};

// Export for use in onboarding agent
export type { PhysicianEmailData, VerificationUpdateEmailData };
