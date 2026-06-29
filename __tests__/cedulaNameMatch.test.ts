/**
 * Tests for the cédula verification name matcher (Cédula Verification Cockpit).
 *
 * Compares the name on the official SEP "Constancia de Situación Profesional"
 * against the doctor's Medikah profile name and returns a human-reviewable
 * verdict. Pure function — no network, no mocks. Must tolerate Mexican name
 * realities: accents, case, paterno/materno ordering, and an omitted segundo
 * apellido, while still flagging a genuinely different surname.
 */

import { describe, it, expect } from 'vitest';
import { matchCedulaName } from '../lib/verification/cedulaNameMatch';

describe('matchCedulaName', () => {
  it('treats accent/case/word-order differences as a full match', () => {
    const r = matchCedulaName('AGUIRRE RODRÍGUEZ JOSÉ LUIS', 'Jose Luis Aguirre Rodriguez');
    expect(r.verdict).toBe('match');
    expect(r.score).toBeGreaterThanOrEqual(0.99);
  });

  it('matches when the profile omits the segundo apellido (subset of official)', () => {
    // Profile: "Jose Luis Aguirre" — official adds the materno "Rodriguez".
    const r = matchCedulaName('Jose Luis Aguirre Rodriguez', 'Jose Luis Aguirre');
    expect(r.verdict).toBe('match');
  });

  it('flags a different surname as partial (needs human review)', () => {
    const r = matchCedulaName('Jose Luis Martinez', 'Jose Luis Aguirre');
    expect(r.verdict).toBe('partial');
  });

  it('returns mismatch for a clearly different person', () => {
    const r = matchCedulaName('Maria Fernanda Garcia Soto', 'Jose Luis Aguirre');
    expect(r.verdict).toBe('mismatch');
  });

  it('returns mismatch (score 0) for empty/garbage input', () => {
    expect(matchCedulaName('', 'Jose Luis Aguirre').verdict).toBe('mismatch');
    expect(matchCedulaName('Jose Luis Aguirre', '').score).toBe(0);
  });

  it('does not call a single shared first name a match', () => {
    // Only "Jose" in common — coverage looks high but it is one weak token.
    const r = matchCedulaName('Jose Garcia', 'Jose Hernandez');
    expect(r.verdict).not.toBe('match');
  });
});
