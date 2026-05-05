// Shared email chrome helper — mirrors live medikah.health homepage design.
// Tokens, gradients, type stack, and button/eyebrow patterns are extracted
// directly from components/landing/Hero.tsx, Nav.tsx, LandingFooter.tsx,
// StaggeredGrid.tsx (NOT from governance/CLAUDE.md spec text — homepage is
// the source of truth).
//
// All HTML uses inline styles (email clients strip <style> + class attributes).

import { LOGO_SRC, LOGO_DARK_SRC } from './assets';

// ---------------------------------------------------------------------------
// Locked design tokens — derived from tailwind.config.js + landing components
// ---------------------------------------------------------------------------
export const tokens = {
  colors: {
    // Navy / warm-gray scale (Hero + Footer + dark surfaces)
    navyDeep: '#0D1520',         // warm-gray-900 — gradient terminus
    instBlue: '#1B2A41',         // warm-gray-800 / inst-blue — gradient origin
    navyMid: '#243856',          // warm-gray-700
    navyLight: '#5A7AAA',        // warm-gray-400 — rare

    // Teal scale (CTAs, eyebrows, accents) — graduated, not flat
    teal700: '#1A5A68',
    teal600: '#236B7A',
    teal500: '#2C7A8C',          // clinical-teal — primary CTA bg
    teal400: '#4A9AAC',          // eyebrow on dark, footer accent text
    teal300: '#7BBFCC',          // hero second-line color
    teal200: '#B5DDE6',

    // Linen (warm light surfaces)
    linen: '#F0EAE0',
    linenWarm: '#E8E0D5',
    linenLight: '#F5F1EA',
    linenWhite: '#FAF8F4',

    // Cream (text on dark)
    white: '#FFFFFF',
    cream300: '#F5F0EA',         // primary text on navy
    cream400: '#EBE4DC',         // body text on navy
    cream500: '#A8B4C0',         // muted text on navy

    // Light-surface text
    deepCharcoal: '#1C1C1E',     // primary headlines
    bodySlate: '#4A5568',        // primary body
    textMuted: '#718096',        // muted body
    archivalGrey: '#8A8D91',     // very muted

    // Hairlines / borders
    borderLine: '#D1D5DB',
    hairlineDark: 'rgba(27,42,65,0.06)',    // navy 6% on light surfaces
    hairlineLight: 'rgba(255,255,255,0.06)', // white 6% on dark surfaces
    overlayWhite30: 'rgba(255,255,255,0.30)',
    overlayWhite50: 'rgba(255,255,255,0.50)',
    overlayWhite60: 'rgba(255,255,255,0.60)',
    tealOverlay8: 'rgba(44,122,140,0.08)',   // teal-500 8% — chip bg on light
    tealOverlay15: 'rgba(44,122,140,0.15)',  // teal-500 15% — chip bg on dark

    // Semantic
    success: '#2D7D5F',
    warning: '#B8860B',
    error: '#B83D3D',

    // Compat aliases (old names → new names) so existing template references
    // keep working without 50+ site-specific edits. Prefer the canonical
    // names above for new code.
    clinicalTeal: '#2C7A8C',     // → teal500
    creamOnDark: '#F5F0EA',      // → cream300
  },

  fonts: {
    // Body, wordmark, buttons, eyebrows, labels, footer — Mulish dominates.
    body: "'Mulish', -apple-system, 'Segoe UI', Arial, sans-serif",
    // Display headlines — Oswald, ALL CAPS only. Bad for body copy.
    heading: "'Oswald', 'Arial Narrow', Arial, sans-serif",
    // Aliases retained for backwards compatibility — both resolve to body
    // since DM Sans / DM Serif do not appear on the live homepage.
    ui: "'Mulish', -apple-system, 'Segoe UI', Arial, sans-serif",
    accent: "'Mulish', -apple-system, 'Segoe UI', Arial, sans-serif",
    // Alias: display → heading (Oswald)
    display: "'Oswald', 'Arial Narrow', Arial, sans-serif",
  },

  radii: {
    sm: '8px',
    md: '16px',
    lg: '24px',                  // primary — CTAs, chips, cards
    xl: '32px',                  // footer top corners
  },

  // Gradients — emit as background-image; Outlook falls back to bg-color
  gradients: {
    navy: 'linear-gradient(180deg,#1B2A41 0%,#0D1520 100%)',
    linenWarm: 'linear-gradient(135deg,#F5F1EA 0%,#E8E0D5 100%)',
    tealSoft: 'linear-gradient(135deg,#B5DDE6 0%,#E8E0D5 100%)',
  },

  // Page background — parchment. Mirrors the homepage's StaggeredGrid CARD
  // surface (#FAF8F4 linen-white), where users actually read text. Cool-cream
  // for clinical readability while staying on-brand. The header band stays in
  // warmer linen on the linen variant, creating a tonal step into the body.
  pageBg: '#FAF8F4',             // linen-white — parchment body
} as const;

