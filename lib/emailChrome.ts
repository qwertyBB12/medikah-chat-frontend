// Shared email chrome helper — locked governance tokens for transactional email.
// All HTML uses inline styles (email clients strip <style> + class attributes).
// Source of truth for tokens: CLAUDE.md "Approved Design Overrides" + tailwind.config.js.

import { LOGO_SRC, LOGO_DARK_SRC, WORDMARK_SRC } from './assets';

// ---------------------------------------------------------------------------
// Locked design tokens
// ---------------------------------------------------------------------------
export const tokens = {
  colors: {
    instBlue: '#1B2A41',       // Institutional Navy — primary brand
    clinicalTeal: '#2C7A8C',   // Accent / link / secondary CTA
    linen: '#F0EAE0',          // Warm body bg
    linenWhite: '#FAF8F4',     // Default page bg
    deepCharcoal: '#1C1C1E',   // Headlines on light
    bodySlate: '#4A5568',      // Body text
    borderLine: '#D1D5DB',     // Hairlines
    white: '#FFFFFF',
    creamOnDark: '#F5F0EA',    // Text on navy
    success: '#2D7D5F',        // Confirmation
    warning: '#B8860B',        // Caution
    error: '#B83D3D',          // Alert
  },
  fonts: {
    display: "'Oswald', 'Arial Narrow', Arial, sans-serif",
    ui: "'DM Sans', -apple-system, 'Segoe UI', Arial, sans-serif",
    accent: "'DM Serif Display', Georgia, 'Times New Roman', serif",
    body: "'Mulish', -apple-system, 'Segoe UI', Arial, sans-serif",
  },
  radii: {
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
  pageBg: '#FAF8F4',
} as const;

// ---------------------------------------------------------------------------
// Asset URL — always absolute https for email clients
// ---------------------------------------------------------------------------
export function assetUrl(relativePath: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://medikah.health';
  // Strip trailing slash on base, ensure leading slash on path
  const cleanBase = base.replace(/\/+$/, '');
  const cleanPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  return `${cleanBase}${cleanPath}`;
}

// ---------------------------------------------------------------------------
// emailHead — returns a <head> block with Google Fonts + viewport + reset
// ---------------------------------------------------------------------------
export function emailHead(): string {
  return `<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="x-apple-disable-message-reformatting">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Medikah</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&family=Mulish:wght@300;400;600;700;800;900&family=Oswald:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
  /* Email-safe resets — best-effort; inline styles win where these fail */
  body { margin:0; padding:0; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table { border-collapse:collapse !important; }
  img { border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; display:block; }
  a { color:${tokens.colors.clinicalTeal}; text-decoration:none; }
  @media only screen and (max-width:600px) {
    .email-container { width:100% !important; }
    .email-pad { padding:24px !important; }
  }
</style>
</head>`;
}

// ---------------------------------------------------------------------------
// emailHeader — masthead band with logo + wordmark
// ---------------------------------------------------------------------------
export interface EmailHeaderOptions {
  variant: 'navy' | 'linen';
  locale: 'en' | 'es';
  wordmark?: 'medikah' | 'practikah';
}

export function emailHeader(opts: EmailHeaderOptions): string {
  const { variant, wordmark = 'medikah' } = opts;

  if (variant === 'navy') {
    // Navy band: white logo + white wordmark image
    const logo = assetUrl(LOGO_SRC);
    const wm = assetUrl(WORDMARK_SRC);
    const wmAlt = wordmark === 'practikah' ? 'Práctikah' : 'medikah';
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${tokens.colors.instBlue};">
  <tr>
    <td align="center" style="padding:28px 32px;">
      <table role="presentation" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align:middle;padding-right:14px;">
            <img src="${logo}" alt="Medikah" width="40" height="40" style="display:block;width:40px;height:40px;border:0;">
          </td>
          <td style="vertical-align:middle;">
            <img src="${wm}" alt="${wmAlt}" height="22" style="display:block;height:22px;border:0;">
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
  }

  // Linen band: navy logo + Mulish lowercase wordmark text in navy
  const logoDark = assetUrl(LOGO_DARK_SRC);
  const wmText = wordmark === 'practikah'
    ? `pr&aacute;ctikah`  // entity for á — email-safe
    : 'medikah';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${tokens.colors.linen};border-bottom:1px solid ${tokens.colors.borderLine};">
  <tr>
    <td align="center" style="padding:28px 32px;">
      <table role="presentation" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align:middle;padding-right:14px;">
            <img src="${logoDark}" alt="Medikah" width="40" height="40" style="display:block;width:40px;height:40px;border:0;">
          </td>
          <td style="vertical-align:middle;">
            <span style="font-family:${tokens.fonts.body};font-weight:800;font-size:26px;letter-spacing:-0.01em;color:${tokens.colors.instBlue};">${wmText}</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

// ---------------------------------------------------------------------------
// emailFooter — bilingual footer band
// ---------------------------------------------------------------------------
export interface EmailFooterOptions {
  locale: 'en' | 'es';
}

export function emailFooter(opts: EmailFooterOptions): string {
  const { locale } = opts;
  const tagline = locale === 'es'
    ? 'Cuidado Sin Distancia · medikah.health'
    : 'Care Without Distance · medikah.health';
  const incorporation = locale === 'es'
    ? 'Medikah Corporation · Constituida en Delaware, EE. UU.'
    : 'Medikah Corporation · Incorporated in Delaware, USA';
  const privacyLabel = locale === 'es' ? 'Aviso de Privacidad' : 'Privacy Policy';
  const termsLabel = locale === 'es' ? 'Términos del Servicio' : 'Terms of Service';

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${tokens.colors.linen};border-top:1px solid ${tokens.colors.borderLine};">
  <tr>
    <td align="center" style="padding:24px 32px;font-family:${tokens.fonts.body};">
      <p style="margin:0 0 12px 0;font-size:14px;color:${tokens.colors.instBlue};font-weight:700;letter-spacing:0.02em;">${tagline}</p>
      <p style="margin:0 0 12px 0;font-size:13px;line-height:1.5;color:${tokens.colors.bodySlate};">${incorporation}</p>
      <p style="margin:0;font-size:13px;">
        <a href="https://medikah.health/privacy" style="color:${tokens.colors.instBlue};text-decoration:none;font-weight:600;">${privacyLabel}</a>
        <span style="color:${tokens.colors.borderLine};margin:0 8px;">|</span>
        <a href="https://medikah.health/terms" style="color:${tokens.colors.instBlue};text-decoration:none;font-weight:600;">${termsLabel}</a>
      </p>
    </td>
  </tr>
</table>`;
}

// ---------------------------------------------------------------------------
// emailShell — convenience wrapper that combines head + body open + header
// callers append their <main>...</main> + emailFooter + body close + html close.
// Optional but reduces boilerplate in templates.
// ---------------------------------------------------------------------------
export interface EmailShellOpenOptions extends EmailHeaderOptions {
  pageBg?: string;
}

export function emailShellOpen(opts: EmailShellOpenOptions): string {
  const bg = opts.pageBg || tokens.pageBg;
  return `<!DOCTYPE html>
<html lang="${opts.locale}">
${emailHead()}
<body style="margin:0;padding:0;background-color:${bg};font-family:${tokens.fonts.body};color:${tokens.colors.bodySlate};">
${emailHeader(opts)}`;
}

export function emailShellClose(opts: EmailFooterOptions): string {
  return `${emailFooter(opts)}
</body>
</html>`;
}
