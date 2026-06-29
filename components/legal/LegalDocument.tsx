import React from 'react';
import type { LegalBlock, CalloutChild, CalloutVariant } from '../../lib/legal/blocks';

/**
 * Renders a counsel-authored legal document (Terms of Service / Privacy Notice)
 * from its typed block list (`lib/legal/*Content.ts`). Presentation only — the
 * text is a faithful, verified port of the source .docx and must not be edited
 * here. Matches the `prose-medikah` house style; callouts/tables/sections add
 * brand-aligned chrome on top.
 */

const VARIANT: Record<CalloutVariant, { ring: string; bar: string; title: string; glyph: string }> = {
  info: { ring: 'bg-clinical-teal/[0.05] border-clinical-teal/30', bar: 'bg-clinical-teal', title: 'text-clinical-teal', glyph: 'ℹ' },
  warn: { ring: 'bg-alert-garnet/[0.05] border-alert-garnet/30', bar: 'bg-alert-garnet', title: 'text-alert-garnet', glyph: '⚠' },
  legal: { ring: 'bg-caution-amber/[0.06] border-caution-amber/30', bar: 'bg-caution-amber', title: 'text-caution-amber', glyph: '§' },
};

// Linkify emails and URLs without altering the legal text (wrap only).
const TOKEN = /([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|(?:https?:\/\/|www\.)[^\s]+)/g;

function linkify(text: string): React.ReactNode {
  const parts = text.split(TOKEN);
  if (parts.length === 1) return text;
  return parts.map((part, i) => {
    if (i % 2 === 0) return <React.Fragment key={i}>{part}</React.Fragment>;
    // Split off trailing punctuation so it stays plain text, not part of the link.
    const m = part.match(/^(.*?)([).,;:!?]*)$/)!;
    const token = m[1];
    const trail = m[2];
    const link = token.includes('@')
      ? <a key={i} href={`mailto:${token}`}>{token}</a>
      : <a key={i} href={token.startsWith('http') ? token : `https://${token}`} target="_blank" rel="noopener noreferrer">{token}</a>;
    return <React.Fragment key={i}>{link}{trail}</React.Fragment>;
  });
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul>
      {items.map((it, i) => <li key={i}>{linkify(it)}</li>)}
    </ul>
  );
}

function CalloutBody({ blocks }: { blocks: CalloutChild[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        if (b.k === 'callout-title') return null; // rendered in header
        if (b.k === 'ul') return <Bullets key={i} items={b.items} />;
        return <p key={i} className="!text-[15px] !text-body-slate">{linkify(b.t)}</p>;
      })}
    </>
  );
}

function Callout({ variant, blocks }: { variant: CalloutVariant; blocks: CalloutChild[] }) {
  const v = VARIANT[variant];
  const title = blocks.find((b) => b.k === 'callout-title') as { t: string } | undefined;
  return (
    <div className={`relative my-6 overflow-hidden rounded-md border ${v.ring} pl-5 pr-5 py-4`}>
      <span className={`absolute left-0 top-0 bottom-0 w-1 ${v.bar}`} aria-hidden />
      {title && (
        <p className={`!mb-2 flex items-baseline gap-2 font-bold !text-[15px] ${v.title}`}>
          <span aria-hidden className="font-bold">{v.glyph}</span>
          <span>{title.t}</span>
        </p>
      )}
      <CalloutBody blocks={blocks} />
    </div>
  );
}

function DataTable({ rows }: { rows: string[][][] }) {
  if (!rows.length) return null;
  const [head, ...body] = rows;
  const cell = (lines: string[]) =>
    lines.map((l, i) => (
      <React.Fragment key={i}>
        {i > 0 && <br />}
        {linkify(l)}
      </React.Fragment>
    ));
  return (
    <div className="my-6 overflow-x-auto">
      <table className="w-full border-collapse text-[14px] text-body-slate">
        <thead>
          <tr>
            {head.map((c, i) => (
              <th key={i} className="border border-border-line/40 bg-inst-blue/[0.04] px-3 py-2 text-left font-bold text-inst-blue align-top">
                {cell(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri}>
              {row.map((c, ci) => (
                <td key={ci} className="border border-border-line/40 px-3 py-2 align-top">{cell(c)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SectionHeader({ num, titles }: { num: string; titles: string[] }) {
  return (
    <div className="mt-12 mb-5 flex items-center gap-3 border-b border-border-line/30 pb-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-clinical-teal/10 font-extrabold text-clinical-teal">
        {num}
      </span>
      <span className="font-extrabold text-[22px] leading-tight text-inst-blue">
        {titles.map((t, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="block text-[15px] font-semibold text-body-slate">{t}</span>}
            {i === 0 && t}
          </React.Fragment>
        ))}
      </span>
    </div>
  );
}

function Block({ block }: { block: LegalBlock }) {
  switch (block.k) {
    case 'title':
      return <p className="text-center font-extrabold tracking-[0.06em] text-[15px] uppercase text-inst-blue mb-1">{block.t}</p>;
    case 'subtitle':
      return <p className="text-center font-bold text-[19px] text-clinical-teal leading-snug mb-1">{block.t}</p>;
    case 'subtitle2':
      return <p className="text-center font-semibold text-[15px] text-inst-blue mb-1">{block.t}</p>;
    case 'meta':
      return <p className="text-center text-[13px] text-archival-grey mb-1">{linkify(block.t)}</p>;
    case 'section':
      return <SectionHeader num={block.num} titles={block.titles} />;
    case 'h2':
      return <h2>{block.t}</h2>;
    case 'h3':
      return <h3>{block.t}</h3>;
    case 'p':
      return <p>{linkify(block.t)}</p>;
    case 'warn':
      return <p className="text-center font-bold !text-alert-garnet">{block.t}</p>;
    case 'pwarn':
      return <p className="font-semibold !text-alert-garnet">{linkify(block.t)}</p>;
    case 'plegal':
      return <p className="font-semibold !text-caution-amber">{linkify(block.t)}</p>;
    case 'footermark':
      return <p className="text-center font-body lowercase tracking-[0.04em] text-[20px] font-medium text-inst-blue mt-10 mb-1">{block.t}</p>;
    case 'ul':
      return <Bullets items={block.items} />;
    case 'callout':
      return <Callout variant={block.variant} blocks={block.blocks} />;
    case 'table':
      return <DataTable rows={block.rows} />;
    default:
      return null;
  }
}

export default function LegalDocument({ blocks }: { blocks: LegalBlock[] }) {
  return (
    <div className="prose-medikah">
      {/* masthead */}
      <div className="mb-10">
        {blocks.slice(0, mastheadLen(blocks)).map((b, i) => <Block key={i} block={b} />)}
      </div>
      {blocks.slice(mastheadLen(blocks)).map((b, i) => <Block key={i} block={b} />)}
    </div>
  );
}

// Masthead = the leading run of title/subtitle/meta blocks.
function mastheadLen(blocks: LegalBlock[]): number {
  let n = 0;
  for (const b of blocks) {
    if (b.k === 'title' || b.k === 'subtitle' || b.k === 'subtitle2' || b.k === 'meta') n++;
    else break;
  }
  return n;
}