// ---------------------------------------------------------------------------
// Asset URL — always absolute https for email clients
// ---------------------------------------------------------------------------
export function assetUrl(relativePath: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://medikah.health';
  const cleanBase = base.replace(/\/+$/, '');
  const cleanPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  return `${cleanBase}${cleanPath}`;
}

// ---------------------------------------------------------------------------
// emailHead — Google Fonts (Mulish + Oswald only) + viewport + reset
// ---------------------------------------------------------------------------
export function emailHead(): string {
  return `<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="x-apple-disable-message-reformatting">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Medikah</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Mulish:wght@400;500;600;700;800;900&family=Oswald:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
  body { margin:0; padding:0; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table { border-collapse:collapse !important; }
  img { border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; display:block; }
  a { color:${tokens.colors.teal500}; text-decoration:none; }
  @media only screen and (max-width:600px) {
    .email-container { width:100% !important; }
    .email-pad { padding:32px 24px !important; }
    .email-h1 { font-size:32px !important; line-height:1.05 !important; }
  }
</style>
</head>`;
}

// ---------------------------------------------------------------------------
// emailCurveDivider — port of components/landing/CurveDivider.tsx.
// 40px-tall wave between sections. Inline SVG (modern email clients support);
// Outlook desktop strips SVG → falls back to flat container bg, which still
// reads as a clean ~40px transition band.
//
// Path semantics match the React component verbatim:
//   non-flip: `from` color sits ABOVE, dips down into `bg` color BELOW
//   flip:     `from` color sits BELOW, wells up under `bg` color ABOVE
// ---------------------------------------------------------------------------
export interface EmailCurveDividerOptions {
  from: string;        // section above (or below if flip)
  bg: string;          // section below (or above if flip)
  flip?: boolean;
}

export function emailCurveDivider(opts: EmailCurveDividerOptions): string {
  const flip = opts.flip ?? false;
  const d = flip
    ? 'M0,0 C480,40 960,40 1440,0 L1440,40 L0,40 Z'
    : 'M0,40 C480,0 960,0 1440,40 L1440,0 L0,0 Z';
  const containerBg = flip ? opts.from : opts.bg;
  const pathFill = flip ? opts.bg : opts.from;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${containerBg};">
  <tr>
    <td height="40" style="height:40px;line-height:0;font-size:0;mso-line-height-rule:exactly;padding:0;">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 40" preserveAspectRatio="none" width="100%" height="40" style="display:block;width:100%;height:40px;">
        <path d="${d}" fill="${pathFill}"/>
      </svg>
    </td>
  </tr>
</table>`;
}

// ---------------------------------------------------------------------------
// emailSectionLabel — homepage section-header pattern (StaggeredGrid).
// 48px teal-500 hairline + gap + eyebrow text, side-by-side. Use this at the
// TOP of every editorial section. For inline use inside content blocks where
// the rule would be excessive, use emailEyebrow on its own.
// ---------------------------------------------------------------------------
export interface EmailSectionLabelOptions {
  text: string;
  variant?: 'dark' | 'light';
  marginBottom?: string;
}

export function emailSectionLabel(opts: EmailSectionLabelOptions): string {
  const color = opts.variant === 'dark' ? tokens.colors.teal400 : tokens.colors.teal500;
  const mb = opts.marginBottom ?? '20px';
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 ${mb} 0;">
  <tr>
    <td height="1" width="48" style="height:1px;width:48px;background-color:${color};font-size:0;line-height:1px;">&nbsp;</td>
    <td width="16" style="width:16px;font-size:0;line-height:0;">&nbsp;</td>
    <td style="font-family:${tokens.fonts.body};font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:0.25em;color:${color};line-height:1.2;">${opts.text}</td>
  </tr>
</table>`;
}

// ---------------------------------------------------------------------------
// emailEyebrow — the homepage's signature label pattern
// Tiny + uppercase + wide tracking + teal — used everywhere on the homepage.
// Use BEFORE every section heading.
// ---------------------------------------------------------------------------
export interface EmailEyebrowOptions {
  text: string;
  variant?: 'dark' | 'light';   // dark surface uses teal-400, light uses teal-500
  marginBottom?: string;
}

export function emailEyebrow(opts: EmailEyebrowOptions): string {
  const color = opts.variant === 'dark' ? tokens.colors.teal400 : tokens.colors.teal500;
  const mb = opts.marginBottom ?? '16px';
  return `<p style="font-family:${tokens.fonts.body};font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:0.25em;color:${color};margin:0 0 ${mb} 0;line-height:1.2;">${opts.text}</p>`;
}

