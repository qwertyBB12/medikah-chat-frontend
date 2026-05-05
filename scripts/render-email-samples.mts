/**
 * Email-sample renderer — Plan 13.1-01 Task 7 (Option A: pure editorial).
 * Body content sits directly on the sand-tone page bg between the two wave
 * dividers — no outer white card. Mirrors the homepage's section architecture.
 * Inner content blocks (next-steps panels, mailbox card, verified badge)
 * remain because they're meaningful sub-sections, not chrome.
 *
 *   npx tsx scripts/render-email-samples.mts
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { templates } from '../lib/email';
import {
  tokens,
  emailHead,
  emailHeader,
  emailFooter,
  emailEyebrow,
  emailHeading,
  emailButton,
  emailSectionLabel,
} from '../lib/emailChrome';

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
  writeFileSync(resolve(OUT_DIR, name), html, 'utf8');
  process.stdout.write(`✓ ${name} (${html.length} bytes)\n`);
}

const C = tokens.colors;
const F = tokens.fonts;
const R = tokens.radii;

// Editorial body shell — content sits directly on sand between waves.
// Max-width 520px content with 32px side padding gives breathing room.
function shell(opts: {
  locale: 'en' | 'es';
  wordmark?: 'medikah' | 'practikah';
  bodyHtml: string;
  variant?: 'navy' | 'linen';
  headerEyebrow?: string;
}): string {
  const variant = opts.variant ?? 'linen';
  return `<!DOCTYPE html>
<html lang="${opts.locale}">
${emailHead()}
<body style="margin:0;padding:0;background-color:${tokens.pageBg};font-family:${F.body};color:${C.bodySlate};">
${emailHeader({ variant, locale: opts.locale, wordmark: opts.wordmark ?? 'medikah', eyebrow: opts.headerEyebrow })}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${tokens.pageBg};">
  <tr><td align="center" style="padding:48px 32px 56px 32px;">
    <table role="presentation" class="email-container" width="520" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
      <tr><td>
        ${opts.bodyHtml}
      </td></tr>
    </table>
  </td></tr>
</table>
${emailFooter({ locale: opts.locale })}
</body>
</html>`;
}

// ---------- 1. Waitlist ----------
function renderWaitlist(): string {
  const body = `${emailSectionLabel({ text: 'Care Without Distance', variant: 'light' })}
${emailHeading({ text: "YOU'RE ON THE LIST", variant: 'light', size: 38, level: 1 })}
<p style="font-family:${F.body};font-size:16px;line-height:1.7;color:${C.bodySlate};margin:24px 0 0 0;">
  Thank you for joining the Medikah waitlist. We're building a platform that connects patients with their physicians wherever care lives — in your language, on your terms.
</p>
<p style="font-family:${F.body};font-size:16px;line-height:1.7;color:${C.bodySlate};margin:16px 0 0 0;">
  We'll notify you at <strong style="color:${C.instBlue};font-weight:700;">demo@medikah.health</strong> when we're ready to welcome you.
</p>
<p style="font-family:${F.body};font-size:14px;line-height:1.6;color:${C.textMuted};margin:32px 0 0 0;">
  Questions? Reach us at <a href="mailto:hello@medikah.health" style="color:${C.teal500};font-weight:600;">hello@medikah.health</a>.
</p>`;
  return shell({ locale: 'en', bodyHtml: body });
}
write('email__waitlistConfirmation__en.html', renderWaitlist());

// ---------- 2-3. Physician onboarding confirmation ----------
function renderPhysicianConfirmation(locale: 'en' | 'es'): string {
  const eyebrow = locale === 'es' ? 'Red de médicos · Activo' : 'Physician Network · Live';
  const heading = locale === 'es' ? 'TU PERFIL ESTÁ ACTIVO' : 'YOUR PROFILE IS LIVE';
  const greeting = locale === 'es' ? 'Hola Dr. Hernández,' : 'Hi Dr. Hernandez,';
  const body = locale === 'es'
    ? "Gracias por unirte. Ahora eres parte de la red de médicos llevando coordinación de salud a las Américas."
    : "Thank you for joining. You're now part of the physician network bringing healthcare coordination to the Americas.";
  const cta = locale === 'es' ? 'Ver tu perfil' : 'View your profile';

  const bodyHtml = `${emailSectionLabel({ text: eyebrow, variant: 'light' })}
${emailHeading({ text: heading, variant: 'light', size: 36 })}
<p style="font-family:${F.body};font-size:16px;font-weight:500;color:${C.deepCharcoal};margin:32px 0 16px 0;">${greeting}</p>
<p style="font-family:${F.body};font-size:16px;line-height:1.7;color:${C.bodySlate};margin:0 0 32px 0;">${body}</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.white};border:1px solid ${C.hairlineDark};border-radius:${R.md};margin:0 0 36px 0;">
  <tr><td style="padding:24px 28px;">
    ${emailEyebrow({ text: locale === 'es' ? 'Próximos pasos' : "What's next", variant: 'light', marginBottom: '12px' })}
    <p style="font-family:${F.body};font-size:14px;line-height:1.7;color:${C.bodySlate};margin:0;">
      <strong style="color:${C.instBlue};">1. ${locale === 'es' ? 'Verificación (48 h)' : 'Credential verification (48 h)'}</strong><br>
      <strong style="color:${C.instBlue};">2. ${locale === 'es' ? 'Perfil activo' : 'Profile goes live'}</strong><br>
      <strong style="color:${C.instBlue};">3. ${locale === 'es' ? 'Ediciones libres' : 'Free edits anytime'}</strong>
    </p>
  </td></tr>
</table>

${emailButton({ label: cta, href: 'https://medikah.health/doctors/demo', variant: 'primary' })}
`;
  return shell({ locale, bodyHtml });
}
write('email__physicianConfirmation__en.html', renderPhysicianConfirmation('en'));
write('email__physicianConfirmation__es.html', renderPhysicianConfirmation('es'));

// ---------- 4. Verification status ----------
function renderVerificationUpdate(): string {
  const bodyHtml = `${emailSectionLabel({ text: 'Credentials Verified', variant: 'light' })}
${emailHeading({ text: 'CONGRATULATIONS,\nDR. HERNANDEZ', variant: 'light', size: 36 })}
<p style="font-family:${F.body};font-size:16px;line-height:1.7;color:${C.bodySlate};margin:32px 0 28px 0;">
  Your medical credentials have been successfully verified. Your profile now displays the ✓ Verified badge — patients and colleagues can trust your credentials.
</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.tealOverlay8};border-radius:${R.lg};margin:0 0 36px 0;">
  <tr><td style="padding:14px 22px;">
    <span style="font-family:${F.body};font-size:13px;font-weight:600;color:${C.teal700};text-transform:uppercase;letter-spacing:0.04em;">✓ Verified</span>
  </td></tr>
</table>
${emailButton({ label: 'View your profile', href: 'https://medikah.health/doctors/demo', variant: 'primary' })}
`;
  return shell({ locale: 'en', bodyHtml });
}
write('email__verificationUpdate__en.html', renderVerificationUpdate());

// ---------- 5-6. Práctikah workspace welcome ----------
function renderPraktikahLive(locale: 'en' | 'es'): string {
  const eyebrow = locale === 'es' ? 'Práctikah · Espacio de trabajo' : 'Práctikah · Workspace';
  const heading = locale === 'es' ? "TU ESPACIO PROFESIONAL\nESTÁ ACTIVO" : "YOUR PROFESSIONAL\nWORKSPACE IS LIVE";
  const mailLabel = locale === 'es' ? 'Tu correo profesional' : 'Your professional mailbox';
  const cta = locale === 'es' ? 'Abrir buzón' : 'Open mailbox';

  const bodyHtml = `${emailSectionLabel({ text: eyebrow, variant: 'light' })}
${emailHeading({ text: heading, variant: 'light', size: 34 })}
<p style="font-family:${F.body};font-size:16px;line-height:1.7;color:${C.bodySlate};margin:32px 0 32px 0;">
  ${locale === 'es'
    ? 'Práctikah por Medikah — un espacio para tu práctica profesional. Tu buzón profesional está listo, y tu sitio Try Pro está sirviendo en vivo.'
    : 'Práctikah by Medikah — a home for your professional practice. Your professional mailbox is ready, and your Try Pro site is serving live.'}
</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.instBlue};background-image:${tokens.gradients.navy};border-radius:${R.lg};margin:0 0 36px 0;">
  <tr><td style="padding:32px;">
    <p style="font-family:${F.body};font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:0.25em;color:${C.teal400};margin:0 0 12px 0;">${mailLabel}</p>
    <p style="font-family:${F.body};font-size:22px;font-weight:600;color:${C.white};margin:0 0 20px 0;letter-spacing:-0.01em;word-break:break-all;">demo@medikah.health</p>
    ${emailButton({ label: cta, href: 'https://mail.medikah.health', variant: 'primary' })}
  </td></tr>
</table>
`;
  return shell({ locale, wordmark: 'practikah', bodyHtml });
}
write('email__practikahLive__en.html', renderPraktikahLive('en'));
write('email__practikahLive__es.html', renderPraktikahLive('es'));

// ---------- 7. Linen header variant smoke test ----------
function renderLinenVariant(): string {
  const locale: 'en' | 'es' = 'en';
  const bodyHtml = `${emailSectionLabel({ text: 'Editorial · Marketing tone', variant: 'light' })}
${emailHeading({ text: "THE LINEN MASTHEAD\nIS A SECTION OPENER", variant: 'light', size: 32 })}
<p style="font-family:${F.body};font-size:16px;line-height:1.7;color:${C.bodySlate};margin:24px 0 0 0;">
  Same Mulish + Oswald + teal eyebrow language as the navy variant, dressed differently. The linen masthead replaces the lowercase Mulish wordmark with miniaturized Oswald uppercase MEDIKAH — homepage Hero pattern at masthead scale. Use the linen variant for warmer / marketing / section-opening tones; the navy variant for transactional / authoritative tones.
</p>`;
  return shell({ locale, variant: 'linen', headerEyebrow: 'Care Without Distance', bodyHtml });
}
write('email__linenHeaderVariant__en.html', renderLinenVariant());

// Real waitlist template (smoke test the production code path)
const realWl = templates.waitlistConfirmation('demo@medikah.health');
write('email__waitlistConfirmation_REAL__en.html', realWl.html);
