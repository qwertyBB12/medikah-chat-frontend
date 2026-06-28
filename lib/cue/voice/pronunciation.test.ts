import { describe, it, expect } from 'vitest';
import { applyTtsPronunciation } from './pronunciation';

describe('applyTtsPronunciation', () => {
  it('always keeps the name spelled "Cue" — never respelled — in both locales', () => {
    // Spelling is sacrosanct: "Cue" goes to the synthesizer verbatim, EN and ES.
    expect(applyTtsPronunciation('Hi, I am Cue.', 'en')).toBe('Hi, I am Cue.');
    expect(applyTtsPronunciation('Hola, soy Cue.', 'es')).toBe('Hola, soy Cue.');
  });
  it('does not touch other-pillar brand names (BeNeXT never appears in Medikah Cue)', () => {
    expect(applyTtsPronunciation('BeNeXT', 'en')).toBe('BeNeXT');
    expect(applyTtsPronunciation('BeNeXT', 'es')).toBe('BeNeXT');
  });
  it('leaves unrelated words untouched', () => {
    expect(applyTtsPronunciation('queue cued', 'en')).toBe('queue cued');
  });
});
