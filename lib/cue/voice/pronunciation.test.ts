import { describe, it, expect } from 'vitest';
import { applyTtsPronunciation } from './pronunciation';

describe('applyTtsPronunciation', () => {
  it('respells "Cue" as "Kew" in English', () => {
    expect(applyTtsPronunciation('Hi, I am Cue.', 'en')).toBe('Hi, I am Kew.');
  });
  it('substitutes "Cue" with "Clave" in Spanish', () => {
    expect(applyTtsPronunciation('Hola, soy Cue.', 'es')).toBe('Hola, soy Clave.');
  });
  it('respells BeNeXT as "Bee Next" in both locales', () => {
    expect(applyTtsPronunciation('BeNeXT', 'en')).toBe('Bee Next');
    expect(applyTtsPronunciation('BeNeXT', 'es')).toBe('Bee Next');
  });
  it('leaves unrelated words untouched', () => {
    expect(applyTtsPronunciation('queue cued', 'en')).toBe('queue cued');
  });
});
