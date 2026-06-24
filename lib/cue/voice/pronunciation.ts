/**
 * Voxtral pronunciation respellings — Phase 49 post-fix.
 *
 * Voxtral synthesizes from raw text and gets a few brand-specific words
 * wrong. This module applies locale-aware text substitutions BEFORE the
 * audio synthesis call, so the on-screen transcript stays unchanged but
 * the audio reads correctly.
 *
 * Known mispronunciations (operator-observed 2026-05-21):
 *   - "Cue" → pronounced as the letter Q. Should rhyme with "few".
 *     EN: respell as "Kew". ES: substitute the official Spanish name
 *     "Clave" (per the ecosystem naming: Cue (EN) / Clave (ES)).
 *   - "BeNeXT" → pronounced with hard "X" + "BEE-net" cadence. Should
 *     be "bee-NEXT". Respell with a space so Voxtral parses two beats.
 *
 * Tests live at lib/cue/voice/pronunciation.test.ts. Keep this list curated —
 * every entry must be a brand or proper noun Voxtral demonstrably gets
 * wrong, not stylistic preference.
 */

interface Substitution {
  pattern: RegExp
  enReplacement: string
  esReplacement: string
}

const SUBSTITUTIONS: Substitution[] = [
  // BeNeXT Global is the longer form; substitute it before the bare BeNeXT
  // so the "Global" stays attached. Operator note 2026-05-21: BeNeXT keeps
  // its English-style "Bee Next" pronunciation in Spanish too — only the
  // surrounding word "Global" shifts to its Spanish reading, which Voxtral's
  // Spanish clone handles naturally without a respelling.
  {
    pattern: /\bBeNeXT Global\b/g,
    enReplacement: 'Bee Next Global',
    esReplacement: 'Bee Next Global',
  },
  {
    pattern: /\bBeNeXT\b/g,
    enReplacement: 'Bee Next',
    esReplacement: 'Bee Next',
  },
  // "Cue" — only match whole-word, case-insensitively, so "cued",
  // "queue" etc. are not touched. (Word boundary handles case-sensitive;
  // we add the explicit forms to cover the rare lowercase write.)
  {
    pattern: /\bCue\b/g,
    enReplacement: 'Kew',
    esReplacement: 'Clave',
  },
  {
    pattern: /\bcue\b/g,
    enReplacement: 'Kew',
    esReplacement: 'Clave',
  },
]

export function applyTtsPronunciation(text: string, locale: 'en' | 'es'): string {
  if (!text) return text
  let out = text
  for (const sub of SUBSTITUTIONS) {
    const replacement = locale === 'es' ? sub.esReplacement : sub.enReplacement
    out = out.replace(sub.pattern, replacement)
  }
  return out
}
