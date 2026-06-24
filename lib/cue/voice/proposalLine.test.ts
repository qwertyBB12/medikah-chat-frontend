import { describe, it, expect } from 'vitest';
import { buildProposalLine } from './proposalLine';

describe('buildProposalLine', () => {
  it('EN block: interrogative + CTA, uses the structured summary', () => {
    expect(buildProposalLine({ action: 'block', summary: '2–3 PM' }, 'en')).toBe(
      'Block 2–3 PM? Confirm below.',
    );
  });

  it('EN clear', () => {
    expect(buildProposalLine({ action: 'clear', summary: '9–5' }, 'en')).toBe(
      'Clear 9–5? Confirm below.',
    );
  });

  it('ES block', () => {
    expect(buildProposalLine({ action: 'block', summary: 'las 2 a 3 PM' }, 'es')).toBe(
      '¿Bloqueo las 2 a 3 PM? Confírmalo abajo.',
    );
  });

  it('is always interrogative + never past-tense (no "done"/"blocked"/"listo")', () => {
    const lines = [
      buildProposalLine({ action: 'block', summary: 'x' }, 'en'),
      buildProposalLine({ action: 'clear', summary: 'x' }, 'en'),
      buildProposalLine({ action: 'block', summary: 'x' }, 'es'),
      buildProposalLine({ action: 'clear', summary: 'x' }, 'es'),
    ];
    for (const l of lines) {
      expect(l).toMatch(/\?/); // it asks
      expect(l.toLowerCase()).not.toMatch(/\bdone\b|\bblocked\b|\bcleared\b|listo|bloqueado|liberado/);
    }
  });

  it('falls back to a generic question when no summary is present', () => {
    expect(buildProposalLine({ action: 'block' }, 'en')).toBe('Block this time? Confirm below.');
    expect(buildProposalLine({ action: 'clear' }, 'es')).toBe(
      '¿Libero los bloques de Cue? Confírmalo abajo.',
    );
  });
});
