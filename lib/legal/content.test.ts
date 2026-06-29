import { describe, expect, it } from 'vitest';
import type { LegalBlock } from './blocks';
import { TERMS_CONTENT } from './termsContent';
import { PRIVACY_NOTICE } from './privacyContent';

/** Flatten a document's blocks to one searchable string. */
function flat(blocks: LegalBlock[]): string {
  const out: string[] = [];
  const walk = (b: any) => {
    if (typeof b?.t === 'string') out.push(b.t);
    if (Array.isArray(b?.items)) out.push(...b.items);
    if (Array.isArray(b?.titles)) out.push(...b.titles);
    if (Array.isArray(b?.blocks)) b.blocks.forEach(walk);
    if (Array.isArray(b?.rows)) b.rows.forEach((row: string[][]) => row.forEach((cell) => out.push(...cell)));
  };
  blocks.forEach(walk);
  return out.join('\n');
}

const ALL = [
  TERMS_CONTENT.US.en, TERMS_CONTENT.US.es,
  TERMS_CONTENT.MX.en, TERMS_CONTENT.MX.es,
  PRIVACY_NOTICE,
];

describe('legal content — structure', () => {
  it('exposes all four region/locale Terms variants, non-empty', () => {
    for (const region of ['US', 'MX'] as const) {
      for (const locale of ['en', 'es'] as const) {
        expect(TERMS_CONTENT[region][locale].length).toBeGreaterThan(20);
      }
    }
  });

  it('each document leads with a MEDIKAH masthead title', () => {
    for (const doc of ALL) {
      expect(doc[0].k).toBe('title');
      expect((doc[0] as any).t).toMatch(/MEDIKAH/i);
    }
  });

  it('fills counsel\'s [platform URL] placeholders with the live URLs', () => {
    for (const doc of ALL) {
      expect(flat(doc)).not.toContain('[platform URL');
    }
    expect(flat(TERMS_CONTENT.US.en)).toContain('https://medikah.health/es/terms');
    expect(flat(TERMS_CONTENT.MX.en)).toContain('https://medikah.health/es/terms');
  });

  it('contains no empty text blocks (fidelity sanity)', () => {
    for (const doc of ALL) {
      for (const b of doc) {
        if ('t' in b) expect(b.t.trim().length).toBeGreaterThan(0);
        if (b.k === 'ul') for (const i of b.items) expect(i.trim().length).toBeGreaterThan(0);
      }
    }
  });
});

describe('legal content — binding framework present (region-correct)', () => {
  it('US Terms (en) carries the U.S. framework', () => {
    const s = flat(TERMS_CONTENT.US.en);
    expect(s).toContain('Business Associate');
    expect(s).toContain('Informational Appointment');
    expect(s).toContain('Ryan Haight');
    expect(s.toLowerCase()).toContain('arbitration');
    expect(s).toContain('Delaware');
  });

  it('US Terms (es) is the Spanish U.S. courtesy version', () => {
    const s = flat(TERMS_CONTENT.US.es);
    expect(s).toContain('Estados Unidos');
    expect(s.toLowerCase()).toContain('arbitraje');
    expect(s).toContain('Delaware');
  });

  it('MX Terms (en) carries the Mexican framework', () => {
    const s = flat(TERMS_CONTENT.MX.en);
    expect(s).toContain('LFPDPPP');
    expect(s).toContain('PROFECO');
    expect(s).toContain('LFPC');
    expect(s.toLowerCase()).toContain('cédula');
  });

  it('MX Terms (es) carries the Mexican framework in Spanish', () => {
    const s = flat(TERMS_CONTENT.MX.es);
    expect(s).toContain('LFPDPPP');
    expect(s).toContain('PROFECO');
    expect(s).toContain('datos sensibles');
    expect(s).toContain('cédula profesional');
  });

  it('Privacy Notice is one jurisdiction-complete bilingual document', () => {
    const s = flat(PRIVACY_NOTICE);
    expect(s).toContain('Business Associate');
    expect(s).toContain('HIPAA');
    expect(s).toContain('LFPDPPP');
    expect(s).toContain('CCPA');
    // both annexes + the conflict clause
    expect(s).toMatch(/ANEXO A/);
    expect(s).toMatch(/ANNEX B/);
    expect(s).toContain('the Annex governs for the applicable jurisdiction');
  });
});
