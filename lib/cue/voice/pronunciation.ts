/**
 * Voxtral pronunciation respellings.
 *
 * Voxtral synthesizes from raw text. This module applies locale-aware text
 * substitutions BEFORE the audio synthesis call, so the on-screen transcript
 * stays unchanged but the audio reads correctly.
 *
 * The brand name "Cue" is intentionally NOT respelled: it is always sent to the
 * synthesizer verbatim as "Cue" (English or Spanish) and pronounced the English
 * way (/kjuː/, rhymes with "few"). If a voice mispronounces it (e.g. as the
 * letter "Q"), fix that via voice/phoneme configuration — never by respelling.
 *
 * The list is intentionally EMPTY. Other-pillar brand names (e.g. BeNeXT, where
 * this Cue stack was ported from) never appear in Medikah Cue's output — the
 * backend brand-bleed gate forbids them — so there is nothing here to respell.
 * Add an entry ONLY for a name Voxtral demonstrably mispronounces AND that
 * Medikah Cue actually says. Tests: lib/cue/voice/pronunciation.test.ts.
 */

interface Substitution {
  pattern: RegExp
  enReplacement: string
  esReplacement: string
}

const SUBSTITUTIONS: Substitution[] = []

export function applyTtsPronunciation(text: string, locale: 'en' | 'es'): string {
  if (!text) return text
  let out = text
  for (const sub of SUBSTITUTIONS) {
    const replacement = locale === 'es' ? sub.esReplacement : sub.enReplacement
    out = out.replace(sub.pattern, replacement)
  }
  return out
}
