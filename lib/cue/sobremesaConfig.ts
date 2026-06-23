/**
 * lib/cue/sobremesaConfig.ts — Sobremesa VAD tuning constants (VOICE-05).
 *
 * VERBATIM PORT of the BeNeXT/hector-ecosystem source
 * (apps/benext/src/lib/cue/voice/sobremesa-config.ts), chosen by Hector for
 * exact parity (2026-06-23). These are NOT call-center defaults. Cue's
 * personality requires pauses to breathe — after a Spanish lunch (sobremesa),
 * conversation trails and resumes without pressure. That deliberately-slowed
 * cadence is a clinical brand differentiator: DO NOT re-tune these to be
 * snappier. Edit these constants rather than call-sites.
 */

export interface SobremesaVADConfig {
  /** Silero aggressiveness — 2 for sobremesa (default is 3 / call-center) */
  positiveSpeechThreshold: number;
  /** Hysteresis lower bound below which we consider speech over */
  negativeSpeechThreshold: number;
  /** Minimum frames of speech before we commit to "user is talking" (400ms @ frame=96ms ≈ 4 frames) */
  minSpeechFrames: number;
  /** Silence frames required before end-of-speech fires (600ms ≈ 6 frames at ~96ms) */
  redemptionFrames: number;
  /** Frames of audio prepended to each utterance for preroll context */
  preSpeechPadFrames: number;
  /** Minimum duration a detected interruption must last before we cut TTS (ms).
   *  Prevents coughs / "mm-hmm" backchannel from killing Cue mid-sentence. */
  minInterruptionMs: number;
  /** Silence budget mid-thought before Cue emits a minimal acknowledgment (ms).
   *  Spec target: up to 4s. */
  sobremesaSilenceMs: number;
}

export const SOBREMESA_DEFAULT: SobremesaVADConfig = {
  // Silero defaults are 0.5 / 0.35. We raise the positive threshold slightly
  // so quiet ambient room-tone doesn't register as speech, and lower the
  // negative threshold so natural trails aren't cut off.
  positiveSpeechThreshold: 0.6,
  negativeSpeechThreshold: 0.3,

  // @ricky0123/vad-web uses ~96ms frames. 4 frames ≈ 384ms — near the 400ms
  // minimum speech spec. Rounded up to 5 to avoid single-syllable noise.
  minSpeechFrames: 5,

  // 600ms end-of-speech delay. At ~96ms per frame, 6 frames ≈ 576ms. We use
  // 7 (≈672ms) to err toward *longer* pauses tolerated, matching sobremesa.
  redemptionFrames: 7,

  // One frame of preroll keeps the first phoneme from being clipped.
  preSpeechPadFrames: 1,

  // 300ms (≈3 frames) — a cough or "mm" stays under this.
  minInterruptionMs: 300,

  // 4s — spec §3. Beyond this, Cue may offer a minimal "keep going".
  sobremesaSilenceMs: 4000,
};

/* -------------------------------------------------------------------------- *
 * Author-preference overrides
 *
 * Only four VAD-tuning keys are author-overridable at runtime. The remaining
 * three (preSpeechPadFrames, minInterruptionMs, sobremesaSilenceMs) are
 * product-level knobs and stay fixed in SOBREMESA_DEFAULT.
 *
 * Overrides are read from localStorage['cue.voice.vadOverrides'] as JSON.
 * Any failure (missing key, malformed JSON, non-object, wrong type, out of
 * range) silently falls back to the default — no throw, no user-visible error.
 * -------------------------------------------------------------------------- */

export type VadOverridableKey =
  | 'positiveSpeechThreshold'
  | 'negativeSpeechThreshold'
  | 'minSpeechFrames'
  | 'redemptionFrames';

export type VadOverrides = Partial<Pick<SobremesaVADConfig, VadOverridableKey>>;

export const VAD_OVERRIDES_STORAGE_KEY = 'cue.voice.vadOverrides';

const VAD_OVERRIDABLE_KEYS: readonly VadOverridableKey[] = [
  'positiveSpeechThreshold',
  'negativeSpeechThreshold',
  'minSpeechFrames',
  'redemptionFrames',
];

const VALIDATORS: Record<VadOverridableKey, (n: number) => boolean> = {
  positiveSpeechThreshold: (n) => n >= 0 && n <= 1,
  negativeSpeechThreshold: (n) => n >= 0 && n <= 1,
  minSpeechFrames: (n) => Number.isInteger(n) && n > 0 && n <= 100,
  redemptionFrames: (n) => Number.isInteger(n) && n > 0 && n <= 100,
};

/**
 * Read + sanitize VAD overrides from localStorage.
 *
 * Returns {} on any failure: missing localStorage, missing key, malformed
 * JSON, non-object JSON, invalid types, out-of-range numbers.
 */
export function loadVadOverrides(): VadOverrides {
  try {
    if (typeof globalThis === 'undefined') return {};
    const ls = (globalThis as { localStorage?: Storage }).localStorage;
    if (!ls || typeof ls.getItem !== 'function') return {};

    const raw = ls.getItem(VAD_OVERRIDES_STORAGE_KEY);
    if (raw == null) return {};

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return {};
    }

    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    const obj = parsed as Record<string, unknown>;
    const out: VadOverrides = {};
    for (const key of VAD_OVERRIDABLE_KEYS) {
      const v = obj[key];
      if (typeof v !== 'number') continue;
      if (!Number.isFinite(v)) continue;
      if (!VALIDATORS[key](v)) continue;
      out[key] = v;
    }
    return out;
  } catch {
    // Defense-in-depth — any unexpected throw falls back to default.
    return {};
  }
}

/**
 * Return a new SobremesaVADConfig with whitelisted override keys applied on
 * top of `base`. Does not mutate `base`. Non-overridable keys always come
 * from `base`, even if a caller sneaks them into `overrides` at runtime.
 */
export function mergeVadConfig(
  base: SobremesaVADConfig,
  overrides: VadOverrides,
): SobremesaVADConfig {
  const out: SobremesaVADConfig = { ...base };
  for (const key of VAD_OVERRIDABLE_KEYS) {
    const v = overrides[key];
    if (typeof v === 'number' && Number.isFinite(v)) {
      out[key] = v;
    }
  }
  return out;
}
