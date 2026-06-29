import { describe, it, expect } from 'vitest';
import { buildProposalLine } from './proposalLine';

describe('buildProposalLine', () => {
  // Founder feedback 2026-06-28: speaking the raw ISO date/time + event title aloud
  // sounded robotic. The card on screen already shows every detail, so the spoken
  // line is a short, natural pointer to that card — never narrating the payload.
  it('EN block: points to the card, does not narrate details', () => {
    expect(
      buildProposalLine({ action: 'block', summary: '2026-06-29 08:15–11:00 "Soft lunch"' }, 'en'),
    ).toBe('Check the card on your screen to approve the block.');
  });

  it('EN clear', () => {
    expect(buildProposalLine({ action: 'clear', summary: '9–5' }, 'en')).toBe(
      'Check the card on your screen to approve the change.',
    );
  });

  it('ES block', () => {
    expect(buildProposalLine({ action: 'block', summary: 'las 2 a 3 PM' }, 'es')).toBe(
      'Revisa la tarjeta en tu pantalla para aprobar el bloque.',
    );
  });

  it('ES clear', () => {
    expect(buildProposalLine({ action: 'clear', summary: 'x' }, 'es')).toBe(
      'Revisa la tarjeta en tu pantalla para aprobar el cambio.',
    );
  });

  it('never narrates the structured payload + never past-tense; always points to the card', () => {
    const lines = [
      buildProposalLine({ action: 'block', summary: '2026-06-29 08:15 ROBOT' }, 'en'),
      buildProposalLine({ action: 'clear', summary: '2026-06-29 ROBOT' }, 'en'),
      buildProposalLine({ action: 'block', summary: '2026-06-29 ROBOT' }, 'es'),
      buildProposalLine({ action: 'clear', summary: '2026-06-29 ROBOT' }, 'es'),
    ];
    for (const l of lines) {
      expect(l).not.toMatch(/2026|ROBOT|\d{2}:\d{2}/); // raw payload is never spoken
      expect(l.toLowerCase()).not.toMatch(/\bdone\b|\bblocked\b|\bcleared\b|listo|bloqueado|liberado/);
      expect(l.toLowerCase()).toMatch(/card|tarjeta|pantalla|screen/); // points to the card
    }
  });
});