// ---------------------------------------------------------------------------
// emailHeading — Oswald uppercase display headline (homepage hero pattern)
// ---------------------------------------------------------------------------
export interface EmailHeadingOptions {
  text: string;
  variant?: 'dark' | 'light';   // dark surface = white, light surface = deepCharcoal
  size?: number;                 // px; defaults 38 (h1) — homepage uses clamp 40-96
  level?: 1 | 2 | 3;
}

export function emailHeading(opts: EmailHeadingOptions): string {
  const color = opts.variant === 'dark' ? tokens.colors.white : tokens.colors.deepCharcoal;
  const size = opts.size ?? 38;
  const tag = `h${opts.level ?? 1}`;
  return `<${tag} class="email-h1" style="font-family:${tokens.fonts.heading};font-weight:500;text-transform:uppercase;letter-spacing:-0.02em;line-height:0.95;color:${color};font-size:${size}px;margin:0;">${opts.text}</${tag}>`;
}

// ---------------------------------------------------------------------------
// emailButton — homepage CTA pattern: teal-500 + tiny uppercase Mulish label
// + rounded-lg (24px). Email-safe (table-based).
// ---------------------------------------------------------------------------
export interface EmailButtonOptions {
  label: string;
  href: string;
  variant?: 'primary' | 'secondary-dark' | 'secondary-light';
}

export function emailButton(opts: EmailButtonOptions): string {
  const variant = opts.variant ?? 'primary';
  let bg: string, color: string, border: string;
  if (variant === 'primary') {
    bg = tokens.colors.teal500;
    color = tokens.colors.white;
    border = `2px solid ${tokens.colors.teal500}`;
  } else if (variant === 'secondary-dark') {
    bg = 'transparent';
    color = tokens.colors.white;
    border = `2px solid ${tokens.colors.overlayWhite30}`;
  } else {
    bg = 'transparent';
    color = tokens.colors.instBlue;
    border = `2px solid ${tokens.colors.borderLine}`;
  }
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-block;">
  <tr>
    <td style="border-radius:${tokens.radii.lg};background-color:${bg === 'transparent' ? 'transparent' : bg};">
      <a href="${opts.href}" style="display:inline-block;font-family:${tokens.fonts.body};font-size:13px;font-weight:500;text-transform:uppercase;letter-spacing:0.04em;color:${color};text-decoration:none;padding:14px 36px;border:${border};border-radius:${tokens.radii.lg};">${opts.label} &rarr;</a>
    </td>
  </tr>
</table>`;
}

// ---------------------------------------------------------------------------
// emailHeader — homepage Nav-style masthead: small logo + Mulish lowercase
// wordmark on navy gradient. NO huge font-weight 800 wordmark; matches Nav.
// ---------------------------------------------------------------------------
export interface EmailHeaderOptions {
  variant: 'navy' | 'linen';
  locale: 'en' | 'es';
  wordmark?: 'medikah' | 'practikah';
  eyebrow?: string;             // optional uppercase eyebrow above wordmark
}

export function emailHeader(opts: EmailHeaderOptions): string {
  const { variant, locale, wordmark = 'medikah' } = opts;
  const wmText = wordmark === 'practikah' ? `pr&aacute;ctikah` : 'medikah';

  if (variant === 'navy') {
    const logo = assetUrl(LOGO_SRC); // white mark for dark bg
    const eyebrowHtml = opts.eyebrow
      ? `<tr><td align="center" style="padding-bottom:14px;">${emailEyebrow({ text: opts.eyebrow, variant: 'dark', marginBottom: '0' })}</td></tr>`
      : '';
    // Navy gradient masthead, then a wave divider down into the sand bg.
    // No rounded corners — the curve does the visual work.
    const curveDown = emailCurveDivider({ from: tokens.colors.navyDeep, bg: tokens.pageBg });
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td style="padding:0;background-color:${tokens.colors.instBlue};background-image:${tokens.gradients.navy};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="padding:36px 32px 40px 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              ${eyebrowHtml}
              <tr>
                <td align="center">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="vertical-align:middle;padding-right:10px;line-height:0;">
                        <img src="${logo}" alt="" width="24" height="24" style="display:block;width:24px;height:24px;border:0;opacity:0.7;">
                      </td>
                      <td style="vertical-align:middle;">
                        <span style="font-family:${tokens.fonts.body};font-weight:400;font-size:22px;letter-spacing:0.04em;color:${tokens.colors.white};text-transform:lowercase;">${wmText}</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr><td style="padding:0;">${curveDown}</td></tr>
  <!-- locale stamp: ${locale} -->
</table>`;
  }

  // Linen variant — Nav-style masthead on linen bg (mirrors homepage Nav
  // when scrolled: navy logo + lowercase Mulish wordmark in navy). Same
  // typographic structure as the navy variant, just color-inverted for the
  // light surface. Optional eyebrow renders ABOVE the wordmark when provided.
  const logoDark = assetUrl(LOGO_DARK_SRC);
  const eyebrowHtmlLight = opts.eyebrow
    ? `<tr><td align="center" style="padding-bottom:14px;">${emailEyebrow({ text: opts.eyebrow, variant: 'light', marginBottom: '0' })}</td></tr>`
    : '';
  const curveDownLight = emailCurveDivider({ from: tokens.colors.linen, bg: tokens.pageBg });
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td style="padding:0;background-color:${tokens.colors.linen};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="padding:36px 32px 40px 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              ${eyebrowHtmlLight}
              <tr>
                <td align="center">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="vertical-align:middle;padding-right:10px;line-height:0;">
                        <img src="${logoDark}" alt="" width="24" height="24" style="display:block;width:24px;height:24px;border:0;opacity:0.85;">
                      </td>
                      <td style="vertical-align:middle;">
                        <span style="font-family:${tokens.fonts.body};font-weight:400;font-size:22px;letter-spacing:0.04em;color:${tokens.colors.instBlue};text-transform:lowercase;">${wmText}</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr><td style="padding:0;">${curveDownLight}</td></tr>
  <!-- locale stamp: ${locale} -->
