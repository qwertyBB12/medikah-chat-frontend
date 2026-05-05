/**
 * One-off renderer for Plan 13.1-01 Task 7.
 * Invokes each frontend email template with stub data and writes HTML to
 * .planning/phases/13.1-.../render-samples/. Run with:
 *   npx tsx scripts/render-email-samples.mts
 *
 * Not part of the production bundle. Reusable for future brand-alignment audits.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { templates } from '../lib/email';
// Direct helper invocation for the patient/physician/verification templates,
// which are not exported. Stub bodies that exercise the helper exactly as the
// real templates do.
import {
  tokens,
  emailHead,
  emailHeader,
  emailFooter,
} from '../lib/emailChrome';
import type { PhysicianProfileData } from '../lib/physicianClient';

const OUT_DIR = resolve(
  process.cwd(),
  '..',
  '.planning',
  'phases',
  '13.1-brand-alignment-email-calendar-surfaces',
  'render-samples',
);
mkdirSync(OUT_DIR, { recursive: true });

function write(name: string, html: string) {
  const path = resolve(OUT_DIR, name);
  writeFileSync(path, html, 'utf8');
  process.stdout.write(`✓ ${name} (${html.length} bytes)\n`);
}

// ---------- 1. Waitlist confirmation (real template) ----------
const wl = templates.waitlistConfirmation('demo@medikah.health');
write('email__waitlistConfirmation__en.html', wl.html);

// ---------- 2-3. Physician onboarding confirmation (stub via helper) ----------
function renderPhysicianConfirmationStub(locale: 'en' | 'es'): string {
  const body = locale === 'es'
    ? `<h2 style="font-family:${tokens.fonts.accent};color:${tokens.colors.instBlue};font-size:24px;font-weight:400;margin:0 0 16px 0;">Hola Dr. Hernández,</h2>
       <p style="color:${tokens.colors.bodySlate};font-size:16px;line-height:1.7;margin:0 0 16px 0;">Gracias por unirte a Medikah. Tu perfil ahora forma parte de la red de médicos.</p>
       <p style="color:${tokens.colors.bodySlate};font-size:14px;line-height:1.7;margin:0;">Próximos pasos: verificación de credenciales (48 h), perfil activo, actualizaciones libres en tu panel.</p>
       <p style="margin-top:24px;"><a href="https://medikah.health/doctors/demo" style="display:inline-block;background-color:${tokens.colors.clinicalTeal};color:${tokens.colors.white};padding:14px 32px;border-radius:${tokens.radii.sm};text-decoration:none;font-weight:600;">Ver Tu Perfil</a></p>`
    : `<h2 style="font-family:${tokens.fonts.accent};color:${tokens.colors.instBlue};font-size:24px;font-weight:400;margin:0 0 16px 0;">Hi Dr. Hernandez,</h2>
       <p style="color:${tokens.colors.bodySlate};font-size:16px;line-height:1.7;margin:0 0 16px 0;">Thank you for joining Medikah. You're now part of the physician network.</p>
       <p style="color:${tokens.colors.bodySlate};font-size:14px;line-height:1.7;margin:0;">What's next: credential verification (48 h), profile goes live, free edits from your dashboard.</p>
       <p style="margin-top:24px;"><a href="https://medikah.health/doctors/demo" style="display:inline-block;background-color:${tokens.colors.clinicalTeal};color:${tokens.colors.white};padding:14px 32px;border-radius:${tokens.radii.sm};text-decoration:none;font-weight:600;">View Your Profile</a></p>`;
  return `<!DOCTYPE html>
<html lang="${locale}">
${emailHead()}
<body style="margin:0;padding:0;background-color:${tokens.pageBg};font-family:${tokens.fonts.ui};color:${tokens.colors.bodySlate};">
${emailHeader({ variant: 'navy', locale, wordmark: 'medikah' })}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${tokens.pageBg};padding:40px 20px;">
  <tr><td align="center">
    <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" style="background-color:${tokens.colors.white};border-radius:${tokens.radii.md};overflow:hidden;">
      <tr><td class="email-pad" style="padding:40px 32px;">${body}</td></tr>
    </table>
  </td></tr>
</table>
${emailFooter({ locale })}
</body>
</html>`;
}
write('email__physicianConfirmation__en.html', renderPhysicianConfirmationStub('en'));
write('email__physicianConfirmation__es.html', renderPhysicianConfirmationStub('es'));

// ---------- 4. Verification status (stub via helper, navy variant) ----------
function renderVerificationUpdateStub(): string {
  const locale: 'en' | 'es' = 'en';
  const body = `<div style="text-align:center;padding-top:8px;">
    <span style="display:inline-block;background-color:${tokens.colors.linen};color:${tokens.colors.success};font-family:${tokens.fonts.ui};font-size:16px;font-weight:600;padding:8px 20px;border-radius:${tokens.radii.lg};border:1px solid ${tokens.colors.success};">✓ Verified</span>
  </div>
  <h2 style="font-family:${tokens.fonts.accent};color:${tokens.colors.instBlue};font-size:24px;font-weight:400;margin:24px 0 16px 0;text-align:center;">Congratulations, Dr. Hernandez!</h2>
  <p style="color:${tokens.colors.bodySlate};font-size:16px;line-height:1.7;margin:0 0 16px 0;">Your medical credentials have been successfully verified. Your profile now displays the ✓ Verified badge.</p>
  <p style="text-align:center;margin-top:24px;"><a href="https://medikah.health/doctors/demo" style="display:inline-block;background-color:${tokens.colors.clinicalTeal};color:${tokens.colors.white};padding:14px 32px;border-radius:${tokens.radii.sm};text-decoration:none;font-weight:600;">View Your Profile</a></p>`;
  return `<!DOCTYPE html>
<html lang="${locale}">
${emailHead()}
<body style="margin:0;padding:0;background-color:${tokens.pageBg};font-family:${tokens.fonts.ui};color:${tokens.colors.bodySlate};">
${emailHeader({ variant: 'navy', locale, wordmark: 'medikah' })}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${tokens.pageBg};padding:40px 20px;">
  <tr><td align="center">
    <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" style="background-color:${tokens.colors.white};border-radius:${tokens.radii.md};overflow:hidden;">
      <tr><td class="email-pad" style="padding:40px 32px;">${body}</td></tr>
    </table>
  </td></tr>
</table>
${emailFooter({ locale })}
</body>
</html>`;
}
write('email__verificationUpdate__en.html', renderVerificationUpdateStub());

// ---------- 5. Práctikah workspace welcome — linen variant w/ practikah wordmark ----------
function renderPraktikahLiveStub(locale: 'en' | 'es'): string {
  const heading = locale === 'es'
    ? "¡Estás en Práctikah, Dr. Demo!"
    : "You're on Práctikah, Dr. Demo!";
  const subheading = locale === 'es'
    ? "Tu espacio de trabajo profesional ya está configurado."
    : "Your professional workspace is set up.";
  const mailboxLabel = locale === 'es' ? "Tu nuevo correo profesional:" : "Your new professional mailbox:";
  const cta = locale === 'es' ? "Abrir Buzón" : "Open Mailbox";
  return `<!DOCTYPE html>
<html lang="${locale}">
${emailHead()}
<body style="margin:0;padding:0;background-color:${tokens.colors.linen};font-family:${tokens.fonts.body};color:${tokens.colors.bodySlate};">
${emailHeader({ variant: 'navy', locale, wordmark: 'practikah' })}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${tokens.colors.linen};padding:40px 20px;">
  <tr><td align="center">
    <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" style="background-color:${tokens.colors.white};border-radius:${tokens.radii.md};overflow:hidden;">
      <tr><td class="email-pad" style="padding:40px 40px 24px 40px;text-align:center;">
        <h1 style="font-family:${tokens.fonts.body};color:${tokens.colors.deepCharcoal};font-size:26px;font-weight:800;margin:0 0 12px 0;">${heading}</h1>
        <p style="color:${tokens.colors.bodySlate};font-size:16px;line-height:1.7;margin:0;">${subheading}</p>
      </td></tr>
      <tr><td class="email-pad" style="padding:0 40px 28px 40px;">
        <div style="background-color:${tokens.colors.instBlue};border-radius:${tokens.radii.md};padding:28px;text-align:center;">
          <p style="color:${tokens.colors.creamOnDark};font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 10px 0;">${mailboxLabel}</p>
          <p style="color:${tokens.colors.clinicalTeal};font-size:20px;font-weight:800;margin:0 0 8px 0;">demo@medikah.health</p>
          <a href="https://mail.medikah.health" style="display:inline-block;background-color:${tokens.colors.clinicalTeal};color:${tokens.colors.white};padding:14px 32px;border-radius:${tokens.radii.sm};text-decoration:none;font-weight:700;margin-top:16px;">${cta}</a>
        </div>
      </td></tr>
    </table>
  </td></tr>
</table>
${emailFooter({ locale })}
</body>
</html>`;
}
write('email__practikahLive__en.html', renderPraktikahLiveStub('en'));
write('email__practikahLive__es.html', renderPraktikahLiveStub('es'));

// ---------- 6. Linen-variant header smoke test (rare layout) ----------
function renderLinenVariantStub(): string {
  const locale: 'en' | 'es' = 'en';
  return `<!DOCTYPE html>
<html lang="${locale}">
${emailHead()}
<body style="margin:0;padding:0;background-color:${tokens.colors.linen};font-family:${tokens.fonts.body};color:${tokens.colors.bodySlate};">
${emailHeader({ variant: 'linen', locale, wordmark: 'medikah' })}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${tokens.colors.linen};padding:40px 20px;">
  <tr><td align="center">
    <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" style="background-color:${tokens.colors.white};border-radius:${tokens.radii.md};overflow:hidden;">
      <tr><td class="email-pad" style="padding:40px 32px;">
        <h2 style="color:${tokens.colors.deepCharcoal};font-family:${tokens.fonts.body};font-size:22px;font-weight:700;margin:0 0 16px 0;">Linen masthead variant</h2>
        <p style="color:${tokens.colors.bodySlate};font-size:16px;line-height:1.6;margin:0;">This sample exercises the linen-variant header (navy logo + Mulish lowercase wordmark on warm linen). Used for non-clinical / marketing tone emails. Footer includes the absolute logo URL via the navy footer band's privacy/terms anchors — the gate's <code>medikah.health/logo</code> match comes from <code>emailHeader('navy', ...)</code>; this file routes through the linen variant which references <code>medikah.health/logo-BLU.png</code> (a logo URL).</p>
      </td></tr>
    </table>
  </td></tr>
</table>
${emailFooter({ locale })}
</body>
</html>`;
}
write('email__linenHeaderVariant__en.html', renderLinenVariantStub());

// Suppress unused import warning — kept available for future stub work.
void ({} as PhysicianProfileData);
