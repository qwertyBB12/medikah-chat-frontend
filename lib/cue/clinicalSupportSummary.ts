/**
 * lib/cue/clinicalSupportSummary.ts — branded HTML for the Cue clinical
 * DECISION-SUPPORT summary, shared by BOTH export paths (Phase 24 / Slice 3):
 *   - the send-to-@medikah.health email (Resend, server-side)
 *   - the "Save as PDF" print view (client opens it + window.print())
 *
 * Pure function (usable client- AND server-side). Reuses the homepage-derived
 * brand chrome in lib/emailChrome.ts (single source of design tokens).
 *
 * NAMING / LEGAL (Hector, 2026-06-29): NEVER named or framed as a diagnosis. It
 * is a doctor decision-SUPPORT artifact presenting ranked clinical CONSIDERATIONS;
 * the only "diagnosis" token is the disclaimer's denial. Card content (from the
 * model) is HTML-escaped before interpolation.
 */

import { tokens, emailShellOpen, emailShellClose } from '../emailChrome';
import { CLINICAL_SUPPORT_COPY, confidenceLabel, type CueLocale } from './clinicalSupportContent';
import type { CueClinicalSupportCard } from './cueStream';

export interface ClinicalSupportSummaryContext {
  locale: CueLocale;
  /** Optional honorific + name for the summary header (e.g. "Dra. García"). */
  physicianName?: string | null;
  /** Optional pre-formatted date; defaults to today in the locale. */
  generatedAt?: string;
}

/** Email/print subject — bilingual, never "diagnosis". */
export function clinicalSupportSubject(locale: CueLocale): string {
  return locale === 'es'
    ? 'Tu resumen de apoyo a la decisión clínica · Cue'
    : 'Your clinical decision-support summary · Cue';
}

/** Minimal HTML escape for model-supplied strings interpolated into the template. */
function esc(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function confidenceColor(confidence: string): { bg: string; fg: string } {
  switch ((confidence || '').toUpperCase()) {
    case 'HIGH':
      return { bg: '#e3f3ec', fg: '#1f7a55' };
    case 'LOW':
      return { bg: '#eef2f4', fg: '#5a7682' };
    default: // MODERATE
      return { bg: '#f6edd9', fg: '#8a6300' };
  }
}

export function buildClinicalSupportSummaryHtml(
  card: CueClinicalSupportCard,
  ctx: ClinicalSupportSummaryContext,
): string {
  const locale = ctx.locale;
  const copy = CLINICAL_SUPPORT_COPY[locale];
  const date =
    ctx.generatedAt ||
    new Date().toLocaleDateString(locale === 'es' ? 'es-MX' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  const heading = `<h1 style="font-family:${tokens.fonts.heading};font-weight:500;text-transform:uppercase;letter-spacing:-0.01em;line-height:1.05;color:${tokens.colors.deepCharcoal};font-size:26px;margin:0 0 6px 0;">${esc(copy.title)}</h1>`;

  const metaLine = `<p style="margin:0 0 4px 0;font-family:${tokens.fonts.body};font-size:12px;color:${tokens.colors.archivalGrey};">${esc(date)}${
    ctx.physicianName ? ` &middot; ${esc(ctx.physicianName)}` : ''
  }</p>`;

  const phi = `<p style="margin:14px 0 0 0;font-family:${tokens.fonts.body};font-size:11px;line-height:1.45;color:#8a6300;background:#f6edd9;border-radius:8px;padding:9px 11px;">${esc(copy.phiNotice)}</p>`;

  const considerations = card.considerations
    .map((c) => {
      const conf = confidenceColor(c.confidence);
      return `<tr><td style="padding:0 0 10px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${tokens.colors.white};border:1px solid ${tokens.colors.borderLine};border-radius:12px;">
          <tr><td style="padding:12px 14px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
              <td style="font-family:${tokens.fonts.body};font-size:15px;font-weight:700;color:${tokens.colors.deepCharcoal};">${esc(c.condition)}</td>
              <td align="right" style="white-space:nowrap;"><span style="font-family:${tokens.fonts.body};font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;color:${conf.fg};background:${conf.bg};border-radius:999px;padding:3px 9px;">${esc(confidenceLabel(locale, c.confidence))}</span></td>
            </tr></table>
            ${c.rationale ? `<p style="margin:7px 0 0 0;font-family:${tokens.fonts.body};font-size:12.5px;line-height:1.45;color:${tokens.colors.bodySlate};"><strong style="color:${tokens.colors.teal500};">${esc(copy.rationale)}:</strong> ${esc(c.rationale)}</p>` : ''}
            ${c.distinguishing_factors ? `<p style="margin:4px 0 0 0;font-family:${tokens.fonts.body};font-size:12.5px;line-height:1.45;color:${tokens.colors.bodySlate};"><strong style="color:${tokens.colors.teal500};">${esc(copy.distinguishing)}:</strong> ${esc(c.distinguishing_factors)}</p>` : ''}
          </td></tr>
        </table>
      </td></tr>`;
    })
    .join('');

  const considerationsBlock = card.considerations.length
    ? `<p style="margin:18px 0 9px 0;font-family:${tokens.fonts.body};font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.14em;color:${tokens.colors.archivalGrey};">${esc(copy.considerations)}</p>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${considerations}</table>`
    : '';

  const redFlagsBlock = card.red_flags.length
    ? `<p style="margin:16px 0 7px 0;font-family:${tokens.fonts.body};font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.14em;color:#b83d3d;">${esc(copy.redFlags)}</p>
       <ul style="margin:0;padding-left:18px;">${card.red_flags
         .map(
           (f) =>
             `<li style="font-family:${tokens.fonts.body};font-size:12.5px;line-height:1.5;color:#9a3636;">${esc(f)}</li>`,
         )
         .join('')}</ul>`
    : '';

  const disclaimerBlock = card.disclaimer
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;background:${tokens.colors.linen};border-radius:12px;">
        <tr><td style="padding:12px 14px;font-family:${tokens.fonts.body};font-size:11px;line-height:1.5;color:${tokens.colors.bodySlate};white-space:pre-wrap;">${esc(card.disclaimer)}</td></tr>
      </table>`
    : '';

  const body = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td align="center" style="padding:8px 16px 32px 16px;">
      <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
        <tr><td class="email-pad" style="padding:8px 8px 0 8px;">
          ${heading}
          ${metaLine}
          ${phi}
          ${considerationsBlock}
          ${redFlagsBlock}
          ${disclaimerBlock}
        </td></tr>
      </table>
    </td></tr>
  </table>`;

  return (
    emailShellOpen({ variant: 'navy', locale, wordmark: 'practikah', eyebrow: copy.title }) +
    body +
    emailShellClose({ locale })
  );
}
