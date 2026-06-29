/**
 * Typed content model for Medikah's counsel-authored legal documents
 * (Terms of Service, Privacy Notice). Documents are stored as an ordered list
 * of typed blocks, faithfully derived from the source .docx (see
 * `termsContent.ts` / `privacyContent.ts` provenance headers), and rendered by
 * `components/legal/LegalDocument.tsx`.
 *
 * Roles mirror the structure of the source documents:
 *   title/subtitle/subtitle2/meta  — document masthead
 *   section                        — numbered bilingual section header (Privacy Notice)
 *   h2/h3                          — section / subsection heading
 *   p                              — body paragraph
 *   warn                           — centered red emphasis line (e.g. final "DO NOT USE…")
 *   pwarn/plegal                   — red / amber emphasis paragraph
 *   ul                             — bullet list
 *   callout {info|warn|legal}      — boxed callout (ℹ info / ⚠ warning / § legal reservation)
 *   table                          — data table; cell = array of lines (bilingual EN/ES)
 *   footermark                     — trailing "medikah" wordmark
 */

export type CalloutVariant = 'info' | 'warn' | 'legal';

export type CalloutChild =
  | { k: 'callout-title'; t: string }
  | { k: 'p'; t: string }
  | { k: 'ul'; items: string[] };

/** A table cell is an array of lines (usually one; bilingual headers have two). */
export type LegalTableCell = string[];

export type LegalBlock =
  | { k: 'title'; t: string }
  | { k: 'subtitle'; t: string }
  | { k: 'subtitle2'; t: string }
  | { k: 'meta'; t: string }
  | { k: 'section'; num: string; titles: string[] }
  | { k: 'h2'; t: string }
  | { k: 'h3'; t: string }
  | { k: 'p'; t: string }
  | { k: 'warn'; t: string }
  | { k: 'pwarn'; t: string }
  | { k: 'plegal'; t: string }
  | { k: 'footermark'; t: string }
  | { k: 'ul'; items: string[] }
  | { k: 'callout'; variant: CalloutVariant; blocks: CalloutChild[] }
  | { k: 'table'; rows: LegalTableCell[][] };