</table>`;
}

// ---------------------------------------------------------------------------
// emailFooter — homepage Footer pattern: navy gradient + rounded-top + 3-col
// nav + Mulish lowercase wordmark + bilingual tagline + small Oswald sub-mark.
// ---------------------------------------------------------------------------
export interface EmailFooterOptions {
  locale: 'en' | 'es';
}

export function emailFooter(opts: EmailFooterOptions): string {
  const { locale } = opts;
  const tagline = locale === 'es'
    ? 'Cuidado humano sin distancia'
    : 'Human care without distance';
  const privacyLabel = locale === 'es' ? 'Privacidad' : 'Privacy';
  const termsLabel = locale === 'es' ? 'T&eacute;rminos' : 'Terms';
  const contactLabel = locale === 'es' ? 'Contacto' : 'Contact';
  const copyright = `&copy; ${new Date().getFullYear()} Medikah Corporation`;

  // Letter-style signature block on linen (no navy slab). Centered stack
  // wraps gracefully and reads as a closing signature, not a marketing footer.
  // Wave up: parchment body → linen footer (subtle warm tonal step).
  const curveUp = emailCurveDivider({ from: tokens.pageBg, bg: tokens.colors.linen, flip: true });
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr><td style="padding:0;">${curveUp}</td></tr>
  <tr>
    <td align="center" style="padding:32px 32px 36px 32px;background-color:${tokens.colors.linen};">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="font-family:${tokens.fonts.body};">
            <p style="margin:0;font-size:18px;font-weight:400;color:${tokens.colors.instBlue};text-transform:lowercase;letter-spacing:0.04em;line-height:1;">medikah</p>
            <p style="margin:8px 0 0 0;font-family:${tokens.fonts.body};font-size:11px;font-weight:500;letter-spacing:0.04em;color:${tokens.colors.teal500};">${tagline}</p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-top:20px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
              <tr>
                <td height="1" width="48" style="height:1px;width:48px;background-color:${tokens.colors.hairlineDark};font-size:0;line-height:1px;">&nbsp;</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-top:18px;font-family:${tokens.fonts.body};">
            <a href="https://medikah.health/privacy" style="font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:0.12em;color:${tokens.colors.archivalGrey};text-decoration:none;">${privacyLabel}</a>
            <span style="font-size:10px;color:${tokens.colors.archivalGrey};margin:0 10px;">&middot;</span>
            <a href="https://medikah.health/terms" style="font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:0.12em;color:${tokens.colors.archivalGrey};text-decoration:none;">${termsLabel}</a>
            <span style="font-size:10px;color:${tokens.colors.archivalGrey};margin:0 10px;">&middot;</span>
            <a href="mailto:hello@medikah.health" style="font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:0.12em;color:${tokens.colors.archivalGrey};text-decoration:none;">${contactLabel}</a>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-top:12px;">
            <p style="margin:0;font-family:${tokens.fonts.body};font-size:10px;font-weight:400;letter-spacing:0.04em;color:${tokens.colors.archivalGrey};">${copyright}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

// ---------------------------------------------------------------------------
// emailShellOpen / emailShellClose — convenience wrappers
// Page bg defaults to linen-light; matches the homepage's section background.
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
